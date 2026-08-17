"""NLinear 모델 정의 (cure-lab/LTSF-Linear 기반).

DLinear의 이동평균 분해 대신, 입력 윈도우의 마지막 시점 값을 빼고(정규화) 선형
레이어를 통과시킨 뒤 다시 더해주는(역정규화) 방식이다. 분포 시프트(distribution
shift)에 더 강해 일부 데이터셋에서는 DLinear보다 단순하면서도 성능이 좋다.

    x(t) -> x(t) - x(seq_len-1) -> Linear(seq_len -> pred_len) -> + x(seq_len-1)
"""

from __future__ import annotations

from dataclasses import dataclass

import torch
import torch.nn as nn


@dataclass
class NLinearConfig:
    seq_len: int
    pred_len: int
    individual: bool = False
    enc_in: int = 1


class NLinear(nn.Module):
    def __init__(self, config: NLinearConfig):
        super().__init__()
        self.config = config

        if config.individual:
            self.linear = nn.ModuleList(
                [nn.Linear(config.seq_len, config.pred_len) for _ in range(config.enc_in)]
            )
        else:
            self.linear = nn.Linear(config.seq_len, config.pred_len)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (batch, seq_len, channels)
        seq_last = x[:, -1:, :].detach()
        x = x - seq_last

        if self.config.individual:
            batch, channels = x.shape[0], x.shape[2]
            out = torch.zeros(
                batch, self.config.pred_len, channels, dtype=x.dtype, device=x.device
            )
            for c in range(channels):
                out[:, :, c] = self.linear[c](x[:, :, c])
            x = out
        else:
            x = self.linear(x.permute(0, 2, 1)).permute(0, 2, 1)

        return x + seq_last
