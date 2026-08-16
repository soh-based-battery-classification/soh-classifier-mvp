import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
export default function Dashboard() {
    const [packs, setPacks] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);
    function loadPacks() {
        setLoading(true);
        return api
            .listPacks()
            .then(setPacks)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }
    useEffect(() => {
        loadPacks();
    }, []);
    async function handleDelete(packId) {
        if (!confirm(`'${packId}' 팩을 삭제할까요? 사이클 로그/예측 이력도 함께 삭제됩니다.`)) {
            return;
        }
        setError(null);
        setDeletingId(packId);
        try {
            await api.deletePack(packId);
            await loadPacks();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
        finally {
            setDeletingId(null);
        }
    }
    return (_jsxs("div", { children: [_jsx("h1", { children: "\uBC30\uD130\uB9AC \uD329 \uB300\uC2DC\uBCF4\uB4DC" }), loading && _jsx("p", { className: "hint-text", children: "\uBD88\uB7EC\uC624\uB294 \uC911..." }), error && _jsx("p", { className: "error-text", children: error }), _jsx("div", { className: "card", children: packs.length === 0 && !loading ? (_jsxs("p", { className: "hint-text", children: ["\uB4F1\uB85D\uB41C \uD329\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. ", _jsx(Link, { to: "/register", children: "\uD329 \uB4F1\uB85D" }), "\uBD80\uD130 \uC2DC\uC791\uD558\uC138\uC694."] })) : (_jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Pack ID" }), _jsx("th", { children: "\uBAA8\uB378\uBA85" }), _jsx("th", { children: "\uC815\uACA9 \uC6A9\uB7C9 (Ah)" }), _jsx("th", { children: "\uB4F1\uB85D\uC77C" }), _jsx("th", {}), _jsx("th", {})] }) }), _jsx("tbody", { children: packs.map((p) => (_jsxs("tr", { children: [_jsx("td", { children: p.pack_id }), _jsx("td", { children: p.model_name }), _jsx("td", { children: p.rated_capacity }), _jsx("td", { children: new Date(p.registered_at).toLocaleString() }), _jsx("td", { children: _jsx(Link, { to: `/packs/${p.pack_id}`, children: "\uC0C1\uC138 \uBCF4\uAE30" }) }), _jsx("td", { children: _jsx("button", { disabled: deletingId === p.pack_id, onClick: () => handleDelete(p.pack_id), children: deletingId === p.pack_id ? "삭제 중..." : "삭제" }) })] }, p.pack_id))) })] })) })] }));
}
