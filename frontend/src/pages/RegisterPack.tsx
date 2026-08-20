import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import "../index.css";

export default function RegisterPack() {
  const navigate = useNavigate();
  const [packId, setPackId] = useState("");
  const [modelName, setModelName] = useState("");
  const [ratedCapacity, setRatedCapacity] = useState("2.0");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.createPack({
        pack_id: packId,
        model_name: modelName,
        rated_capacity: parseFloat(ratedCapacity),
      });
      navigate(`/packs/${packId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="section" style={{ maxWidth: "600px", margin: "0 auto" }}>
      <p className="section-eyebrow">새 팩 등록</p>
      <h2>배터리 팩 등록</h2>
      <p className="section-sub">
        SOH 예측 및 등급 산출을 진행할 새 배터리 팩의 기본 정보를 입력하세요.
      </p>

      <div className="card" style={{ marginTop: "1.5rem" }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: "600" }}>
              Pack ID
            </label>
            <input
              type="text"
              placeholder="예: PACK-001"
              value={packId}
              onChange={(e) => setPackId(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                boxSizing: "border-box"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: "600" }}>
              모델명
            </label>
            <input
              type="text"
              placeholder="예: NCM 72Ah"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                boxSizing: "border-box"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.4rem", fontWeight: "600" }}>
              정격 용량 (Ah)
            </label>
            <input
              type="number"
              step="0.01"
              value={ratedCapacity}
              onChange={(e) => setRatedCapacity(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                boxSizing: "border-box"
              }}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
            style={{ marginTop: "0.5rem", width: "100%", padding: "0.8rem", cursor: submitting ? "not-allowed" : "pointer" }}
          >
            {submitting ? "등록 중..." : "팩 등록 완료"}
          </button>
        </form>

        {error && (
          <p className="hint-text" style={{ color: "#ef4444", marginTop: "1rem", fontWeight: "500" }}>
            ⚠️ {error}
          </p>
        )}
      </div>
    </div>
  );
}