import type { Availability, ServiceStatus } from "../../hooks/useServiceStatus";

interface ServiceStatusStripProps {
  status: ServiceStatus;
}

function dotClass(state: Availability): string {
  if (state === "ready") return "status-dot status-dot--ready";
  if (state === "down") return "status-dot status-dot--down";
  return "status-dot";
}

function sohText(status: ServiceStatus["soh"]): { text: string; muted: boolean } {
  switch (status.state) {
    case "ready":
      return { text: "사용 가능", muted: false };
    case "down":
      return {
        text:
          status.mode === "naive_fallback"
            ? "추세 연장 방식으로 동작 중"
            : "모델 없음",
        muted: false,
      };
    case "loading":
      return { text: "확인 중", muted: true };
    default:
      return { text: "상태를 불러오지 못했습니다", muted: true };
  }
}

function visionText(state: Availability): { text: string; muted: boolean } {
  switch (state) {
    case "ready":
      return { text: "사용 가능", muted: false };
    case "down":
      return { text: "모델 없음 — 외형 상태 직접 지정", muted: false };
    case "loading":
      return { text: "확인 중", muted: true };
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
        <ul className="status-rail__inner" aria-label="서비스 상태">
          <li className="status-item">
            <span className={dotClass(status.soh.state)} aria-hidden="true" />
            <span className="status-item__text">
              <span className="status-item__label">SOH 예측</span>
              <span
                className={`status-item__value${soh.muted ? " status-item__value--muted" : ""}`}
              >
                {soh.text}
              </span>
            </span>
          </li>

          <li className="status-item">
            <span className={dotClass(status.vision.state)} aria-hidden="true" />
            <span className="status-item__text">
              <span className="status-item__label">이미지 분석</span>
              <span
                className={`status-item__value${vision.muted ? " status-item__value--muted" : ""}`}
              >
                {vision.text}
              </span>
            </span>
          </li>

          <li className="status-item">
            <span className={dotClass(status.packs.state)} aria-hidden="true" />
            <span className="status-item__text">
              <span className="status-item__label">등록된 배터리 팩</span>
              {status.packs.count !== null ? (
                <span className="status-item__value status-item__value--count">
                  {status.packs.count}개
                </span>
              ) : (
                <span className="status-item__value status-item__value--muted">
                  {status.packs.state === "loading" ? "확인 중" : "불러오지 못했습니다"}
                </span>
              )}
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
