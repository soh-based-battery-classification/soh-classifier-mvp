import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Route, Routes, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import PackDetail from "./pages/PackDetail";
import RegisterPack from "./pages/RegisterPack";
export default function App() {
    return (_jsxs(_Fragment, { children: [_jsxs("nav", { className: "top-nav", children: [_jsx(Link, { to: "/", children: "\uB300\uC2DC\uBCF4\uB4DC" }), _jsx(Link, { to: "/register", children: "\uD329 \uB4F1\uB85D" })] }), _jsx("div", { className: "app-shell", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Dashboard, {}) }), _jsx(Route, { path: "/register", element: _jsx(RegisterPack, {}) }), _jsx(Route, { path: "/packs/:packId", element: _jsx(PackDetail, {}) })] }) })] }));
}
