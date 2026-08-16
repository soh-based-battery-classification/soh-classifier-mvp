#!/usr/bin/env python3
"""NLinear SOH 예측 모델 학습 스크립트.

- Train: B0005, B0006, B0007 (세 배터리의 discharge 사이클을 모두 학습에 사용,
  각 배터리 뒷부분 15%는 조기 종료용 validation으로 분리)
- Test: B0018 (학습에 전혀 쓰지 않은 셀 전체 사이클 -> 셀 간 일반화 성능 확인)

실행 (backend/ 디렉터리에서):

    python -m training.train_nlinear
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import torch
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score
from torch.utils.data import DataLoader

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.grading import DEFAULT_THRESHOLDS, EOL_GRADE, soh_to_grade  # noqa: E402
from app.ml.nlinear import NLinear, NLinearConfig  # noqa: E402
from training.build_dataset import build_soh_dataframe  # noqa: E402
from training.mat_loader import load_battery_mat  # noqa: E402
from training.windowing import build_test_windows, build_train_val_windows  # noqa: E402

TRAIN_BATTERIES = ["B0005", "B0006", "B0007"]
TEST_BATTERY = "B0018"
RATED_CAPACITY = 2.0  # NASA PCoE B0005/B0006/B0007/B0018 공통 정격 용량(Ah)

SEQ_LEN = 16
PRED_LEN = 1
VAL_RATIO = 0.15
BATCH_SIZE = 16
EPOCHS = 300
LR = 0.005
PATIENCE = 25
SEED = 42
MODEL_VERSION = "nlinear_b5b6b7_test_b18_v1"

DATA_DIR = Path(__file__).resolve().parent / "data" / "raw"
OUT_DIR = Path(__file__).resolve().parent / "outputs" / MODEL_VERSION
WEIGHTS_DIR = BACKEND_ROOT / "app" / "ml" / "weights"


def set_seed(seed: int) -> None:
    import random

    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)


def load_soh_series(battery_id: str) -> np.ndarray:
    cycles = load_battery_mat(DATA_DIR / f"{battery_id}.mat", battery_id=battery_id)
    df = build_soh_dataframe(cycles, rated_capacity=RATED_CAPACITY)
    return df["soh"].values.astype(np.float32)


def run_epoch(model, loader, loss_fn, optimizer=None) -> float:
    is_train = optimizer is not None
    model.train(is_train)
    total_loss, total_count = 0.0, 0
    with torch.set_grad_enabled(is_train):
        for x, y in loader:
            pred = model(x)
            loss = loss_fn(pred, y)
            if is_train:
                optimizer.zero_grad()
                loss.backward()
                optimizer.step()
            total_loss += loss.item() * x.size(0)
            total_count += x.size(0)
    return total_loss / max(total_count, 1)


def main() -> None:
    set_seed(SEED)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)

    print(f"[1/6] .mat 로드: train={TRAIN_BATTERIES}, test={TEST_BATTERY}")
    train_series = {b: load_soh_series(b) for b in TRAIN_BATTERIES}
    test_series = load_soh_series(TEST_BATTERY)
    for b, s in {**train_series, TEST_BATTERY: test_series}.items():
        print(f"      {b}: {len(s)}개 discharge 사이클")

    print("[2/6] train/val/test 윈도우 생성")
    train_ds, val_ds, scaler = build_train_val_windows(
        train_series, seq_len=SEQ_LEN, pred_len=PRED_LEN, val_ratio=VAL_RATIO
    )
    test_ds = build_test_windows(test_series, seq_len=SEQ_LEN, pred_len=PRED_LEN, scaler=scaler)
    print(
        f"      windows: train={len(train_ds)} val={len(val_ds)} test={len(test_ds)} "
        f"(scaler min={scaler.min_:.3f}, max={scaler.max_:.3f})"
    )

    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False)
    test_loader = DataLoader(test_ds, batch_size=BATCH_SIZE, shuffle=False)

    print("[3/6] NLinear 모델 생성 및 학습")
    model = NLinear(NLinearConfig(seq_len=SEQ_LEN, pred_len=PRED_LEN, individual=False, enc_in=1))
    n_params = sum(p.numel() for p in model.parameters())
    print(f"      파라미터 수: {n_params}")

    optimizer = torch.optim.Adam(model.parameters(), lr=LR)
    loss_fn = torch.nn.MSELoss()

    best_val_loss = float("inf")
    best_state = None
    best_epoch = -1
    epochs_without_improve = 0
    train_losses, val_losses = [], []

    for epoch in range(1, EPOCHS + 1):
        train_loss = run_epoch(model, train_loader, loss_fn, optimizer)
        val_loss = run_epoch(model, val_loader, loss_fn, optimizer=None)
        train_losses.append(train_loss)
        val_losses.append(val_loss)

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_state = {k: v.clone() for k, v in model.state_dict().items()}
            best_epoch = epoch
            epochs_without_improve = 0
        else:
            epochs_without_improve += 1

        if epochs_without_improve >= PATIENCE:
            break

    model.load_state_dict(best_state)
    print(f"      학습 종료: {len(train_losses)} epoch, best_epoch={best_epoch}, best_val_loss={best_val_loss:.6f}")

    print("[4/6] 테스트셋(B0018) 평가")
    model.eval()
    all_true, all_pred = [], []
    with torch.no_grad():
        for x, y in test_loader:
            pred = model(x).numpy()
            all_pred.append(pred)
            all_true.append(y.numpy())
    y_true_norm = np.concatenate(all_true, axis=0)[:, :, 0]
    y_pred_norm = np.concatenate(all_pred, axis=0)[:, :, 0]
    y_true = scaler.inverse_transform(y_true_norm)
    y_pred = scaler.inverse_transform(y_pred_norm)

    error = y_pred - y_true
    reg_metrics = {
        "mse": float(np.mean(error**2)),
        "rmse": float(np.sqrt(np.mean(error**2))),
        "mae": float(np.mean(np.abs(error))),
        "mape": float(np.mean(np.abs(error / y_true))) * 100.0,
    }

    labels = [g for g, _ in sorted(DEFAULT_THRESHOLDS.items(), key=lambda kv: kv[1], reverse=True)] + [EOL_GRADE]
    true_grades = np.array([soh_to_grade(v) for v in y_true[:, 0]])
    pred_grades = np.array([soh_to_grade(v) for v in y_pred[:, 0]])
    cls_metrics = {
        "accuracy": float(accuracy_score(true_grades, pred_grades)),
        "macro_f1": float(f1_score(true_grades, pred_grades, labels=labels, average="macro", zero_division=0)),
        "labels": labels,
        "confusion_matrix": confusion_matrix(true_grades, pred_grades, labels=labels).tolist(),
    }
    print("      회귀 지표:", reg_metrics)
    print("      분류 지표:", {k: v for k, v in cls_metrics.items() if k != "confusion_matrix"})

    print("[5/6] 결과 저장")
    metrics_path = OUT_DIR / "metrics.json"
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "regression": reg_metrics,
                "classification": cls_metrics,
                "best_epoch": best_epoch,
                "n_train_windows": len(train_ds),
                "n_val_windows": len(val_ds),
                "n_test_windows": len(test_ds),
                "train_batteries": TRAIN_BATTERIES,
                "test_battery": TEST_BATTERY,
            },
            f,
            ensure_ascii=False,
            indent=2,
        )

    torch.save(model.state_dict(), OUT_DIR / "model.pt")

    meta = {
        "seq_len": SEQ_LEN,
        "pred_len": PRED_LEN,
        "individual": False,
        "enc_in": 1,
        "scaler_min": scaler.min_,
        "scaler_max": scaler.max_,
        "model_version": MODEL_VERSION,
        "train_batteries": TRAIN_BATTERIES,
        "test_battery": TEST_BATTERY,
        "test_metrics": {"regression": reg_metrics, "classification_accuracy": cls_metrics["accuracy"]},
    }
    with open(OUT_DIR / "model_meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    _plot_forecast(test_series, y_true, y_pred, OUT_DIR / "forecast_b0018.png")
    _plot_loss_curve(train_losses, val_losses, best_epoch, OUT_DIR / "loss_curve.png")

    # 서비스가 실제로 읽는 위치(backend/app/ml/weights/)에도 배포
    torch.save(model.state_dict(), WEIGHTS_DIR / "model.pt")
    with open(WEIGHTS_DIR / "model_meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    print(f"[6/6] 완료. 결과: {OUT_DIR}")
    print(f"       서비스용 가중치 배포: {WEIGHTS_DIR}")


def _plot_forecast(test_series, y_true, y_pred, save_path: Path) -> None:
    fig, ax = plt.subplots(figsize=(10, 5))
    ax.plot(range(1, len(test_series) + 1), test_series, label="B0018 full SOH curve", color="tab:gray", alpha=0.5)

    start_cycle = len(test_series) - len(y_true) + 1
    cycles = range(start_cycle, start_cycle + len(y_true))
    ax.plot(cycles, y_true[:, 0], label="ground truth", color="tab:blue")
    ax.plot(cycles, y_pred[:, 0], label="NLinear prediction", color="tab:red", linestyle="--")

    for grade, cutoff in sorted(DEFAULT_THRESHOLDS.items(), key=lambda kv: kv[1], reverse=True):
        ax.axhline(cutoff, color="black", linewidth=0.5, linestyle=":")
        ax.text(1, cutoff, f" grade {grade} >= {cutoff}%", fontsize=8, va="bottom")

    ax.set_xlabel("Cycle")
    ax.set_ylabel("SOH (%)")
    ax.set_title("B0018 (held-out cell): ground truth vs NLinear prediction")
    ax.legend(loc="upper right")
    fig.tight_layout()
    fig.savefig(save_path, dpi=150)
    plt.close(fig)


def _plot_loss_curve(train_losses, val_losses, best_epoch, save_path: Path) -> None:
    fig, ax = plt.subplots(figsize=(6, 4))
    ax.plot(train_losses, label="train loss")
    ax.plot(val_losses, label="val loss")
    if best_epoch > 0:
        ax.axvline(best_epoch - 1, color="black", linestyle=":", label="best epoch")
    ax.set_xlabel("Epoch")
    ax.set_ylabel("Loss")
    ax.legend()
    fig.tight_layout()
    fig.savefig(save_path, dpi=150)
    plt.close(fig)


if __name__ == "__main__":
    main()
