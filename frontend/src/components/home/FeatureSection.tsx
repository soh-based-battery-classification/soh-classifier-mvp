import SectionHeader from "../SectionHeader";
import { CAPABILITY } from "../../content/home";

export default function FeatureSection() {
  return (
    <section className="home-section" aria-labelledby="capability-title">
      <div className="container">
        <div className="reveal">
          <SectionHeader
            eyebrow={CAPABILITY.eyebrow}
            title={CAPABILITY.title}
            sub={CAPABILITY.sub}
            titleId="capability-title"
          />
        </div>

        <div className="capability__grid">
          {CAPABILITY.cards.map((card, i) => (
            <article
              key={card.kicker}
              className="capability-card reveal"
              style={{ ["--reveal-delay" as string]: `${i * 100}ms` }}
            >
              <span className="capability-card__kicker">{card.kicker}</span>
              <h3>{card.title}</h3>
              <p>{card.body}</p>

              <ul className="capability-card__specs">
                {card.specs.map((spec) => (
                  <li key={spec.label}>
                    <span>{spec.label}</span>
                    <b>{spec.value}</b>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
