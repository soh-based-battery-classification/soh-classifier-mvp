from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models_db, schemas
from ..chatbot import INDUSTRIES, ask_clova
from ..database import get_db

router = APIRouter(prefix="/api/packs", tags=["chatbot"])


@router.get("/_chatbot/industries", response_model=list[schemas.IndustryOut])
def list_industries():
    return [{"key": k, "label": v} for k, v in INDUSTRIES.items()]


@router.post("/{pack_id}/chat", response_model=schemas.ChatResponse)
def chat_about_grade(pack_id: str, payload: schemas.ChatRequest, db: Session = Depends(get_db)):
    pack = db.get(models_db.BatteryPack, pack_id)
    if not pack:
        raise HTTPException(status_code=404, detail="팩을 찾을 수 없습니다.")
    if payload.industry not in INDUSTRIES:
        raise HTTPException(status_code=422, detail=f"알 수 없는 산업 유형: {payload.industry}")

    final_state = pack.final_state
    if not final_state or not final_state.final_grade:
        raise HTTPException(status_code=422, detail="최종 등급이 아직 산출되지 않았습니다.")

    grade_context = (
        f"- 모델명: {pack.model_name}, 정격 용량: {pack.rated_capacity}Ah\n"
        f"- SOH 등급: {final_state.soh_grade}\n"
        f"- 외형 상태: {final_state.visual_severity}\n"
        f"- 최종 등급: {final_state.final_grade} ({final_state.final_state})\n"
    )

    messages = [{"role": m.role, "content": m.content} for m in payload.messages]
    reply = ask_clova(payload.industry, grade_context, messages)
    return schemas.ChatResponse(content=reply)
