"""비전(YOLO) 브랜치 라우터.

`/detect`는 이미지 올리면 PartDetector(YOLO)가 결함(swelling/leak/corrosion)을
탐지하고, visual_grading.estimate_severity_from_detections가 그 결과를 심각도로
바꿔서 등급 오버라이드에 반영한다. `/visual-severity`는 심각도 값을 그냥 손으로
지정하는 경로 — 오버라이드 로직만 따로 테스트하고 싶을 때 쓴다. 둘 다 계속
살아있다."""

from __future__ import annotations

import datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from .. import models_db, schemas
from ..config import MODEL_DIR
from ..database import get_db
from ..grading import GRADE_TO_STATE
from ..ml.yolo_detector import PartDetector
from ..visual_grading import apply_visual_override, estimate_severity_from_detections
from .soh import run_prediction

router = APIRouter(prefix="/api/packs", tags=["detection"])

_detector = PartDetector(MODEL_DIR)


def _apply_severity(db: Session, pack: models_db.BatteryPack, visual_severity: str) -> models_db.PackFinalState:
    final_state = pack.final_state
    if final_state is None:
        final_state = models_db.PackFinalState(pack_id=pack.pack_id)
        db.add(final_state)

    final_state.visual_severity = visual_severity

    if final_state.soh_grade is not None:
        final_grade = apply_visual_override(final_state.soh_grade, visual_severity)
        final_state.final_grade = final_grade
        final_state.final_state = GRADE_TO_STATE[final_grade]
        final_state.decided_at = datetime.datetime.utcnow()

    return final_state


@router.put("/{pack_id}/visual-severity", response_model=schemas.FinalStateOut)
def set_visual_severity(pack_id: str, payload: schemas.VisualSeverityIn, db: Session = Depends(get_db)):
    pack = db.get(models_db.BatteryPack, pack_id)
    if not pack:
        raise HTTPException(status_code=404, detail="팩을 찾을 수 없습니다.")

    final_state = _apply_severity(db, pack, payload.visual_severity)

    db.commit()
    db.refresh(final_state)
    return final_state


@router.post("/{pack_id}/detect", response_model=schemas.DetectionResultOut, status_code=201)
async def detect_pack_image(pack_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    pack = db.get(models_db.BatteryPack, pack_id)
    if not pack:
        raise HTTPException(status_code=404, detail="팩을 찾을 수 없습니다.")
    if not _detector.is_ready:
        raise HTTPException(status_code=503, detail="객체탐지 모델이 로드되지 않았습니다.")

    image_bytes = await file.read()
    try:
        detections = _detector.detect(image_bytes)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"이미지를 처리할 수 없습니다: {e}")

    # 사이클 로그는 있는데 아직 SOH 예측(soh_grade)이 안 된 상태로 사진을 올리면
    # 최종 등급이 계산되지 않고 조용히 넘어가던 문제 -> 여기서 자동으로 예측을 실행해준다.
    if pack.cycle_logs and (pack.final_state is None or pack.final_state.soh_grade is None):
        run_prediction(db, pack)

    result = models_db.DetectionResult(pack_id=pack_id, model_version=_detector.model_version)
    db.add(result)
    db.flush()

    for d in detections:
        db.add(
            models_db.DetectionObject(
                detection_result_id=result.id,
                class_name=d.class_name,
                confidence=d.confidence,
                bbox_x=d.bbox_x,
                bbox_y=d.bbox_y,
                bbox_w=d.bbox_w,
                bbox_h=d.bbox_h,
            )
        )

    severity = estimate_severity_from_detections(detections)
    _apply_severity(db, pack, severity)

    db.commit()
    db.refresh(result)

    return schemas.DetectionResultOut(
        id=result.id,
        pack_id=result.pack_id,
        detected_at=result.detected_at,
        model_version=result.model_version,
        visual_severity=severity,
        objects=[schemas.DetectionObjectOut.model_validate(o, from_attributes=True) for o in result.objects],
    )


@router.get("/_vision_model/status")
def detection_model_status():
    return {
        "is_ready": _detector.is_ready,
        "model_dir": MODEL_DIR,
    }


@router.get("/{pack_id}/final", response_model=schemas.FinalStateOut)
def get_final_state(pack_id: str, db: Session = Depends(get_db)):
    pack = db.get(models_db.BatteryPack, pack_id)
    if not pack:
        raise HTTPException(status_code=404, detail="팩을 찾을 수 없습니다.")
    if not pack.final_state:
        raise HTTPException(status_code=404, detail="아직 최종 등급이 산출되지 않았습니다.")
    return pack.final_state
