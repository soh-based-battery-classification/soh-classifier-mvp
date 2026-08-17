from __future__ import annotations

import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


class PackCreate(BaseModel):
    pack_id: str
    model_name: str
    rated_capacity: float


class PackOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    pack_id: str
    model_name: str
    rated_capacity: float
    registered_at: datetime.datetime


class CycleLogCreate(BaseModel):
    cycle_index: int
    soh_percent: Optional[float] = None
    capacity_ah: Optional[float] = None
    measured_at: Optional[datetime.datetime] = None


class CycleLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cycle_index: int
    capacity_ah: Optional[float]
    soh_percent: float
    measured_at: datetime.datetime


class PredictionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    predicted_at: datetime.datetime
    predicted_soh: float
    grade: str
    model_version: str


class VisualSeverityIn(BaseModel):
    visual_severity: Literal["OK", "MODERATE", "CRITICAL"]


class FinalStateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    pack_id: str
    soh_grade: Optional[str]
    visual_severity: str
    final_grade: Optional[str]
    final_state: Optional[str]
    decided_at: Optional[datetime.datetime]


class PackDetailOut(BaseModel):
    pack: PackOut
    cycle_logs: list[CycleLogOut]
    predictions: list[PredictionOut]
    final_state: Optional[FinalStateOut]
