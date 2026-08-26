"""EV 배터리 팩 부품 탐지용 Roboflow 데이터셋 다운로드 스크립트 (v1 프로토타입, 현재 미사용).

Roboflow Universe의 공개 데이터셋(mtech-project-ohj8a/ev-battery-pack, 145장,
7클래스: Screw/Nut/Bolt/Cable/Aluminum-frame/Battery Module/Bus-bar)을
YOLOv8 포맷으로 받아온다. `train_yolo.py`가 이 스크립트의 TARGET_DIR을 그대로
import해서 쓰므로, 두 스크립트의 데이터 경로는 항상 일치한다.

주의: 현재 서비스에 배포된 결함탐지(swelling/leak/corrosion) 가중치는 이 데이터셋이
아니라 별도 synthetic 데이터 파이프라인으로 학습됐다. 이 스크립트는 최초
프로토타입이었던 부품탐지(v1) 모델용이며 지금은 쓰지 않는다 — 참고용으로만 남겨둔다.

이 데이터셋 버전(v1)은 Roboflow에 100% train으로만 게시돼 valid/test 스플릿이
없다(435장 전부 train, README.roboflow.txt에 명시). 그대로 두면 YOLO 학습이 val
셋을 찾지 못해 실패하므로, 다운로드 후 `_ensure_val_split()`이 원본 이미지 단위로
train -> valid 일부를 떼어낸다(증강 변형 3개가 파일명의 `.rf.` 앞부분을 공유 —
같은 원본의 증강 변형이 train/valid에 동시에 섞이는 데이터 누수를 막기 위해 원본
단위로 그룹핑해서 분리).

또한 원본 라벨 파일 중 상당수가 객체별로 폴리곤(세그멘테이션)과 바운딩박스 형식이
섞여 있다(같은 이미지 안에서 일부 객체는 폴리곤, 일부는 박스로 라벨링됨). ultralytics는
한 파일 안에 두 형식이 섞이면 해당 이미지 전체를 통째로 스킵해버려 145장짜리 작은
데이터셋에서 상당수(약 60%)가 유실된다. `_normalize_labels_to_bbox()`가 폴리곤 행을
바운딩박스(각 폴리곤의 min/max 좌표)로 변환해 라벨 손실 없이 모든 이미지를 학습에
활용할 수 있게 한다.

실행 (backend/ 디렉터리에서):

    python -m training.download_vision_dataset

ROBOFLOW_API_KEY 필요 (backend/.env에 설정, https://app.roboflow.com/settings/api 발급).
"""

from __future__ import annotations

import os
import random
import shutil
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

ROBOFLOW_WORKSPACE = "mtech-project-ohj8a"
ROBOFLOW_PROJECT = "ev-battery-pack"
ROBOFLOW_VERSION = 1  # 실제 번호는 Roboflow 프로젝트 페이지의 "Versions" 탭에서 확인
EXPORT_FORMAT = "yolov8"

DATA_DIR = Path(__file__).resolve().parent / "data" / "raw_vision"
TARGET_DIR = DATA_DIR / f"{ROBOFLOW_PROJECT}-{ROBOFLOW_VERSION}"

VAL_RATIO = 0.2  # 원본 이미지(증강 전) 기준 비율
SPLIT_SEED = 42


def _group_key(filename: str) -> str:
    """증강 변형 3개가 공유하는 원본 이미지 식별자(`.rf.<hash>` 이전 부분)."""
    return filename.split(".rf.")[0]


def _ensure_val_split(target_dir: Path) -> None:
    valid_images_dir = target_dir / "valid" / "images"
    if valid_images_dir.exists() and any(valid_images_dir.iterdir()):
        return  # 이미 분리됨 (재실행 시 idempotent)

    train_images_dir = target_dir / "train" / "images"
    train_labels_dir = target_dir / "train" / "labels"
    if not train_images_dir.exists():
        return

    groups: dict[str, list[str]] = {}
    for img_path in sorted(train_images_dir.iterdir()):
        groups.setdefault(_group_key(img_path.name), []).append(img_path.name)

    group_keys = sorted(groups.keys())
    random.Random(SPLIT_SEED).shuffle(group_keys)
    n_val_groups = max(1, round(len(group_keys) * VAL_RATIO))
    val_groups = set(group_keys[:n_val_groups])

    valid_images_dir.mkdir(parents=True, exist_ok=True)
    valid_labels_dir = target_dir / "valid" / "labels"
    valid_labels_dir.mkdir(parents=True, exist_ok=True)

    moved = 0
    for key in val_groups:
        for filename in groups[key]:
            stem = Path(filename).stem
            shutil.move(str(train_images_dir / filename), str(valid_images_dir / filename))
            label_name = f"{stem}.txt"
            shutil.move(str(train_labels_dir / label_name), str(valid_labels_dir / label_name))
            moved += 1

    print(
        f"      valid 스플릿 없음 감지 -> 원본 이미지 {len(group_keys)}개 중 "
        f"{len(val_groups)}개(증강 포함 {moved}장)를 train에서 valid로 분리"
    )
    _rewrite_data_yaml(target_dir)


def _polygon_to_bbox(coords: list[float]) -> tuple[float, float, float, float]:
    xs = coords[0::2]
    ys = coords[1::2]
    x_min, x_max = min(xs), max(xs)
    y_min, y_max = min(ys), max(ys)
    return (x_min + x_max) / 2, (y_min + y_max) / 2, x_max - x_min, y_max - y_min


def _normalize_label_file(path: Path) -> bool:
    """폴리곤(세그멘테이션) 행을 바운딩박스로 변환해 파일 내 형식을 detection으로 통일.
    이미 바운딩박스(class + 4개 값)인 행은 그대로 둔다. idempotent — 이미 전부
    바운딩박스인 파일은 변경 없음."""
    lines = [line for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    changed = False
    new_lines = []
    for line in lines:
        parts = line.split()
        cls, values = parts[0], [float(v) for v in parts[1:]]
        if len(values) == 4:
            new_lines.append(line)
        else:
            cx, cy, w, h = _polygon_to_bbox(values)
            new_lines.append(f"{cls} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}")
            changed = True
    if changed:
        path.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
    return changed


def _normalize_labels_to_bbox(target_dir: Path) -> None:
    n_files = 0
    n_changed = 0
    for split in ("train", "valid", "test"):
        labels_dir = target_dir / split / "labels"
        if not labels_dir.exists():
            continue
        for label_path in labels_dir.glob("*.txt"):
            n_files += 1
            if _normalize_label_file(label_path):
                n_changed += 1
        (target_dir / split / "labels.cache").unlink(missing_ok=True)  # ultralytics 스캔 캐시 무효화

    print(f"      라벨 정규화: {n_files}개 중 {n_changed}개 파일에서 폴리곤 -> 박스 변환")


def _rewrite_data_yaml(target_dir: Path) -> None:
    import yaml

    yaml_path = target_dir / "data.yaml"
    with open(yaml_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    data["path"] = str(target_dir)
    data["train"] = "train/images"
    data["val"] = "valid/images"
    if (target_dir / "test" / "images").exists():
        data["test"] = "test/images"
    else:
        data.pop("test", None)

    with open(yaml_path, "w", encoding="utf-8") as f:
        yaml.safe_dump(data, f, allow_unicode=True, sort_keys=False)


def main() -> None:
    if not (TARGET_DIR / "data.yaml").exists():
        from dotenv import load_dotenv

        load_dotenv(BACKEND_ROOT / ".env")
        api_key = os.getenv("ROBOFLOW_API_KEY")
        if not api_key:
            raise RuntimeError(
                "ROBOFLOW_API_KEY가 설정되어 있지 않습니다. backend/.env에 추가하세요 "
                "(https://app.roboflow.com/settings/api 에서 발급)."
            )

        from roboflow import Roboflow

        DATA_DIR.mkdir(parents=True, exist_ok=True)

        print(f"[1/2] Roboflow 프로젝트 로드: {ROBOFLOW_WORKSPACE}/{ROBOFLOW_PROJECT} v{ROBOFLOW_VERSION}")
        rf = Roboflow(api_key=api_key)
        project = rf.workspace(ROBOFLOW_WORKSPACE).project(ROBOFLOW_PROJECT)

        print(f"[2/2] {EXPORT_FORMAT} 포맷으로 다운로드 -> {TARGET_DIR}")
        dataset = project.version(ROBOFLOW_VERSION).download(EXPORT_FORMAT, location=str(TARGET_DIR))
        print(f"완료: {dataset.location}")
    else:
        print(f"[skip] 이미 다운로드됨: {TARGET_DIR}")

    _ensure_val_split(TARGET_DIR)
    _normalize_labels_to_bbox(TARGET_DIR)


if __name__ == "__main__":
    main()
