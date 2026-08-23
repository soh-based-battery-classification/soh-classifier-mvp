import { useEffect, useState } from "react";
import { api } from "../api";

/**
 * Home 전용 시스템 상태 조회.
 *
 * 이미 api.ts 에 정의돼 있지만 어디서도 쓰이지 않던 세 엔드포인트를 사용한다.
 * 랜딩 페이지이므로 **어떤 요청이 실패해도 페이지는 정상 렌더링**되어야 한다.
 * 따라서 Promise.allSettled 로 각 항목을 독립적으로 처리하고, 실패한 항목만
 * "unknown" 으로 떨어뜨린다.
 */

export type Availability = "loading" | "ready" | "down" | "unknown";

export interface ServiceStatus {
  soh: {
    state: Availability;
    /** "trained_model" | "naive_fallback" — 조회 실패 시 null */
    mode: string | null;
  };
  vision: {
    state: Availability;
  };
  packs: {
    state: Availability;
    count: number | null;
  };
}

const INITIAL: ServiceStatus = {
  soh: { state: "loading", mode: null },
  vision: { state: "loading" },
  packs: { state: "loading", count: null },
};

export function useServiceStatus(): ServiceStatus {
  const [status, setStatus] = useState<ServiceStatus>(INITIAL);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [sohRes, visionRes, packsRes] = await Promise.allSettled([
        api.modelStatus(),
        api.visionModelStatus(),
        api.listPacks(),
      ]);

      if (cancelled) return;

      setStatus({
        soh:
          sohRes.status === "fulfilled"
            ? {
                state: sohRes.value.is_ready ? "ready" : "down",
                mode: sohRes.value.mode ?? null,
              }
            : { state: "unknown", mode: null },
        vision:
          visionRes.status === "fulfilled"
            ? { state: visionRes.value.is_ready ? "ready" : "down" }
            : { state: "unknown" },
        packs:
          packsRes.status === "fulfilled"
            ? { state: "ready", count: packsRes.value.length }
            : { state: "unknown", count: null },
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}
