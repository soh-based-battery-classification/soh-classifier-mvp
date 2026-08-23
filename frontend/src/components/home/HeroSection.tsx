import { Link } from "react-router-dom";
import { HERO } from "../../content/home";
import type { ServiceStatus } from "../../hooks/useServiceStatus";
import ServiceStatusStrip from "./ServiceStatusStrip";
import SohCurve from "./SohCurve";

interface HeroSectionProps {
  status: ServiceStatus;
}

export default function HeroSection({ status }: HeroSectionProps) {
  const hasPacks = status.packs.count !== null && status.packs.count > 0;

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="container hero__inner">
        <div className="hero__copy">
          <h1 id="hero-title" className="hero__title">
            {HERO.title}
          </h1>

          <p className="hero__sub">{HERO.sub}</p>

          <div className="hero__actions">
            <Link to="/register" className="btn-primary">
              분석 시작
            </Link>
            <Link to="/dashboard" className="btn-ghost">
              {hasPacks ? `등록된 팩 ${status.packs.count}개 보기` : "대시보드 보기"}
            </Link>
          </div>

          <div className="hero__meta">
            {HERO.meta.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        </div>

        <div className="hero__visual">
          <div className="panel">
            <div className="panel__bar">
              <span className="mono-label">SOH 변화 예시</span>
              <span className="panel__bar-spacer" />
              <span className="mono-label">NCM 72Ah</span>
            </div>

            <div className="panel__body">
              <SohCurve />
            </div>

            <div className="panel__readouts">
              <div className="readout">
                <span className="readout__label">사이클</span>
                <span className="readout__value">160</span>
              </div>
              <div className="readout">
                <span className="readout__label">SOH</span>
                <span className="readout__value">81.5%</span>
              </div>
              <div className="readout">
                <span className="readout__label">등급</span>
                <span className="readout__value">B</span>
              </div>
            </div>
          </div>

          <p className="panel__caption">
            사이클이 쌓이면 SOH가 내려가고, 90 · 80 · 70% 선을 지날 때마다 등급이
            바뀝니다.
          </p>
        </div>
      </div>

      <ServiceStatusStrip status={status} />
    </section>
  );
}
