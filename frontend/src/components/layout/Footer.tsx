import { Link } from "react-router-dom";
import { DISCLAIMER } from "../../content/home";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__top">
          <span className="site-footer__brand">배터리 등급 분류</span>

          <nav className="site-footer__nav" aria-label="푸터 메뉴">
            <Link to="/">소개</Link>
            <Link to="/dashboard">대시보드</Link>
            <Link to="/register">팩 등록</Link>
          </nav>
        </div>

        <div className="site-footer__disclaimer">
          {DISCLAIMER.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </div>
    </footer>
  );
}
