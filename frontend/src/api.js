const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
async function request(path, options) {
    const res = await fetch(`${BASE_URL}${path}`, {
        headers: { "Content-Type": "application/json" },
        ...options,
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? `요청 실패: ${res.status}`);
    }
    if (res.status === 204) {
        return undefined;
    }
    return res.json();
}
async function requestFile(path, file, method = "POST") {
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
    listPacks: () => request("/api/packs"),
    createPack: (payload) => request("/api/packs", { method: "POST", body: JSON.stringify(payload) }),
    getPack: (packId) => request(`/api/packs/${packId}`),
    deletePack: (packId) => request(`/api/packs/${packId}`, { method: "DELETE" }),
    addCycleLog: (packId, payload) => request(`/api/packs/${packId}/cycles`, {
        method: "POST",
        body: JSON.stringify(payload),
    }),
    deleteCycleLog: (packId, cycleLogId) => request(`/api/packs/${packId}/cycles/${cycleLogId}`, { method: "DELETE" }),
    uploadCyclesCsv: (packId, file) => requestFile(`/api/packs/${packId}/cycles/bulk`, file),
    predictSoh: (packId) => request(`/api/packs/${packId}/predict`, { method: "POST" }),
    setVisualSeverity: (packId, visual_severity) => request(`/api/packs/${packId}/visual-severity`, {
        method: "PUT",
        body: JSON.stringify({ visual_severity }),
    }),
    modelStatus: () => request("/api/packs/_model/status"),
};
