from typing import List, Optional
from pydantic import BaseModel


class PackCreate(BaseModel):
    name: str
    vehicle_type: Optional[str] = None


class CycleLogItem(BaseModel):
    cycle_index: int
    soh_value: float


class CycleBulkUpload(BaseModel):
    cycles: List[CycleLogItem]


class VisualSeverityOverride(BaseModel):
    visual_severity: str  # normal | minor | major | critical
