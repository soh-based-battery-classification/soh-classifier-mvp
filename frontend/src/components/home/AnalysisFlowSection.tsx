import GradeBadge from "../GradeBadge";
import SectionHeader from "../SectionHeader";
import { FLOW } from "../../content/home";

export default function AnalysisFlowSection() {
  return (
    <section
      className="home-section home-section--subtle"
      aria-labelledby="flow-title"
    >
      <div className="container">
        <div className="reveal">
          <SectionHeader
            eyebrow={FLOW.eyebrow}
            title={FLOW.title}
            sub={FLOW.sub}
            titleId="flow-title"
          />
        </div>

        <div className="flow">
          <div className="flow__branches">
            {FLOW.branches.map((branch, i) => (
              <article
                key={branch.id}
                className={`branch branch--${branch.id} reveal`}
                style={{ ["--reveal-delay" as string]: `${i * 120}ms` }}
                tabIndex={0}
                aria-label={`${branch.tag}: ${branch.title}`}
              >
                <header className="branch__head">
                  <span className="branch__tag">{branch.tag}</span>
                  <h3>{branch.title}</h3>
                </header>

                <ol className="branch__steps">
                  {branch.steps.map((step) => (
                    <li key={step.title} className="branch__step">
                      <span className="branch__step-title">{step.title}</span>
                      <span className="branch__step-desc">{step.desc}</span>
                      <span className="branch__step-meta">{step.meta}</span>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>

          {/* 두 갈래가 하나로 합류하는 커넥터 */}
          <div className="flow__merge reveal" aria-hidden="true">
            <svg viewBox="0 0 100 56" preserveAspectRatio="none">
              <path d="M25 0 V22 Q25 34 37 34 H50" vectorEffect="non-scaling-stroke" />
              <path d="M75 0 V22 Q75 34 63 34 H50" vectorEffect="non-scaling-stroke" />
              <path d="M50 34 V56" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>

          <div className="flow__outcome reveal">
            <div className="flow__outcome-main">
              <p className="eyebrow eyebrow--on-ink">Final grade</p>
              <h3>{FLOW.outcome.title}</h3>
              <p>{FLOW.outcome.body}</p>
              <p className="flow__gate">
                <span className="status-dot status-dot--ready" aria-hidden="true" />
                {FLOW.outcome.gate}
              </p>
            </div>

            <div className="flow__outcome-badges" aria-hidden="true">
              <GradeBadge grade="A" />
              <GradeBadge grade="B" />
              <GradeBadge grade="C" />
              <GradeBadge grade="D" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
