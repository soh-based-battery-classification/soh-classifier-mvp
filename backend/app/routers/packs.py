from __future__ import annotations

import csv
import datetime
import io

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from .. import models_db, schemas
from ..database import get_db

router = APIRouter(prefix="/api/packs", tags=["packs"])


@router.post("", response_model=schemas.PackOut, status_code=201)
def create_pack(payload: schemas.PackCreate, db: Session = Depends(get_db)):
    existing = db.get(models_db.BatteryPack, payload.pack_id)
    if existing:
        raise HTTPException(status_code=409, detail=f"이미 존재하는 pack_id입니다: {payload.pack_id}")

    pack = models_db.BatteryPack(**payload.model_dump())
    db.add(pack)
    db.add(models_db.PackFinalState(pack_id=pack.pack_id, visual_severity="PENDING"))
    db.commit()
    db.refresh(pack)
    return pack


@router.get("", response_model=list[schemas.PackOut])
def list_packs(db: Session = Depends(get_db)):
    return db.query(models_db.BatteryPack).order_by(models_db.BatteryPack.registered_at.desc()).all()


@router.get("/{pack_id}", response_model=schemas.PackDetailOut)
def get_pack(pack_id: str, db: Session = Depends(get_db)):
    pack = db.get(models_db.BatteryPack, pack_id)
    if not pack:
        raise HTTPException(status_code=404, detail="팩을 찾을 수 없습니다.")

    cycle_logs = sorted(pack.cycle_logs, key=lambda c: c.cycle_index)
    predictions = sorted(pack.predictions, key=lambda p: p.predicted_at, reverse=True)
    return schemas.PackDetailOut(
        pack=schemas.PackOut.model_validate(pack),
        cycle_logs=[schemas.CycleLogOut.model_validate(c) for c in cycle_logs],
        predictions=[schemas.PredictionOut.model_validate(p) for p in predictions],
        final_state=schemas.FinalStateOut.model_validate(pack.final_state) if pack.final_state else None,
    )


@router.delete("/{pack_id}", status_code=204)
def delete_pack(pack_id: str, db: Session = Depends(get_db)):
    pack = db.get(models_db.BatteryPack, pack_id)
    if not pack:
        raise HTTPException(status_code=404, detail="팩을 찾을 수 없습니다.")
    db.delete(pack)
    db.commit()


@router.post("/{pack_id}/cycles", response_model=schemas.CycleLogOut, status_code=201)
def add_cycle_log(pack_id: str, payload: schemas.CycleLogCreate, db: Session = Depends(get_db)):
    pack = db.get(models_db.BatteryPack, pack_id)
    if not pack:
        raise HTTPException(status_code=404, detail="팩을 찾을 수 없습니다.")

    if payload.soh_percent is None and payload.capacity_ah is None:
        raise HTTPException(status_code=422, detail="soh_percent 또는 capacity_ah 중 하나는 필요합니다.")

    soh_percent = payload.soh_percent
    if soh_percent is None:
        soh_percent = payload.capacity_ah / pack.rated_capacity * 100.0

    log = models_db.SohCycleLog(
        pack_id=pack_id,
        cycle_index=payload.cycle_index,
        capacity_ah=payload.capacity_ah,
        soh_percent=soh_percent,
        measured_at=payload.measured_at or datetime.datetime.utcnow(),
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.delete("/{pack_id}/cycles/{cycle_log_id}", status_code=204)
def delete_cycle_log(pack_id: str, cycle_log_id: int, db: Session = Depends(get_db)):
    log = db.get(models_db.SohCycleLog, cycle_log_id)
    if not log or log.pack_id != pack_id:
        raise HTTPException(status_code=404, detail="사이클 로그를 찾을 수 없습니다.")
    db.delete(log)
    db.commit()


@router.post("/{pack_id}/cycles/bulk", response_model=list[schemas.CycleLogOut], status_code=201)
async def add_cycle_logs_bulk(pack_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """CSV 일괄 업로드. 헤더: cycle_index, soh_percent 또는 cycle_index, capacity_ah
    (둘 다 있으면 soh_percent 우선). 예)

        cycle_index,soh_percent
        1,78.5
        2,78.1
    """
    pack = db.get(models_db.BatteryPack, pack_id)
    if not pack:
        raise HTTPException(status_code=404, detail="팩을 찾을 수 없습니다.")

    raw = (await file.read()).decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(raw))
    if not reader.fieldnames or "cycle_index" not in reader.fieldnames:
        raise HTTPException(status_code=422, detail="CSV 헤더에 cycle_index 컬럼이 필요합니다.")

    logs: list[models_db.SohCycleLog] = []
    for row_num, row in enumerate(reader, start=2):
        cycle_index_raw = (row.get("cycle_index") or "").strip()
        if not cycle_index_raw:
            raise HTTPException(status_code=422, detail=f"{row_num}행: cycle_index가 비어 있습니다.")
        try:
            cycle_index = int(cycle_index_raw)
        except ValueError:
            raise HTTPException(status_code=422, detail=f"{row_num}행: cycle_index '{cycle_index_raw}'가 정수가 아닙니다.")

        soh_raw = (row.get("soh_percent") or "").strip()
        capacity_raw = (row.get("capacity_ah") or "").strip()
        if not soh_raw and not capacity_raw:
            raise HTTPException(
                status_code=422, detail=f"{row_num}행: soh_percent 또는 capacity_ah 중 하나가 필요합니다."
            )

        capacity_ah = float(capacity_raw) if capacity_raw else None
        soh_percent = float(soh_raw) if soh_raw else capacity_ah / pack.rated_capacity * 100.0

        logs.append(
            models_db.SohCycleLog(
                pack_id=pack_id,
                cycle_index=cycle_index,
                capacity_ah=capacity_ah,
                soh_percent=soh_percent,
            )
        )

    if not logs:
        raise HTTPException(status_code=422, detail="CSV에 데이터 행이 없습니다.")

    db.add_all(logs)
    db.commit()
    for log in logs:
        db.refresh(log)
    return logs
