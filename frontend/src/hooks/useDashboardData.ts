import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { GRADE_GROUP } from "../content/home";
import type { Grade, Pack, PackDetail, VisualSeverity } from "../types";

/**
 * 대시보드용 집계.
 *
 * 백엔드는 목록 조회(GET /api/packs)에서 등급을 내려주지 않으므로,
 * 팩 목록을 받은 뒤 각 팩의 상세(GET /api/packs/{id})를 병렬로 조회해
 * 화면에서 집계한다. **백엔드는 수정하지 않고 기존 엔드포인트만 사용한다.**
 *
 * 상세 조회가 일부 실패해도 대시보드 전체가 죽지 않도록 allSettled 로 처리하고,
 * 실패한 팩은 "미분석"으로 둔다.
 */

export interface PackRow {
  pack: Pack;
  sohPercent: number | null;
  sohGrade: Grade | null;
  visualSeverity: VisualSeverity;
  finalGrade: Grade | null;
  finalState: string | null;
  /** 등급이 확정된 시각. 없으면 등록 시각을 쓴다. */
  analyzedAt: string | null;
  cycleCount: number;
}

export interface DashboardData {
  rows: PackRow[];
  total: number;
  analyzed: number;
  reuse: number;
  remanufacture: number;
  recycle: number;
}

const EMPTY: DashboardData = {
  rows: [],
  total: 0,
  analyzed: 0,
  reuse: 0,
  remanufacture: 0,
  recycle: 0,
};

function toRow(pack: Pack, detail: PackDetail | null): PackRow {
  if (!detail) {
    return {
      pack,
      sohPercent: null,
      sohGrade: null,
      visualSeverity: "PENDING",
      finalGrade: null,
      finalState: null,
      analyzedAt: null,
      cycleCount: 0,
    };
  }

  const latestPrediction = detail.predictions[0] ?? null;
  const fs = detail.final_state;

  return {
    pack: detail.pack,
    sohPercent: latestPrediction ? latestPrediction.predicted_soh : null,
    sohGrade: fs?.soh_grade ?? latestPrediction?.grade ?? null,
    visualSeverity: fs?.visual_severity ?? "PENDING",
    finalGrade: fs?.final_grade ?? null,
    finalState: fs?.final_state ?? null,
    analyzedAt: fs?.decided_at ?? latestPrediction?.predicted_at ?? null,
    cycleCount: detail.cycle_logs.length,
  };
}

function aggregate(rows: PackRow[]): DashboardData {
  let reuse = 0;
  let remanufacture = 0;
  let recycle = 0;
  let analyzed = 0;

  rows.forEach((row) => {
    if (!row.finalGrade) return;
    analyzed += 1;
    const group = GRADE_GROUP[row.finalGrade];
    if (group === "reuse") reuse += 1;
    else if (group === "remanufacture") remanufacture += 1;
    else recycle += 1;
  });

  return { rows, total: rows.length, analyzed, reuse, remanufacture, recycle };
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const packs = await api.listPacks();

      const settled = await Promise.allSettled(
        packs.map((p) => api.getPack(p.pack_id))
      );

      const rows = packs.map((pack, i) => {
        const res = settled[i];
        return toRow(pack, res.status === "fulfilled" ? res.value : null);
      });

      // 최근 분석/등록 순으로 정렬
      rows.sort((a, b) => {
        const at = a.analyzedAt ?? a.pack.registered_at;
        const bt = b.analyzedAt ?? b.pack.registered_at;
        return new Date(bt).getTime() - new Date(at).getTime();
      });

      setData(aggregate(rows));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setData(EMPTY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load, setError };
}
