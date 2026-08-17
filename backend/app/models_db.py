"""SQLAlchemy ORM 모델. architecture 문서 4장 DB 설계를 그대로 반영."""

from __future__ import annotations

import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base

GRADES = ("A", "B", "C", "D")
SEVERITIES = ("OK", "MODERATE", "CRITICAL", "PENDING")


class BatteryPack(Base):
    __tablename__ = "battery_pack"

    pack_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    model_name: Mapped[str] = mapped_column(String(64))
    rated_capacity: Mapped[float] = mapped_column(Float)
    registered_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    cycle_logs: Mapped[list["SohCycleLog"]] = relationship(
        back_populates="pack", cascade="all, delete-orphan"
    )
    predictions: Mapped[list["SohPrediction"]] = relationship(
        back_populates="pack", cascade="all, delete-orphan"
    )
    final_state: Mapped["PackFinalState | None"] = relationship(
        back_populates="pack", uselist=False, cascade="all, delete-orphan"
    )
    detection_results: Mapped[list["DetectionResult"]] = relationship(
        back_populates="pack", cascade="all, delete-orphan"
    )


class SohCycleLog(Base):
    __tablename__ = "soh_cycle_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    pack_id: Mapped[str] = mapped_column(ForeignKey("battery_pack.pack_id"))
    cycle_index: Mapped[int] = mapped_column(Integer)
    capacity_ah: Mapped[float | None] = mapped_column(Float, nullable=True)
    soh_percent: Mapped[float] = mapped_column(Float)
    measured_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    pack: Mapped["BatteryPack"] = relationship(back_populates="cycle_logs")


class SohPrediction(Base):
    __tablename__ = "soh_prediction"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    pack_id: Mapped[str] = mapped_column(ForeignKey("battery_pack.pack_id"))
    predicted_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )
    predicted_soh: Mapped[float] = mapped_column(Float)
    grade: Mapped[str] = mapped_column(Enum(*GRADES, name="grade_enum"))
    model_version: Mapped[str] = mapped_column(String(32))

    pack: Mapped["BatteryPack"] = relationship(back_populates="predictions")


class DetectionResult(Base):
    __tablename__ = "detection_result"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    pack_id: Mapped[str] = mapped_column(ForeignKey("battery_pack.pack_id"))
    image_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    detected_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )
    model_version: Mapped[str] = mapped_column(String(32))

    pack: Mapped["BatteryPack"] = relationship(back_populates="detection_results")
    objects: Mapped[list["DetectionObject"]] = relationship(
        back_populates="detection_result", cascade="all, delete-orphan"
    )


class DetectionObject(Base):
    __tablename__ = "detection_object"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    detection_result_id: Mapped[int] = mapped_column(ForeignKey("detection_result.id"))
    class_name: Mapped[str] = mapped_column(String(32))
    confidence: Mapped[float] = mapped_column(Float)
    bbox_x: Mapped[float] = mapped_column(Float)
    bbox_y: Mapped[float] = mapped_column(Float)
    bbox_w: Mapped[float] = mapped_column(Float)
    bbox_h: Mapped[float] = mapped_column(Float)

    detection_result: Mapped["DetectionResult"] = relationship(back_populates="objects")


class PackFinalState(Base):
    __tablename__ = "pack_final_state"

    pack_id: Mapped[str] = mapped_column(ForeignKey("battery_pack.pack_id"), primary_key=True)
    soh_grade: Mapped[str | None] = mapped_column(Enum(*GRADES, name="soh_grade_enum"), nullable=True)
    visual_severity: Mapped[str] = mapped_column(
        Enum(*SEVERITIES, name="severity_enum"), default="PENDING"
    )
    final_grade: Mapped[str | None] = mapped_column(Enum(*GRADES, name="final_grade_enum"), nullable=True)
    final_state: Mapped[str | None] = mapped_column(String(32), nullable=True)
    decided_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)

    pack: Mapped["BatteryPack"] = relationship(back_populates="final_state")
