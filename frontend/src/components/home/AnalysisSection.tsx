import SectionHeader from "../SectionHeader";
import { ANALYSIS } from "../../content/home";

export default function AnalysisSection() {
  return (
    <section className="home-section home-section--subtle" aria-labelledby="analysis-title">
      <div className="container">
        <div className="reveal">
          <SectionHeader
            title={ANALYSIS.title}
            sub={ANALYSIS.sub}
            titleId="analysis-title"
          />
        </div>

        <div className="steps">
          {ANALYSIS.steps.map((step, i) => (
            <article
              key={step.num}
              className="step-card reveal"
              style={{ ["--reveal-delay" as string]: `${i * 90}ms` }}
            >
              <span className="step-card__num">{step.num}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>

              <ul className="step-card__list">
                {step.specs.map((spec) => (
                  <li key={spec.label}>
                    <span>{spec.label}</span>
                    <b>{spec.value}</b>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="merge-note reveal">
          <p>{ANALYSIS.merge}</p>
        </div>
      </div>
    </section>
  );
}
