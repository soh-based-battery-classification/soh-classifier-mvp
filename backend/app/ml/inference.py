"""SOH 예측 추론 래퍼.

학습된 NLinear 가중치(model.pt)와 하이퍼파라미터/스케일러 정보(model_meta.json)가
MODEL_DIR에 있으면 그걸 로드해서 실제 예측을 수행한다. 아직 학습된 모델이 없는
개발 초기 단계에서는(로컬 데모용) 최근 사이클의 선형 추세를 그대로 연장하는
naive fallback으로 동작해, 프론트/백엔드 연동을 모델 학습 완료 전에도 테스트할 수
있게 한다. model_meta.json 예시:

    {
      "seq_len": 16,
      "pred_len": 1,
      "individual": false,
      "enc_in": 1,
      "scaler_min": 62.3,
      "scaler_max": 100.0,
      "model_version": "nlinear_b0005_v1"
    }
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

import numpy as np
import torch

from .nlinear import NLinear, NLinearConfig


@dataclass
class PredictionResult:
    predicted_soh: float
    model_version: str
    used_fallback: bool


class SohPredictor:
    def __init__(self, model_dir: str):
        self.model_dir = Path(model_dir)
        self.model: Optional[NLinear] = None
        self.meta: Optional[dict] = None
        self._try_load()

    def _try_load(self) -> None:
        weights_path = self.model_dir / "model.pt"
        meta_path = self.model_dir / "model_meta.json"
        if not weights_path.exists() or not meta_path.exists():
            return

        with open(meta_path, "r", encoding="utf-8") as f:
            meta = json.load(f)

        config = NLinearConfig(
            seq_len=meta["seq_len"],
            pred_len=meta["pred_len"],
            individual=meta.get("individual", False),
            enc_in=meta.get("enc_in", 1),
        )
        model = NLinear(config)
        model.load_state_dict(torch.load(weights_path, map_location="cpu"))
        model.eval()

        self.model = model
        self.meta = meta

    @property
    def is_ready(self) -> bool:
        return self.model is not None

    def predict(self, recent_soh_values: List[float]) -> PredictionResult:
        """가장 최근 사이클부터 과거 순으로가 아니라, 시간순(오래된 -> 최신)으로 정렬된
        soh_percent 리스트를 받아 다음 1 사이클의 SOH(%)를 예측한다."""
        if self.model is not None and self.meta is not None:
            return self._predict_with_model(recent_soh_values)
        return self._predict_naive(recent_soh_values)

    def _predict_with_model(self, recent_soh_values: List[float]) -> PredictionResult:
        seq_len = self.meta["seq_len"]
        if len(recent_soh_values) < seq_len:
            raise ValueError(
                f"모델이 필요로 하는 입력 길이({seq_len})보다 제공된 사이클 이력이 "
                f"적습니다({len(recent_soh_values)}). 사이클 로그를 더 등록해주세요."
            )
        window = np.array(recent_soh_values[-seq_len:], dtype=np.float32)

        scaler_min = self.meta.get("scaler_min", 0.0)
        scaler_max = self.meta.get("scaler_max", 100.0)
        denom = (scaler_max - scaler_min) or 1e-8
        normalized = (window - scaler_min) / denom

        x = torch.from_numpy(normalized).view(1, seq_len, 1)
        with torch.no_grad():
            y = self.model(x)
        pred_norm = float(y[0, 0, 0].item())
        pred_soh = pred_norm * denom + scaler_min

        return PredictionResult(
            predicted_soh=pred_soh,
            model_version=self.meta.get("model_version", "nlinear"),
            used_fallback=False,
        )

    def _predict_naive(self, recent_soh_values: List[float]) -> PredictionResult:
        if len(recent_soh_values) < 2:
            pred = recent_soh_values[-1] if recent_soh_values else 100.0
        else:
            window = np.array(recent_soh_values[-8:], dtype=np.float64)
            x = np.arange(len(window))
            slope, intercept = np.polyfit(x, window, 1)
            pred = float(slope * len(window) + intercept)

        return PredictionResult(
            predicted_soh=pred,
            model_version="naive_linear_fallback",
            used_fallback=True,
        )
