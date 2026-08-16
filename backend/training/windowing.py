"""여러 배터리(B0005/B0006/B0007)를 하나의 train/val 셋으로 합치고, 별도 배터리
(B0018)를 test 셋으로 쓰기 위한 슬라이딩 윈도우 유틸리티.

셀 간 일반화 성능을 보려는 목적이므로(전체 향후 계획 항목), 단일 배터리 내부에서
시간순으로 나누던 원래 방식과 달리 "배터리 단위"로 train/test를 나눈다. 단, train에
쓰는 세 배터리 각각의 뒷부분 일부는 val(조기 종료용)로 떼어낸다 — val이 없으면
과적합 시점을 알 수 없기 때문이다. 윈도우는 항상 같은 배터리의 사이클끼리만 묶어서
만든다 (배터리 경계를 넘는 윈도우는 물리적으로 의미가 없으므로 생성하지 않는다).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Tuple

import numpy as np
import torch
from torch.utils.data import ConcatDataset, Dataset


@dataclass
class MinMaxScaler1D:
    min_: float | None = None
    max_: float | None = None

    def fit(self, values: np.ndarray) -> "MinMaxScaler1D":
        self.min_ = float(np.min(values))
        self.max_ = float(np.max(values))
        if self.max_ == self.min_:
            self.max_ = self.min_ + 1e-8
        return self

    def transform(self, values: np.ndarray) -> np.ndarray:
        return (values - self.min_) / (self.max_ - self.min_)

    def inverse_transform(self, values: np.ndarray) -> np.ndarray:
        return values * (self.max_ - self.min_) + self.min_


def make_windows(series: np.ndarray, seq_len: int, pred_len: int) -> Tuple[np.ndarray, np.ndarray]:
    n = len(series)
    num_windows = n - seq_len - pred_len + 1
    if num_windows <= 0:
        raise ValueError(
            f"시계열 길이({n})가 seq_len+pred_len({seq_len + pred_len})보다 작습니다."
        )

    X = np.zeros((num_windows, seq_len), dtype=np.float32)
    Y = np.zeros((num_windows, pred_len), dtype=np.float32)
    for i in range(num_windows):
        X[i] = series[i : i + seq_len]
        Y[i] = series[i + seq_len : i + seq_len + pred_len]
    return X, Y


class SOHWindowDataset(Dataset):
    def __init__(self, X: np.ndarray, Y: np.ndarray):
        self.X = torch.from_numpy(X).unsqueeze(-1)  # (N, seq_len, 1)
        self.Y = torch.from_numpy(Y).unsqueeze(-1)  # (N, pred_len, 1)

    def __len__(self) -> int:
        return self.X.shape[0]

    def __getitem__(self, idx: int):
        return self.X[idx], self.Y[idx]


def build_train_val_windows(
    battery_series: Dict[str, np.ndarray],
    seq_len: int,
    pred_len: int,
    val_ratio: float = 0.15,
) -> tuple[Dataset, Dataset, MinMaxScaler1D]:
    """battery_series: {"B0005": soh_array, "B0006": ..., "B0007": ...}"""
    train_parts = {}
    val_parts = {}
    for battery_id, series in battery_series.items():
        n_val = max(int(len(series) * val_ratio), pred_len + 1)
        n_train = len(series) - n_val
        train_parts[battery_id] = series[:n_train]
        # val 윈도우 입력이 train 구간 끝값을 이어서 쓸 수 있도록 seq_len만큼 겹쳐서 남긴다.
        val_parts[battery_id] = series[max(n_train - seq_len, 0) :]

    scaler = MinMaxScaler1D().fit(np.concatenate(list(train_parts.values())))

    train_datasets, val_datasets = [], []
    for battery_id in battery_series:
        train_norm = scaler.transform(train_parts[battery_id]).astype(np.float32)
        X, Y = make_windows(train_norm, seq_len, pred_len)
        train_datasets.append(SOHWindowDataset(X, Y))

        val_norm = scaler.transform(val_parts[battery_id]).astype(np.float32)
        X, Y = make_windows(val_norm, seq_len, pred_len)
        val_datasets.append(SOHWindowDataset(X, Y))

    return ConcatDataset(train_datasets), ConcatDataset(val_datasets), scaler


def build_test_windows(
    series: np.ndarray, seq_len: int, pred_len: int, scaler: MinMaxScaler1D
) -> Dataset:
    normalized = scaler.transform(series).astype(np.float32)
    X, Y = make_windows(normalized, seq_len, pred_len)
    return SOHWindowDataset(X, Y)
