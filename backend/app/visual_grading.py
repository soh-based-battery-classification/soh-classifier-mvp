"""비전(YOLO) 브랜치 심각도 + SOH 등급 -> 최종 등급 오버라이드 로직.

architecture 문서 4-1장의 매트릭스를 그대로 구현. YOLO 추론 서비스가 아직 붙기 전
(Phase 2 이전)에는 API 호출자가 visual_severity를 직접 지정해 오버라이드 로직을
테스트할 수 있다.
"""

from __future__ import annotations

from typing import Dict

OVERRIDE_MATRIX: Dict[str, Dict[str, str]] = {
    "CRITICAL": {"A": "D", "B": "D", "C": "D", "D": "D"},
    "MODERATE": {"A": "B", "B": "C", "C": "C", "D": "D"},
    "OK": {"A": "A", "B": "B", "C": "C", "D": "D"},
}


def apply_visual_override(soh_grade: str, visual_severity: str) -> str:
    if visual_severity == "PENDING":
        raise ValueError("탐지 결과 없이 등급 확정 불가")
    if visual_severity not in OVERRIDE_MATRIX:
        raise ValueError(f"알 수 없는 visual_severity: {visual_severity}")
    if soh_grade not in OVERRIDE_MATRIX[visual_severity]:
        raise ValueError(f"알 수 없는 soh_grade: {soh_grade}")
    return OVERRIDE_MATRIX[visual_severity][soh_grade]
