"""YOLO 부품 탐지 추론 래퍼.

학습된 YOLO 가중치(yolo_best.pt)와 클래스 정보(yolo_model_meta.json)가 MODEL_DIR에
있으면 로드해서 실제 추론을 수행한다. SOH 예측(nlinear.py)과 달리 이 모델은 손상
여부가 아닌 배터리 팩 부품 종류(Screw/Nut/Bolt/Cable/Aluminum-frame/Battery
Module/Bus-bar)를 탐지하도록 학습됐다 — 탐지 결과를 손상 심각도로 해석하는 규칙은
visual_grading.estimate_severity_from_detections 쪽에 별도로 있다.
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
