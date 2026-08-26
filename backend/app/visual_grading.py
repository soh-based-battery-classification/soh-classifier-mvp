"""비전(YOLO) 브랜치 심각도 + SOH 등급 -> 최종 등급 오버라이드 로직.

architecture 문서 4-1장의 매트릭스를 그대로 구현. `POST /detect`가 YOLO 결함탐지
결과로부터 estimate_severity_from_detections()를 호출해 visual_severity를 자동
산출하며, `PUT /visual-severity`로 API 호출자가 값을 직접 지정해 오버라이드 로직만
따로 테스트하는 경로도 계속 지원한다.
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
    """실제 손상탐지(swelling/leak/corrosion) 결과로부터 visual_severity 산출.

    배포 중인 yolo_best.pt는 swelling/leak/corrosion 3클래스로 학습된 가중치
    (yolo_model_meta.json 참고)이며, 초기의 부품탐지 기반 placeholder 규칙은 이
    함수로 완전히 대체됐다.

    우선순위:
      1) swelling 또는 leak 이 하나라도 confidence>=MIN_CONFIDENCE 로 탐지됨
         -> CRITICAL (화재/누출 위험, SOH 무관하게 최종등급 D로 깎임)
      2) corrosion 만 confidence>=MIN_CONFIDENCE 로 탐지됨
         -> MODERATE
      3) 결함 없음 또는 전부 confidence 미달
         -> OK
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
