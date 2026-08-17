import { Route, Routes, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import PackDetail from "./pages/PackDetail";
import RegisterPack from "./pages/RegisterPack";

export default function App() {
  return (
    <>
      <nav className="top-nav">
        <Link to="/">대시보드</Link>
        <Link to="/register">팩 등록</Link>
      </nav>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/register" element={<RegisterPack />} />
          <Route path="/packs/:packId" element={<PackDetail />} />
        </Routes>
      </div>
    </>
  );
}
