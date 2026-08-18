import { Link, useLocation, useParams } from "react-router-dom";
import GradeBadge from "../components/GradeBadge";
import type { DetectionResult, PackDetail } from "../types";

interface LocationState {
  detail: PackDetail;
  detection: DetectionResult | null;
}

export default function PackResult() {
  const { packId } = useParams<{ packId: string }>();
  const location = useLocation();
  const state = location.state as LocationState | null;

  if (!state?.detail) {
    return (
      <div className="card">
        <p className="hint-text">
          요약 정보가 없습니다 (새로고침했거나 직접 접속한 경우). {" "}
          <Link to={`/packs/${packId}`}>팩 상세로 돌아가기</Link>
        </p>
      </div>
    );
  }

  const { detail, detection } = state;
  const { pack, final_state, predictions, cycle_logs } = detail;
  const latestPrediction = predictions[0];
  const latestCycle = cycle_logs[cycle_logs.length - 1];
  const detectedClasses = detection ? [...new Set(detection.objects.map((o) => o.class_name))] : [];

  return (
    <div className="result-page">
      <div className="card result-hero">
        <p className="hint-text">
          {pack.pack_id} · {pack.model_name}
        </p>
        <h1>최종 등급이 확정됐습니다</h1>
        <div className="result-grade-badge">
          <GradeBadge grade={final_state?.final_grade} />
        </div>
        <p className="result-state">{final_state?.final_state}</p>
      </div>

      <div className="card">
        <h2>분석 요약</h2>
        <dl className="result-summary">
          <div>
            <dt>SOH 등급 → 최종 등급</dt>
            <dd>
              <GradeBadge grade={final_state?.soh_grade} /> → <GradeBadge grade={final_state?.final_grade} />
            </dd>
          </div>
          <div>
            <dt>SOH 예측</dt>
            <dd>
              {latestPrediction
                ? `${latestPrediction.predicted_soh.toFixed(2)}% (모델: ${latestPrediction.model_version})`
                : "예측 이력 없음"}
            </dd>
          </div>
          <div>
            <dt>사이클 이력</dt>
            <dd>
              {cycle_logs.length}개
              {latestCycle ? ` · 최근 측정 SOH ${latestCycle.soh_percent.toFixed(2)}%` : ""}
            </dd>
          </div>
          <div>
            <dt>외형 판정</dt>
            <dd>{final_state?.visual_severity ?? "PENDING"}</dd>
          </div>
          {detection && (
            <div>
              <dt>탐지된 부품</dt>
              <dd>
                {detection.objects.length}개
                {detectedClasses.length > 0 ? ` (${detectedClasses.join(", ")})` : " (탐지 없음)"}
              </dd>
            </div>
          )}
          <div>
            <dt>등급 확정 시각</dt>
            <dd>{final_state?.decided_at ? new Date(final_state.decided_at).toLocaleString() : "-"}</dd>
          </div>
        </dl>
      </div>

      <div className="hero-actions">
        <Link to={`/packs/${packId}`} className="btn-primary">
          팩 상세로 돌아가기
        </Link>
        <Link to="/dashboard" className="btn-ghost">
          대시보드로
        </Link>
      </div>
    </div>
  );
}
