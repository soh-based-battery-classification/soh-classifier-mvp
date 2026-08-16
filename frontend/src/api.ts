import type { CycleLog, FinalState, Pack, PackDetail, Prediction, VisualSeverity } from "./types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `요청 실패: ${res.status}`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json();
}

async function requestFile<T>(path: string, file: File, method = "POST"): Promise<T> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE_URL}${path}`, { method, body: formData });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `요청 실패: ${res.status}`);
  }
  return res.json();
}

export const api = {
  listPacks: () => request<Pack[]>("/api/packs"),

  createPack: (payload: { pack_id: string; model_name: string; rated_capacity: number }) =>
    request<Pack>("/api/packs", { method: "POST", body: JSON.stringify(payload) }),

  getPack: (packId: string) => request<PackDetail>(`/api/packs/${packId}`),

  deletePack: (packId: string) => request<void>(`/api/packs/${packId}`, { method: "DELETE" }),

  addCycleLog: (
    packId: string,
    payload: { cycle_index: number; soh_percent?: number; capacity_ah?: number }
  ) =>
    request<CycleLog>(`/api/packs/${packId}/cycles`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  deleteCycleLog: (packId: string, cycleLogId: number) =>
    request<void>(`/api/packs/${packId}/cycles/${cycleLogId}`, { method: "DELETE" }),

  uploadCyclesCsv: (packId: string, file: File) =>
    requestFile<CycleLog[]>(`/api/packs/${packId}/cycles/bulk`, file),

  predictSoh: (packId: string) =>
    request<Prediction>(`/api/packs/${packId}/predict`, { method: "POST" }),

  setVisualSeverity: (packId: string, visual_severity: VisualSeverity) =>
    request<FinalState>(`/api/packs/${packId}/visual-severity`, {
      method: "PUT",
      body: JSON.stringify({ visual_severity }),
    }),

  modelStatus: () => request<{ is_ready: boolean; mode: string; model_dir: string }>(
    "/api/packs/_model/status"
  ),
};
