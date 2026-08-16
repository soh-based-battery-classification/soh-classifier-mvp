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
    <div>
      <h1>배터리 팩 등록</h1>
      <div className="card">
        <form className="inline-form" onSubmit={handleSubmit}>
          <label>
            Pack ID
            <input value={packId} onChange={(e) => setPackId(e.target.value)} required />
          </label>
          <label>
            모델명
            <input value={modelName} onChange={(e) => setModelName(e.target.value)} required />
          </label>
          <label>
            정격 용량 (Ah)
            <input
              type="number"
              step="0.01"
              value={ratedCapacity}
              onChange={(e) => setRatedCapacity(e.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={submitting}>
            {submitting ? "등록 중..." : "등록"}
          </button>
        </form>
        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  );
}
