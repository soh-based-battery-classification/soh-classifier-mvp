"""비전(YOLO) 심각도 + SOH 등급 -> 최종 등급 오버라이드.

architecture 문서 4-1장 매트릭스 그대로 구현한 것. `/detect`가 결함탐지 결과로
estimate_severity_from_detections()를 호출해서 visual_severity를 자동으로
정하고, `/visual-severity`로는 그 값을 직접 찍어넣을 수도 있다 (오버라이드
로직만 따로 테스트하고 싶을 때 쓰라고 남겨둠).
"""

from __future__ import annotations

from typing import Dict, Iterable, Protocol

OVERRIDE_MATRIX: Dict[str, Dict[str, str]] = {
    "CRITICAL": {"A": "D", "B": "D", "C": "D", "D": "D"},
    "MODERATE": {"A": "B", "B": "C", "C": "C", "D": "D"},
    "OK": {"A": "A", "B": "B", "C": "C", "D": "D"},
}

# 결함 유형별 심각도 분류.
# swelling(스웰링)/leak(누액) = 화재/누출 직결 위험 -> CRITICAL
# corrosion(부식) = 상대적으로 경미 -> MODERATE
CRITICAL_DEFECTS = {"swelling", "leak"}
MODERATE_DEFECTS = {"corrosion"}

# 이 값 미만 confidence는 오탐지 가능성 높다고 보고 무시
MIN_CONFIDENCE = 0.65


class _HasClassAndConfidence(Protocol):
    class_name: str
    confidence: float


def estimate_severity_from_detections(detections: Iterable[_HasClassAndConfidence]) -> str:
    """결함탐지(swelling/leak/corrosion) 결과 -> visual_severity.

    yolo_best.pt가 이 세 클래스로 학습돼 있어서(yolo_model_meta.json 참고),
    예전 부품탐지 기반 placeholder 규칙은 이걸로 완전히 갈아치웠다.

    규칙:
      - swelling/leak 중 하나라도 confidence>=MIN_CONFIDENCE로 잡히면 CRITICAL
        (화재/누출 위험이라 SOH 상관없이 최종등급 D로 깎임)
      - corrosion만 잡히면 MODERATE
      - 그 외(결함 없음 / confidence 미달)는 OK
    """
    detections = list(detections)

    confident_defects = {
        d.class_name for d in detections if d.confidence >= MIN_CONFIDENCE
    }

    if confident_defects & CRITICAL_DEFECTS:
        return "CRITICAL"

    if confident_defects & MODERATE_DEFECTS:
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
