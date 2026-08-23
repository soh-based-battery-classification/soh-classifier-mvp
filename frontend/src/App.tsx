import { Route, Routes } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import PackDetail from "./pages/PackDetail";
import PackResult from "./pages/PackResult";
import RegisterPack from "./pages/RegisterPack";

export default function App() {
  return (
    <Routes>
      {/* 기존 경로는 그대로 유지하고 공통 레이아웃만 부모로 감싼다. */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/register" element={<RegisterPack />} />
        <Route path="/packs/:packId" element={<PackDetail />} />
        <Route path="/packs/:packId/result" element={<PackResult />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
