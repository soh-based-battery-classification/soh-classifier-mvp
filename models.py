import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.db.session import Base


def gen_id():
    return uuid.uuid4().hex


def now():
    return datetime.now(timezone.utc)


class BatteryPack(Base):
    __tablename__ = "battery_pack"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    vehicle_type = Column(String, nullable=True)
    # YOLO가 아직 없을 때 사람이 임시로 지정하는 값 (Phase 2 이전 스텁)
    manual_visual_severity = Column(String, nullable=True, default="normal")
    created_at = Column(DateTime, default=now)

    cycle_logs = relationship("SohCycleLog", back_populates="pack", cascade="all, delete-orphan")
    soh_predictions = relationship("SohPrediction", back_populates="pack", cascade="all, delete-orphan")
    detection_results = relationship("DetectionResult", back_populates="pack", cascade="all, delete-orphan")
    final_state = relationship("PackFinalState", back_populates="pack", uselist=False, cascade="all, delete-orphan")


class SohCycleLog(Base):
    __tablename__ = "soh_cycle_log"

    id = Column(String, primary_key=True, default=gen_id)
    pack_id = Column(String, ForeignKey("battery_pack.id"), nullable=False)
    cycle_index = Column(Integer, nullable=False)
    soh_value = Column(Float, nullable=False)
    created_at = Column(DateTime, default=now)

    pack = relationship("BatteryPack", back_populates="cycle_logs")


class SohPrediction(Base):
    __tablename__ = "soh_prediction"

    id = Column(String, primary_key=True, default=gen_id)
    pack_id = Column(String, ForeignKey("battery_pack.id"), nullable=False)
    predicted_soh = Column(Float, nullable=False)
    mode = Column(String, nullable=False)  # trained_model | naive_fallback
    input_cycles_used = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=now)

    pack = relationship("BatteryPack", back_populates="soh_predictions")


class DetectionResult(Base):
    __tablename__ = "detection_result"

    id = Column(String, primary_key=True, default=gen_id)
    pack_id = Column(String, ForeignKey("battery_pack.id"), nullable=False)
    image_path = Column(String, nullable=False)
    visual_severity = Column(String, nullable=False)  # normal | minor | major | critical
    severity_score = Column(Float, default=0.0)
    vision_mode = Column(String, nullable=False)  # trained_model | stub
    created_at = Column(DateTime, default=now)

    pack = relationship("BatteryPack", back_populates="detection_results")
    objects = relationship("DetectionObject", back_populates="detection_result", cascade="all, delete-orphan")


class DetectionObject(Base):
    __tablename__ = "detection_object"

    id = Column(String, primary_key=True, default=gen_id)
    detection_result_id = Column(String, ForeignKey("detection_result.id"), nullable=False)
    defect_type = Column(String, nullable=False)  # swelling | leak | corrosion
    confidence = Column(Float, nullable=False)
    bbox_x1 = Column(Float)
    bbox_y1 = Column(Float)
    bbox_x2 = Column(Float)
    bbox_y2 = Column(Float)

    detection_result = relationship("DetectionResult", back_populates="objects")


class PackFinalState(Base):
    __tablename__ = "pack_final_state"

    pack_id = Column(String, ForeignKey("battery_pack.id"), primary_key=True)
    soh_value = Column(Float, nullable=True)
    visual_severity = Column(String, nullable=True)
    final_decision = Column(String, nullable=True)  # reuse | recycle_material | hazard_special | pending
    final_grade = Column(String, nullable=True)      # A | B | C | D | F | N/A
    reasoning = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=now, onupdate=now)

    pack = relationship("BatteryPack", back_populates="final_state")
