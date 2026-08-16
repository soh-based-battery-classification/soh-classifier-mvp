"""NASA PCoE 배터리 데이터셋(.mat)을 파이썬 객체로 파싱하는 모듈. 리서치 저장소
(preprocessing/mat_loader.py)에서 그대로 가져옴."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Union


def _convert_to_time(date_parts) -> datetime:
    return datetime(
        year=int(date_parts[0]),
        month=int(date_parts[1]),
        day=int(date_parts[2]),
        hour=int(date_parts[3]),
        minute=int(date_parts[4]),
        second=int(date_parts[5]),
    )


def load_battery_mat(mat_path: Union[str, Path], battery_id: str | None = None) -> List[Dict[str, Any]]:
    import scipy.io

    mat_path = Path(mat_path)
    if not mat_path.exists():
        raise FileNotFoundError(f"'{mat_path}' 파일을 찾을 수 없습니다.")

    filename = battery_id or mat_path.stem
    raw = scipy.io.loadmat(str(mat_path))
    if filename not in raw:
        available = [k for k in raw.keys() if not k.startswith("__")]
        raise KeyError(f"'{filename}' 키가 {mat_path} 안에 없습니다. 사용 가능한 키: {available}")

    col = raw[filename]
    col = col[0][0][0][0]
    n_cycles = col.shape[0]

    cycles: List[Dict[str, Any]] = []
    for i in range(n_cycles):
        cycle_type = str(col[i][0][0])
        record: Dict[str, Any] = {
            "cycle": cycle_type,
            "temp": int(col[i][1].item()),
            "time": str(_convert_to_time(col[i][2][0])),
            "data": {},
        }

        if cycle_type != "impedance":
            field_names = list(col[i][3][0].dtype.fields.keys())
            channel_values: Dict[str, list] = {}
            for field_idx, field_name in enumerate(field_names):
                values = col[i][3][0][0][field_idx][0]
                channel_values[field_name] = [v for v in values]
            record["data"] = channel_values

        cycles.append(record)

    return cycles
