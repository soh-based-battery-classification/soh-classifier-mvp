import { Link } from "react-router-dom";
import { CLOSING } from "../../content/home";

export default function CtaSection() {
  return (
    <section className="closing" aria-labelledby="closing-title">
      <div className="container closing__inner">
        <p className="eyebrow eyebrow--on-ink">{CLOSING.eyebrow}</p>

        <h2 id="closing-title" className="closing__title">
          {CLOSING.title}
        </h2>

        <p className="closing__sub">{CLOSING.sub}</p>

        <div className="closing__actions">
          <Link to="/register" className="btn-primary">
            {CLOSING.primary}
          </Link>
          <Link to="/dashboard" className="btn-invert">
            {CLOSING.secondary}
          </Link>
        </div>
      </div>
    </section>
  );
}
