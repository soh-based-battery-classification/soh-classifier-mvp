import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { Pack } from "../types";

export default function Dashboard() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [query, setQuery] = useState("");
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

  const filteredPacks = packs.filter((p) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      p.pack_id.toLowerCase().includes(q) ||
      p.model_name.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="page-header__title">배터리 팩 대시보드</h1>
          <p className="hint-text">
            등록된 모든 배터리 팩의 정보와 이력을 조회하고 관리합니다.
          </p>
        </div>
        <Link to="/register" className="btn-primary">
          + 새 팩 등록
        </Link>
      </div>

      {error && <p className="alert-error">⚠️ {error}</p>}

      <div className="card">
        <div className="toolbar">
          <input
            type="text"
            className="toolbar__grow"
            placeholder="Pack ID 또는 모델명 검색..."
            aria-label="Pack ID 또는 모델명 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="button" onClick={loadPacks} disabled={loading}>
            {loading ? "불러오는 중..." : "새로고침"}
          </button>
        </div>
      </div>

      <div className="card">
        <h2>등록 목록 ({filteredPacks.length})</h2>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Pack ID</th>
                <th scope="col">모델명</th>
                <th scope="col">정격 용량 (Ah)</th>
                <th scope="col">등록일</th>
                <th scope="col"></th>
                <th scope="col" style={{ textAlign: "right" }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredPacks.map((p) => (
                <tr key={p.pack_id}>
                  <td style={{ fontWeight: 600 }}>
                    <Link to={`/packs/${p.pack_id}`}>{p.pack_id}</Link>
                  </td>
                  <td>{p.model_name}</td>
                  <td className="num">{p.rated_capacity} Ah</td>
                  <td className="hint-text">
                    {new Date(p.registered_at).toLocaleString()}
                  </td>
                  <td>
                    <Link to={`/packs/${p.pack_id}`} className="btn-ghost btn-sm">
                      상세 보기 →
                    </Link>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="btn-danger-quiet"
                      disabled={deletingId === p.pack_id}
                      onClick={() => handleDelete(p.pack_id)}
                    >
                      {deletingId === p.pack_id ? "삭제 중..." : "삭제"}
                    </button>
                  </td>
                </tr>
              ))}

              {!loading && filteredPacks.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-cell">
                    {query ? (
                      "검색 결과와 일치하는 배터리 팩이 없습니다."
                    ) : (
                      <>
                        등록된 팩이 없습니다. <Link to="/register">팩 등록</Link>부터
                        시작하세요.
                      </>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
