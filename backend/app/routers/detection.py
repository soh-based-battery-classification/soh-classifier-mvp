"""비전(YOLO) 브랜치 스텁 라우터.

Phase 2(객체탐지 모델)가 아직 붙기 전까지, 이 엔드포인트로 visual_severity를 직접
지정해 4-1장의 등급 오버라이드 로직을 end-to-end로 테스트할 수 있다. 실제 YOLO 추론
서비스가 붙으면 이 엔드포인트 내부 로직만 "이미지 업로드 -> 추론 -> 심각도 계산"으로
교체하면 되고, 아래쪽의 오버라이드/최종 등급 계산 로직은 그대로 재사용 가능하다.
"""

from __future__ import annotations

import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models_db, schemas
from ..database import get_db
from ..grading import GRADE_TO_STATE
from ..visual_grading import apply_visual_override

router = APIRouter(prefix="/api/packs", tags=["detection"])


@router.put("/{pack_id}/visual-severity", response_model=schemas.FinalStateOut)
def set_visual_severity(pack_id: str, payload: schemas.VisualSeverityIn, db: Session = Depends(get_db)):
    pack = db.get(models_db.BatteryPack, pack_id)
    if not pack:
        raise HTTPException(status_code=404, detail="팩을 찾을 수 없습니다.")

    final_state = pack.final_state
    if final_state is None:
        final_state = models_db.PackFinalState(pack_id=pack_id)
        db.add(final_state)

    final_state.visual_severity = payload.visual_severity

    if final_state.soh_grade is not None:
        final_grade = apply_visual_override(final_state.soh_grade, payload.visual_severity)
        final_state.final_grade = final_grade
        final_state.final_state = GRADE_TO_STATE[final_grade]
        final_state.decided_at = datetime.datetime.utcnow()

    db.commit()
    db.refresh(final_state)
    return final_state


@router.get("/{pack_id}/final", response_model=schemas.FinalStateOut)
def get_final_state(pack_id: str, db: Session = Depends(get_db)):
    pack = db.get(models_db.BatteryPack, pack_id)
    if not pack:
        raise HTTPException(status_code=404, detail="팩을 찾을 수 없습니다.")
    if not pack.final_state:
        raise HTTPException(status_code=404, detail="아직 최종 등급이 산출되지 않았습니다.")
    return pack.final_state
