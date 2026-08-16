"""사이클 dict 리스트 -> SOH(%) DataFrame 변환. 리서치 저장소
(preprocessing/build_dataset.py)에서 그대로 가져옴."""

from __future__ import annotations

from typing import Any, Dict, List

import pandas as pd


def build_soh_dataframe(cycles: List[Dict[str, Any]], rated_capacity: float) -> pd.DataFrame:
    rows = []
    discharge_idx = 0
    for c in cycles:
        if c["cycle"] != "discharge":
            continue
        discharge_idx += 1
        capacity_series = c["data"].get("Capacity")
        if not capacity_series:
            continue
        capacity = float(capacity_series[0])
        rows.append(
            {
                "cycle": discharge_idx,
                "capacity": capacity,
                "soh": capacity / rated_capacity * 100.0,
            }
        )

    df = pd.DataFrame(rows)
    if df.empty:
        raise ValueError("discharge 사이클에서 Capacity 값을 하나도 찾지 못했습니다.")
    return df
