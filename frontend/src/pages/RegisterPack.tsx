import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

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
    <div style={{ maxWidth: "var(--container-narrow)", margin: "0 auto" }}>
      <div className="page-header">
        <div>
          <p className="eyebrow">새 팩 등록</p>
          <h1 className="page-header__title">배터리 팩 등록</h1>
          <p className="hint-text">
            SOH 예측 및 등급 산출을 진행할 새 배터리 팩의 기본 정보를 입력하세요.
          </p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="stack-form">
          <div className="field">
            <label htmlFor="pack-id">Pack ID</label>
            <input
              id="pack-id"
              type="text"
              placeholder="예: PACK-001"
              value={packId}
              onChange={(e) => setPackId(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="model-name">모델명</label>
            <input
              id="model-name"
              type="text"
              placeholder="예: NCM 72Ah"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="rated-capacity">정격 용량 (Ah)</label>
            <input
              id="rated-capacity"
              type="number"
              step="0.01"
              value={ratedCapacity}
              onChange={(e) => setRatedCapacity(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
            style={{ width: "100%" }}
          >
            {submitting ? "등록 중..." : "팩 등록 완료"}
          </button>
        </form>

        {error && (
          <p className="alert-error" style={{ marginTop: "var(--space-4)", marginBottom: 0 }}>
            ⚠️ {error}
          </p>
        )}
      </div>
    </div>
  );
}
