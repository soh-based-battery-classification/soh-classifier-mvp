from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models_db, schemas
from ..config import MODEL_DIR
from ..database import get_db
from ..grading import soh_to_grade
from ..ml.inference import SohPredictor

router = APIRouter(prefix="/api/packs", tags=["soh"])

_predictor = SohPredictor(MODEL_DIR)


def run_prediction(db: Session, pack: models_db.BatteryPack) -> models_db.SohPrediction:
    """사이클 로그 기반 SOH 예측 + final_state.soh_grade 갱신. /predict 와 /detect(자동 예측)에서 공용으로 사용."""
    logs = sorted(pack.cycle_logs, key=lambda c: c.cycle_index)
    if not logs:
        raise HTTPException(status_code=422, detail="사이클 로그가 없어 예측할 수 없습니다.")

    soh_values = [log.soh_percent for log in logs]
    try:
        result = _predictor.predict(soh_values)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    grade = soh_to_grade(result.predicted_soh)

    prediction = models_db.SohPrediction(
        pack_id=pack.pack_id,
        predicted_soh=result.predicted_soh,
        grade=grade,
        model_version=result.model_version,
    )
    db.add(prediction)

    final_state = pack.final_state
    if final_state is None:
        final_state = models_db.PackFinalState(pack_id=pack.pack_id, visual_severity="PENDING")
        db.add(final_state)
    final_state.soh_grade = grade

    return prediction


@router.post("/{pack_id}/predict", response_model=schemas.PredictionOut, status_code=201)
def predict_soh(pack_id: str, db: Session = Depends(get_db)):
    pack = db.get(models_db.BatteryPack, pack_id)
    if not pack:
        raise HTTPException(status_code=404, detail="팩을 찾을 수 없습니다.")

    prediction = run_prediction(db, pack)

    db.commit()
    db.refresh(prediction)
    return prediction


@router.get("/_model/status")
def model_status():
    return {
        "is_ready": _predictor.is_ready,
        "mode": "trained_model" if _predictor.is_ready else "naive_fallback",
        "model_dir": MODEL_DIR,
    }
