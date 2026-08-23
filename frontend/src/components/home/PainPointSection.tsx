import { PROBLEM } from "../../content/home";

export default function PainPointSection() {
  return (
    <section
      className="home-section problem"
      aria-labelledby="problem-title"
    >
      <div className="container problem__grid">
        <div className="problem__statement reveal">
          <p className="eyebrow">{PROBLEM.eyebrow}</p>
          <h2 id="problem-title" className="problem__headline">
            {PROBLEM.headline.line1}
            <br />
            {PROBLEM.headline.line2Pre}
            <em>{PROBLEM.headline.line2Em}</em>
            {PROBLEM.headline.line2Post}
          </h2>
          <p className="problem__lead">{PROBLEM.lead}</p>
        </div>

        <ul className="problem__list">
          {PROBLEM.items.map((item, i) => (
            <li
              key={item.index}
              className="problem__item reveal"
              style={{ ["--reveal-delay" as string]: `${i * 90}ms` }}
            >
              <span className="problem__index">{item.index}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
