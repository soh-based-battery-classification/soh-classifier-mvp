import { Link } from "react-router-dom";
import GradeBadge from "../components/GradeBadge";

const PAIN_POINTS = [
  {
    n: "01",
    title: "육안으로만 판단하는 폐배터리 등급",
    body: "재사용해도 되는 팩인지, 재제조로 보내야 하는지 담당자 감으로 판단하고 있지 않나요.",
  },
  {
    n: "02",
    title: "같은 스펙인데 등급이 들쭉날쭉",
    body: "SOH는 측정했는데, 등급 기준이 사람마다 달라서 결과가 매번 다르게 나옵니다.",
  },
  {
    n: "03",
    title: "사이클 로그와 외형 상태가 따로 논다",
    body: "충방전 데이터는 쌓이는데, 외형 사진과 한 화면에서 같이 보는 곳이 없습니다.",
  },
];

const USAGE = [
  {
    title: "사이클 로그 직접 입력",
    body: "cycle_index와 SOH(%) 또는 용량(Ah)만 있으면 하나씩 바로 등록할 수 있어요.",
  },
  {
    title: "CSV 일괄 업로드",
    body: "이미 쌓아둔 사이클 로그가 있다면 CSV로 한 번에 올려서 채울 수 있어요.",
  },
  {
    title: "외형 사진 업로드",
    body: "사진 한 장이면 부품 탐지부터 등급 오버라이드까지 자동으로 이어져요.",
  },
];

const FEATURES = [
  { n: "01", title: "SOH 예측", body: "NLinear 모델이 사이클 이력을 보고 다음 사이클의 SOH(%)를 예측해요." },
  { n: "02", title: "등급 오버라이드 근거", body: "외형 심각도(OK/MODERATE/CRITICAL)에 따라 등급이 왜 바뀌었는지 매트릭스로 보여줘요." },
  { n: "03", title: "부품 자동 탐지", body: "YOLO가 사진 속 프레임·모듈·버스바·나사류 같은 부품을 자동으로 찾아줘요." },
  { n: "04", title: "팩별 이력 관리", body: "팩마다 사이클 로그·예측·최종 등급 이력을 한 화면에서 확인해요." },
  { n: "05", title: "전체 대시보드", body: "등록된 모든 팩과 등급을 대시보드에서 한눈에 검색·조회해요." },
];

const STEPS = [
  "팩 정보 입력",
  "사이클 로그 등록",
  "SOH 예측 실행",
  "외형 사진으로 등급 확정",
];

export default function Home() {
  return (
    <div className="home">
      <section className="hero">
        <p className="hero-eyebrow">SOH Classifier</p>
        <h1>폐배터리 등급, 감이 아니라 데이터로 매깁니다</h1>
        <p className="hero-sub">
          사이클 로그와 외형 사진만 넣으면, AI가 SOH를 예측하고 A/B/C/D 등급까지 자동으로 산출합니다.
        </p>

        <div className="hero-demo card">
          <div className="hero-demo-input">
            <span className="hero-demo-icon">🔋</span>
            <span className="hero-demo-placeholder">PACK-001 · NCM 72Ah 팩 ID 입력...</span>
          </div>
          <div className="hero-demo-tags">
            <span className="tag">사이클 로그 기반 SOH 예측</span>
            <span className="tag">외형 사진 기반 등급 오버라이드</span>
            <span className="tag">등급별 재사용/재제조/재활용 분류</span>
          </div>
        </div>

        <div className="hero-actions">
          <Link to="/register" className="btn-primary">
            팩 등록하러 가기
          </Link>
          <Link to="/dashboard" className="btn-ghost">
            대시보드 보기
          </Link>
        </div>
      </section>

      <section className="section">
        <p className="section-eyebrow">흔한 상황</p>
        <h2>이런 적, 있지 않나요?</h2>
        <div className="grid-3">
          {PAIN_POINTS.map((p) => (
            <div className="card pain-card" key={p.n}>
              <span className="pain-n">{p.n}</span>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <p className="section-eyebrow">이용 방법</p>
        <h2>데이터는 어떻게 넣어도 상관없어요</h2>
        <p className="section-sub">직접 입력이든, CSV든, 사진이든 — 등급 산출은 서비스가 알아서 합니다.</p>
        <div className="grid-3">
          {USAGE.map((u) => (
            <div className="card" key={u.title}>
              <h3>{u.title}</h3>
              <p>{u.body}</p>
            </div>
          ))}
        </div>

        <div className="card steps-card">
          {STEPS.map((s, i) => (
            <div className="step" key={s}>
              <span className="step-n">{i + 1}</span>
              <span>{s}</span>
              {i < STEPS.length - 1 && <span className="step-arrow">→</span>}
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <p className="section-eyebrow">제공 기능</p>
        <h2>팩 하나면, 등급 산출까지 자동</h2>
        <p className="section-sub">등록만 하면 예측부터 등급 확정까지 전부 이어집니다.</p>
        <div className="grid-3">
          {FEATURES.map((f) => (
            <div className="card feature-card" key={f.n}>
              <span className="pain-n">{f.n}</span>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section preview-section">
        <p className="section-eyebrow">실제 동작 미리보기</p>
        <h2>등급은 이렇게 표시됩니다</h2>
        <div className="card preview-card">
          <div className="preview-row">
            <span>SOH 예측 등급</span>
            <GradeBadge grade="B" />
          </div>
          <div className="preview-row">
            <span>외형 CRITICAL 오버라이드 후 최종 등급</span>
            <GradeBadge grade="D" />
          </div>
          <p className="hint-text">
            SOH 등급이 B여도, 외형 탐지 결과가 CRITICAL이면 최종 등급은 D(재활용 대상)로 낮아집니다.
          </p>
        </div>
      </section>

      <section className="cta card">
        <h2>지금 바로 시작하세요</h2>
        <p>팩 하나를 등록하면 시작됩니다. 이후 사이클 로그를 추가하거나 사진을 올려 자동으로 등급을 산출하세요.</p>
        <Link to="/register" className="btn-primary">
          팩 등록하러 가기
        </Link>
      </section>

      <footer className="home-footer">
        <p className="hint-text">SOH Classifier</p>
        <p className="hint-text">
          SOH 예측은 NLinear 모델 기반 추정치이며 실측값과 다를 수 있습니다. 외형 등급은 부품 탐지 결과에 대한
          임시 규칙 기반이며, 실제 손상 판정을 대체하지 않습니다.
        </p>
      </footer>
    </div>
  );
}
