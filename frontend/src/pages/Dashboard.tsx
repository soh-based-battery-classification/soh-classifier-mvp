import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { Pack } from "../types";
import "../index.css";

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
    <div style={{ maxWidth: "1000px", margin: "0 auto", paddingBottom: "3rem" }}>
      {/* 헤더 섹션 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <p className="section-eyebrow" style={{ margin: 0 }}>Dashboard</p>
          <h1 style={{ margin: "0.2rem 0" }}>배터리 팩 대시보드</h1>
          <p className="hint-text">
            등록된 모든 배터리 팩의 정보와 이력을 조회하고 관리합니다.
          </p>
        </div>
        <Link to="/register" className="btn-primary" style={{ textDecoration: "none" }}>
          + 새 팩 등록
        </Link>
      </div>

      {error && (
        <p className="hint-text" style={{ color: "#ef4444", marginBottom: "1rem" }}>
          ⚠️ {error}
        </p>
      )}

      {/* 검색 및 새로고침 카드 */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Pack ID 또는 모델명 검색..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: "1",
              minWidth: "240px",
              padding: "0.75rem",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              boxSizing: "border-box"
            }}
          />
          <button 
            type="button" 
            onClick={loadPacks} 
            disabled={loading}
            style={{ padding: "0.75rem 1.2rem", borderRadius: "8px", cursor: "pointer" }}
          >
            {loading ? "불러오는 중..." : "새로고침"}
          </button>
        </div>
      </div>

      {/* 팩 목록 테이블 카드 */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0 }}>등록 목록 ({filteredPacks.length})</h2>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
              <th style={{ padding: "0.75rem" }}>Pack ID</th>
              <th style={{ padding: "0.75rem" }}>모델명</th>
              <th style={{ padding: "0.75rem" }}>정격 용량 (Ah)</th>
              <th style={{ padding: "0.75rem" }}>등록일</th>
              <th style={{ padding: "0.75rem" }}></th>
              <th style={{ padding: "0.75rem", textAlign: "right" }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {filteredPacks.map((p) => (
              <tr key={p.pack_id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "0.75rem", fontWeight: "600" }}>
                  <Link to={`/packs/${p.pack_id}`} style={{ color: "#2563eb", textDecoration: "none" }}>
                    {p.pack_id}
                  </Link>
                </td>
                <td style={{ padding: "0.75rem" }}>{p.model_name}</td>
                <td style={{ padding: "0.75rem" }}>{p.rated_capacity} Ah</td>
                <td style={{ padding: "0.75rem", fontSize: "0.9rem", color: "#64748b" }}>
                  {new Date(p.registered_at).toLocaleString()}
                </td>
                <td style={{ padding: "0.75rem" }}>
                  <Link 
                    to={`/packs/${p.pack_id}`} 
                    style={{ 
                      padding: "0.4rem 0.8rem", 
                      backgroundColor: "#f1f5f9", 
                      borderRadius: "6px", 
                      color: "#334155", 
                      textDecoration: "none", 
                      fontSize: "0.85rem",
                      fontWeight: "500" 
                    }}
                  >
                    상세 보기 →
                  </Link>
                </td>
                <td style={{ padding: "0.75rem", textAlign: "right" }}>
                  <button 
                    disabled={deletingId === p.pack_id} 
                    onClick={() => handleDelete(p.pack_id)}
                    style={{
                      backgroundColor: "transparent",
                      color: "#ef4444",
                      border: "none",
                      cursor: deletingId === p.pack_id ? "not-allowed" : "pointer",
                      fontWeight: "500"
                    }}
                  >
                    {deletingId === p.pack_id ? "삭제 중..." : "삭제"}
                  </button>
                </td>
              </tr>
            ))}

            {!loading && filteredPacks.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
                  {query ? (
                    "검색 결과와 일치하는 배터리 팩이 없습니다."
                  ) : (
                    <>
                      등록된 팩이 없습니다. <Link to="/register" style={{ color: "#2563eb" }}>팩 등록</Link>부터 시작하세요.
                    </>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}