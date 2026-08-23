import { useState } from "react";
import { Link } from "react-router-dom";
import GradeBadge from "../components/GradeBadge";
import { api } from "../api";
import { SEVERITY_LABEL } from "../content/home";
import { useDashboardData } from "../hooks/useDashboardData";
import type { PackRow } from "../hooks/useDashboardData";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function severityClass(row: PackRow): string {
  switch (row.visualSeverity) {
    case "OK":
      return "chip chip--ok";
    case "MODERATE":
      return "chip chip--moderate";
    case "CRITICAL":
      return "chip chip--critical";
    default:
      return "chip";
  }
}

export default function Dashboard() {
  const { data, loading, error, reload, setError } = useDashboardData();
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(packId: string) {
    if (!confirm(`'${packId}' 팩을 삭제할까요? 사이클 로그와 분석 이력도 함께 삭제됩니다.`)) {
      return;
    }
    setError(null);
    setDeletingId(packId);
    try {
      await api.deletePack(packId);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeletingId(null);
    }
  }

  const rows = data.rows.filter((row) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      row.pack.pack_id.toLowerCase().includes(q) ||
      row.pack.model_name.toLowerCase().includes(q)
    );
  });

  const pending = data.total - data.analyzed;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-header__title">대시보드</h1>
          <p className="hint-text">등록된 배터리 팩의 분석 현황을 확인합니다.</p>
        </div>
        <div className="page-header__actions">
          <button type="button" className="btn-ghost btn-sm" onClick={reload} disabled={loading}>
            {loading ? "불러오는 중" : "새로고침"}
          </button>
          <Link to="/register" className="btn-primary btn-sm">
            팩 등록
          </Link>
        </div>
      </div>

      {error && <p className="alert-error">{error}</p>}

      {/* --- 현황 요약 --------------------------------------------------- */}
      <section className="metrics" aria-label="분석 현황 요약">
        <div className="metric">
          <span className="metric__label">전체 팩</span>
          <span className="metric__value">{data.total}</span>
          <span className="metric__foot">분석 완료 {data.analyzed} · 대기 {pending}</span>
        </div>
        <div className="metric">
          <span className="metric__label">재사용</span>
          <span className="metric__value metric__value--a">{data.reuse}</span>
          <span className="metric__foot">A · B 등급</span>
        </div>
        <div className="metric">
          <span className="metric__label">재제조</span>
          <span className="metric__value metric__value--c">{data.remanufacture}</span>
          <span className="metric__foot">C 등급</span>
        </div>
        <div className="metric">
          <span className="metric__label">재활용</span>
          <span className="metric__value metric__value--d">{data.recycle}</span>
          <span className="metric__foot">D 등급</span>
        </div>
      </section>

      {/* --- 분석 결과 --------------------------------------------------- */}
      <section className="card" aria-label="분석 결과 목록">
        <div className="card__head">
          <div>
            <h2 className="card__title">분석 결과</h2>
            <p className="hint-text">최근에 분석된 팩부터 표시합니다.</p>
          </div>
          <input
            type="search"
            className="card__search"
            placeholder="Pack ID 또는 모델명"
            aria-label="Pack ID 또는 모델명 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Pack ID</th>
                <th scope="col">모델</th>
                <th scope="col">SOH</th>
                <th scope="col">이미지 분석</th>
                <th scope="col">최종 등급</th>
                <th scope="col">분석일</th>
                <th scope="col" className="cell-right">
                  관리
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.pack.pack_id}>
                  <td>
                    <Link to={`/packs/${row.pack.pack_id}`} className="table-link">
                      {row.pack.pack_id}
                    </Link>
                  </td>
                  <td className="hint-text">{row.pack.model_name}</td>
                  <td className="num">
                    {row.sohPercent !== null ? (
                      `${row.sohPercent.toFixed(1)}%`
                    ) : (
                      <span className="text-muted">미예측</span>
                    )}
                  </td>
                  <td>
                    <span className={severityClass(row)}>
                      {SEVERITY_LABEL[row.visualSeverity]}
                    </span>
                  </td>
                  <td>
                    {row.finalGrade ? (
                      <span className="cell-grade">
                        <GradeBadge grade={row.finalGrade} />
                        <span className="hint-text">{row.finalState}</span>
                      </span>
                    ) : (
                      <span className="text-muted">대기</span>
                    )}
                  </td>
                  <td className="num text-muted">{formatDate(row.analyzedAt)}</td>
                  <td className="cell-right">
                    <button
                      className="btn-danger-quiet"
                      disabled={deletingId === row.pack.pack_id}
                      onClick={() => handleDelete(row.pack.pack_id)}
                    >
                      {deletingId === row.pack.pack_id ? "삭제 중" : "삭제"}
                    </button>
                  </td>
                </tr>
              ))}

              {loading && data.total === 0 && (
                <tr>
                  <td colSpan={7} className="empty-cell">
                    불러오는 중입니다.
                  </td>
                </tr>
              )}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-cell">
                    {query ? (
                      "검색 결과가 없습니다."
                    ) : (
                      <>
                        등록된 팩이 없습니다.{" "}
                        <Link to="/register">첫 배터리 팩을 등록</Link>하면 여기에
                        표시됩니다.
                      </>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
