"""SOH(%) -> 등급(A/B/C/D) 매핑. 연구 저장소(classification/grading.py)의 핵심 로직만 가져옴."""

from __future__ import annotations

from typing import Dict, List, Tuple

DEFAULT_THRESHOLDS: Dict[str, float] = {"A": 90.0, "B": 80.0, "C": 70.0}
EOL_GRADE = "D"

GRADE_TO_STATE: Dict[str, str] = {
    "A": "재사용 우수",
    "B": "재사용 가능",
    "C": "재제조 검토",
    "D": "재활용 대상",
}


def _sorted_thresholds(thresholds: Dict[str, float]) -> List[Tuple[str, float]]:
    return sorted(thresholds.items(), key=lambda kv: kv[1], reverse=True)


def soh_to_grade(soh: float, thresholds: Dict[str, float] = DEFAULT_THRESHOLDS) -> str:
    for grade, cutoff in _sorted_thresholds(thresholds):
        if soh >= cutoff:
            return grade
    return EOL_GRADE
