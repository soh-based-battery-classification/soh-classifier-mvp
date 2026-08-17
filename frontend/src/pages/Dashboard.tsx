import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { Pack } from "../types";

export default function Dashboard() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function loadPacks() {
    setLoading(true);
    return api
      .listPacks()
      .then(setPacks)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadPacks();
  }, []);

  async function handleDelete(packId: string) {
    if (!confirm(`'${packId}' 팩을 삭제할까요? 사이클 로그/예측 이력도 함께 삭제됩니다.`)) {
      return;
    }
    setError(null);
    setDeletingId(packId);
    try {
      await api.deletePack(packId);
      await loadPacks();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <h1>배터리 팩 대시보드</h1>
      {loading && <p className="hint-text">불러오는 중...</p>}
      {error && <p className="error-text">{error}</p>}

      <div className="card">
        {packs.length === 0 && !loading ? (
          <p className="hint-text">
            등록된 팩이 없습니다. <Link to="/register">팩 등록</Link>부터 시작하세요.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Pack ID</th>
                <th>모델명</th>
                <th>정격 용량 (Ah)</th>
                <th>등록일</th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {packs.map((p) => (
                <tr key={p.pack_id}>
                  <td>{p.pack_id}</td>
                  <td>{p.model_name}</td>
                  <td>{p.rated_capacity}</td>
                  <td>{new Date(p.registered_at).toLocaleString()}</td>
                  <td>
                    <Link to={`/packs/${p.pack_id}`}>상세 보기</Link>
                  </td>
                  <td>
                    <button disabled={deletingId === p.pack_id} onClick={() => handleDelete(p.pack_id)}>
                      {deletingId === p.pack_id ? "삭제 중..." : "삭제"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
