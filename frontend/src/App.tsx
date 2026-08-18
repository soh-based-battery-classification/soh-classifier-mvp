import { Route, Routes, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import PackDetail from "./pages/PackDetail";
import PackResult from "./pages/PackResult";
import RegisterPack from "./pages/RegisterPack";

export default function App() {
  return (
    <>
      <nav className="top-nav">
        <Link to="/">소개</Link>
        <Link to="/dashboard">대시보드</Link>
        <Link to="/register">팩 등록</Link>
      </nav>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/register" element={<RegisterPack />} />
          <Route path="/packs/:packId" element={<PackDetail />} />
          <Route path="/packs/:packId/result" element={<PackResult />} />
        </Routes>
      </div>
    </>
  );
}
