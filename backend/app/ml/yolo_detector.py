"""YOLO 결함탐지 추론 래퍼.

MODEL_DIR에 yolo_best.pt + yolo_model_meta.json이 있으면 로드해서 추론한다.
지금 붙어있는 가중치는 배터리 팩 부품이 아니라 외관 결함(swelling/leak/
corrosion) 세 가지를 잡도록 학습된 거다 — 탐지 결과를 심각도로 바꾸는 규칙은
visual_grading.estimate_severity_from_detections에 따로 있다. 클래스 목록은
yolo_model_meta.json에서 읽어오니까 가중치만 바꿔치기해도 이 파일은 그대로 써도
된다.
"""

from __future__ import annotations

import io
import json
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

CONF_THRESHOLD = 0.65


@dataclass
class Detection:
    class_name: str
    confidence: float
    bbox_x: float
    bbox_y: float
    bbox_w: float
    bbox_h: float


class PartDetector:
    def __init__(self, model_dir: str):
        self.model_dir = Path(model_dir)
        self.model = None
        self.meta: Optional[dict] = None
        self._try_load()

    def _try_load(self) -> None:
        weights_path = self.model_dir / "yolo_best.pt"
        meta_path = self.model_dir / "yolo_model_meta.json"
        if not weights_path.exists() or not meta_path.exists():
            return

        from ultralytics import YOLO

        with open(meta_path, "r", encoding="utf-8") as f:
            self.meta = json.load(f)
        self.model = YOLO(str(weights_path))

    @property
    def is_ready(self) -> bool:
        return self.model is not None

    @property
    def model_version(self) -> str:
        return self.meta.get("model_version", "yolo") if self.meta else "yolo"

    def detect(self, image_bytes: bytes) -> List[Detection]:
        if self.model is None:
            raise RuntimeError("객체탐지 모델이 로드되지 않았습니다.")

        from PIL import Image

        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        results = self.model.predict(image, conf=CONF_THRESHOLD, verbose=False)
        result = results[0]

        detections: List[Detection] = []
        for box in result.boxes:
            cls_idx = int(box.cls[0].item())
            x, y, w, h = box.xywh[0].tolist()
            detections.append(
                Detection(
                    class_name=result.names[cls_idx],
                    confidence=float(box.conf[0].item()),
                    bbox_x=x,
                    bbox_y=y,
                    bbox_w=w,
                    bbox_h=h,
                )
            )
        return detections
