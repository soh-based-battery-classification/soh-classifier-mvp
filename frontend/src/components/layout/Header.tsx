import { Link, NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "소개", end: true },
  { to: "/dashboard", label: "대시보드", end: false },
  { to: "/register", label: "팩 등록", end: false },
];

export default function Header() {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link to="/" className="site-header__brand" aria-label="SOH Classifier 홈">
          <span className="site-header__mark" aria-hidden="true">
            SOH
          </span>
          <span>Classifier</span>
        </Link>

        <nav className="site-header__nav" aria-label="주요 메뉴">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive ? "site-header__link is-active" : "site-header__link"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <Link to="/register" className="btn-primary btn-sm site-header__cta">
          분석 시작
        </Link>
      </div>
    </header>
  );
}
