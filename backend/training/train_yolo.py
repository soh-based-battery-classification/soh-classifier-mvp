#!/usr/bin/env python3
"""YOLOv8 부품탐지 전이학습 스크립트 — v1 프로토타입, 지금은 안 씀.

145장/7클래스(Screw, Nut, Bolt, Cable, Aluminum-frame, Battery Module,
Bus-bar)짜리 작은 데이터셋이라 scratch 학습 대신 사전학습 체크포인트 기반
전이학습을 썼다. CPU 추론이 전제라(architecture 문서 5-1장 비용 최적화 방향)
제일 가벼운 yolov8n 체크포인트를 기본값으로 씀.

주의: 지금 서비스에 붙어있는 가중치(yolo_model_meta.json의
yolov8n_ev_battery_defect_v5_noleak, swelling/leak/corrosion 3클래스)는 이
스크립트로 학습한 게 아니라 다른 파이프라인(synthetic 데이터 증강 포함, 이
저장소엔 없음)에서 나온 거다. 이 스크립트는 최초 프로토타입이었던 부품탐지(v1)
모델 학습용이라 지금은 안 돌린다 — 기록으로만 남겨둠.

실행 전: `python -m training.download_vision_dataset`로 데이터셋을 먼저 받아야 한다.

실행 (backend/ 디렉터리에서):

    python -m training.train_yolo
"""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from training.download_vision_dataset import TARGET_DIR as DATASET_DIR  # noqa: E402

MODEL_VERSION = "yolov8n_ev_battery_pack_v1"
PRETRAINED_CHECKPOINT = "yolov8n.pt"
EPOCHS = 100
IMG_SIZE = 640
BATCH_SIZE = 8
SEED = 42

DATASET_YAML = DATASET_DIR / "data.yaml"
OUT_DIR = Path(__file__).resolve().parent / "outputs" / "vision" / MODEL_VERSION
WEIGHTS_DIR = BACKEND_ROOT / "app" / "ml" / "weights"


def main() -> None:
    if not DATASET_YAML.exists():
        raise FileNotFoundError(
            f"{DATASET_YAML} 없음. 먼저 `python -m training.download_vision_dataset`을 실행하세요."
        )

    from ultralytics import YOLO

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)

    print(f"[1/3] 사전학습 체크포인트 로드: {PRETRAINED_CHECKPOINT}")
    model = YOLO(PRETRAINED_CHECKPOINT)

    print(f"[2/3] 전이학습: data={DATASET_YAML}, epochs={EPOCHS}, imgsz={IMG_SIZE}")
    results = model.train(
        data=str(DATASET_YAML),
        epochs=EPOCHS,
        imgsz=IMG_SIZE,
        batch=BATCH_SIZE,
        seed=SEED,
        project=str(OUT_DIR.parent),
        name=OUT_DIR.name,
        exist_ok=True,
    )
    # ultralytics는 학습 종료 시 best.pt 기준으로 val 셋을 자동 재평가하므로
    # model.val()을 별도로 호출하지 않아도 results.box에서 지표를 바로 읽을 수 있다.
    # (설치된 ultralytics 버전에 따라 API가 다르면 model.val()로 대체할 것.)
    metrics_summary = {
        "map50": float(results.box.map50),
        "map50_95": float(results.box.map),
        "precision": float(results.box.mp),
        "recall": float(results.box.mr),
    }
    print("      val 지표:", metrics_summary)

    print("[3/3] metrics.json 저장 + 서비스용 가중치 배포")
    with open(OUT_DIR / "metrics.json", "w", encoding="utf-8") as f:
        json.dump(metrics_summary, f, ensure_ascii=False, indent=2)

    best_pt = OUT_DIR / "weights" / "best.pt"
    shutil.copy2(best_pt, WEIGHTS_DIR / "yolo_best.pt")

    meta = {
        "model_version": MODEL_VERSION,
        "base_checkpoint": PRETRAINED_CHECKPOINT,
        "img_size": IMG_SIZE,
        "class_names": model.names,
        "epochs": EPOCHS,
        "val_metrics": metrics_summary,
    }
    with open(WEIGHTS_DIR / "yolo_model_meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    print(f"완료. 결과: {OUT_DIR}")
    print(f"서비스용 가중치 배포: {WEIGHTS_DIR / 'yolo_best.pt'}")


if __name__ == "__main__":
    main()
