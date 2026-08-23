import { Outlet, useLocation } from "react-router-dom";
import Footer from "./Footer";
import Header from "./Header";

/**
 * 공통 레이아웃.
 *
 * Home("/")은 화면 끝까지 닿는 섹션(hero, closing)을 직접 그리므로 main 에
 * 폭 제한을 두지 않는다. 나머지 페이지는 기존과 동일하게 컨테이너 폭 안에서
 * 렌더링된다.
 */
export default function AppLayout() {
  const { pathname } = useLocation();
  const isLanding = pathname === "/";

  return (
    <div className="app-root">
      <Header />

      <main
        id="main"
        className={`app-main ${isLanding ? "app-main--flush" : "app-main--contained"}`}
      >
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
