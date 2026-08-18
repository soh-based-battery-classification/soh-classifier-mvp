"""비전(YOLO) 브랜치 심각도 + SOH 등급 -> 최종 등급 오버라이드 로직.

architecture 문서 4-1장의 매트릭스를 그대로 구현. YOLO 추론 서비스가 아직 붙기 전
(Phase 2 이전)에는 API 호출자가 visual_severity를 직접 지정해 오버라이드 로직을
테스트할 수 있다.
"""

from __future__ import annotations

from typing import Dict, Iterable, Protocol

OVERRIDE_MATRIX: Dict[str, Dict[str, str]] = {
    "CRITICAL": {"A": "D", "B": "D", "C": "D", "D": "D"},
    "MODERATE": {"A": "B", "B": "C", "C": "C", "D": "D"},
    "OK": {"A": "A", "B": "B", "C": "C", "D": "D"},
}

# 핵심 구조 부품(프레임/모듈/버스바) — 탐지 안 되면 분해·누락 가능성으로 취급.
STRUCTURAL_PARTS = {"Aluminum-frame", "Battery Module", "Bus-bar"}
LOW_CONFIDENCE_THRESHOLD = 0.5


class _HasClassAndConfidence(Protocol):
    class_name: str
    confidence: float


def estimate_severity_from_detections(detections: Iterable[_HasClassAndConfidence]) -> str:
    """탐지된 부품 목록으로부터 visual_severity를 추정하는 임시 규칙(PLACEHOLDER).

    이 YOLO 모델은 손상(파손/부식/팽창 등)이 아닌 부품 종류를 탐지하도록 학습됐고,
    실제 손상 판정 기준은 아직 정의되어 있지 않다. 그때까지 핵심 구조 부품 중
    하나라도 탐지되지 않으면 CRITICAL, 다 탐지됐지만 평균 신뢰도가 낮으면(오염/부식
    등으로 인식률이 떨어졌을 가능성) MODERATE로 임시 매핑한다. 실제 손상 라벨 기준이
    생기면 이 함수만 교체하면 되고, 호출부(detection 라우터)는 그대로 재사용 가능하다.
    """
    detections = list(detections)
    if not detections:
        return "CRITICAL"

    detected_classes = {d.class_name for d in detections}
    if STRUCTURAL_PARTS - detected_classes:
        return "CRITICAL"

    avg_confidence = sum(d.confidence for d in detections) / len(detections)
    if avg_confidence < LOW_CONFIDENCE_THRESHOLD:
        return "MODERATE"

    return "OK"


def apply_visual_override(soh_grade: str, visual_severity: str) -> str:
    if visual_severity == "PENDING":
        raise ValueError("탐지 결과 없이 등급 확정 불가")
    if visual_severity not in OVERRIDE_MATRIX:
        raise ValueError(f"알 수 없는 visual_severity: {visual_severity}")
    if soh_grade not in OVERRIDE_MATRIX[visual_severity]:
        raise ValueError(f"알 수 없는 soh_grade: {soh_grade}")
    return OVERRIDE_MATRIX[visual_severity][soh_grade]
