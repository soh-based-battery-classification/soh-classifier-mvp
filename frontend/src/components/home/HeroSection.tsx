import { Link } from "react-router-dom";
import { HERO } from "../../content/home";
import type { ServiceStatus } from "../../hooks/useServiceStatus";
import ServiceStatusStrip from "./ServiceStatusStrip";
import SohCurve from "./SohCurve";

interface HeroSectionProps {
  status: ServiceStatus;
}

export default function HeroSection({ status }: HeroSectionProps) {
  /** 등록된 팩이 있으면 보조 CTA를 대시보드로 바꾼다.
   *  조회 실패(count === null)면 기본 동선을 그대로 유지한다. */
  const hasPacks = status.packs.count !== null && status.packs.count > 0;

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="container hero__inner">
        <div className="hero__copy">
          <p className="eyebrow eyebrow--on-ink">{HERO.eyebrow}</p>

          <h1 id="hero-title" className="hero__title">
            <span className="hero__title-dim">{HERO.titleLead}</span>
            {HERO.titleMain.split("\n").map((line) => (
              <span key={line} className="hero__title-line">
                {line}
              </span>
            ))}
          </h1>

          <p className="hero__sub">{HERO.sub}</p>

          <div className="hero__actions">
            <Link to="/register" className="btn-primary">
              배터리 분석 시작하기
            </Link>

            {hasPacks ? (
              <Link to="/dashboard" className="btn-invert">
                등록된 배터리 {status.packs.count}개 확인하기
              </Link>
            ) : (
              <Link to="/dashboard" className="btn-invert">
                대시보드 보기
              </Link>
            )}
          </div>

          <p className="hero__note">{HERO.note}</p>
        </div>

        <div className="hero__visual">
          <div className="panel">
            <div className="panel__bar">
              <span className="mono-label">PACK-DEMO-01 · NCM 72Ah</span>
              <span className="panel__bar-spacer" />
              <span className="status-dot status-dot--ready" aria-hidden="true" />
              <span className="mono-label">SOH TREND</span>
            </div>

            <div className="panel__body">
              <SohCurve />
            </div>

            <div className="panel__readouts">
              <div className="readout">
                <span className="readout__label">Cycles</span>
                <span className="readout__value">160</span>
              </div>
              <div className="readout">
                <span className="readout__label">예측 SOH</span>
                <span className="readout__value">81.5%</span>
              </div>
              <div className="readout">
                <span className="readout__label">SOH 등급</span>
                <span className="readout__value readout__value--grade-b">B</span>
              </div>
            </div>
          </div>

          <p className="hero__note" aria-hidden="true">
            예시 데이터로 그린 화면입니다
          </p>
        </div>
      </div>

      <ServiceStatusStrip status={status} />
    </section>
  );
}
