import SectionHeader from "../SectionHeader";
import { INTAKE, MODEL_SPEC } from "../../content/home";

export default function UsageSection() {
  return (
    <section
      className="home-section home-section--tight home-section--subtle"
      aria-labelledby="intake-title"
    >
      <div className="container">
        <div className="reveal">
          <SectionHeader
            eyebrow={INTAKE.eyebrow}
            title={INTAKE.title}
            sub={INTAKE.sub}
            titleId="intake-title"
          />
        </div>

        <div className="intake__grid">
          {INTAKE.cards.map((card, i) => (
            <article
              key={card.title}
              className="intake-card reveal"
              style={{ ["--reveal-delay" as string]: `${i * 80}ms` }}
            >
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>

        <p className="intake__note reveal">
          SOH 예측에는 사이클 로그가 최소 <code>{MODEL_SPEC.soh.seqLen}</code>개
          필요합니다. 학습된 모델의 입력 길이가{" "}
          <code>seq_len = {MODEL_SPEC.soh.seqLen}</code> 이기 때문입니다.
        </p>
      </div>
    </section>
  );
}
