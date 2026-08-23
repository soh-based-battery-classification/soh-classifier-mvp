import type { Availability, ServiceStatus } from "../../hooks/useServiceStatus";

interface ServiceStatusStripProps {
  status: ServiceStatus;
}

function dotClass(state: Availability): string {
  if (state === "ready") return "status-dot status-dot--ready";
  if (state === "down") return "status-dot status-dot--down";
  return "status-dot";
}

/** SOH 예측 모델 상태 문구. mode 는 백엔드가 내려주는 값을 그대로 해석한다. */
function sohText(status: ServiceStatus["soh"]): { text: string; muted: boolean } {
  switch (status.state) {
    case "ready":
      return { text: "학습된 모델로 예측 중", muted: false };
    case "down":
      return {
        text:
          status.mode === "naive_fallback"
            ? "추세 연장 방식으로 대체 동작 중"
            : "모델 미탑재",
        muted: false,
      };
    case "loading":
      return { text: "상태 확인 중", muted: true };
    default:
      return { text: "상태를 불러오지 못했습니다", muted: true };
  }
}

function visionText(state: Availability): { text: string; muted: boolean } {
  switch (state) {
    case "ready":
      return { text: "손상 탐지 준비됨", muted: false };
    case "down":
      return { text: "모델 미탑재 — 심각도 직접 지정 가능", muted: false };
    case "loading":
      return { text: "상태 확인 중", muted: true };
    default:
      return { text: "상태를 불러오지 못했습니다", muted: true };
  }
}

export default function ServiceStatusStrip({ status }: ServiceStatusStripProps) {
  const soh = sohText(status.soh);
  const vision = visionText(status.vision.state);

  return (
    <div className="status-rail">
      <div className="container">
        <ul className="status-rail__inner" aria-label="서비스 동작 상태">
          <li className="status-item">
            <span className={dotClass(status.soh.state)} aria-hidden="true" />
            <span className="status-item__text">
              <span className="status-item__label">SOH Prediction</span>
              <span
                className={`status-item__value${
                  soh.muted ? " status-item__value--muted" : ""
                }`}
              >
                {soh.text}
              </span>
            </span>
          </li>

          <li className="status-item">
            <span className={dotClass(status.vision.state)} aria-hidden="true" />
            <span className="status-item__text">
              <span className="status-item__label">Damage Detection</span>
              <span
                className={`status-item__value${
                  vision.muted ? " status-item__value--muted" : ""
                }`}
              >
                {vision.text}
              </span>
            </span>
          </li>

          <li className="status-item">
            <span className={dotClass(status.packs.state)} aria-hidden="true" />
            <span className="status-item__text">
              <span className="status-item__label">Registered Packs</span>
              {status.packs.count !== null ? (
                <span className="status-item__value status-item__value--count">
                  {status.packs.count}
                  <span className="status-item__meta"> 개 등록됨</span>
                </span>
              ) : (
                <span className="status-item__value status-item__value--muted">
                  {status.packs.state === "loading"
                    ? "상태 확인 중"
                    : "목록을 불러오지 못했습니다"}
                </span>
              )}
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
