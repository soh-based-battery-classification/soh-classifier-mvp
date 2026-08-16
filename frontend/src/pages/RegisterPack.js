import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
export default function RegisterPack() {
    const navigate = useNavigate();
    const [packId, setPackId] = useState("");
    const [modelName, setModelName] = useState("");
    const [ratedCapacity, setRatedCapacity] = useState("2.0");
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            await api.createPack({
                pack_id: packId,
                model_name: modelName,
                rated_capacity: parseFloat(ratedCapacity),
            });
            navigate(`/packs/${packId}`);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
        finally {
            setSubmitting(false);
        }
    }
    return (_jsxs("div", { children: [_jsx("h1", { children: "\uBC30\uD130\uB9AC \uD329 \uB4F1\uB85D" }), _jsxs("div", { className: "card", children: [_jsxs("form", { className: "inline-form", onSubmit: handleSubmit, children: [_jsxs("label", { children: ["Pack ID", _jsx("input", { value: packId, onChange: (e) => setPackId(e.target.value), required: true })] }), _jsxs("label", { children: ["\uBAA8\uB378\uBA85", _jsx("input", { value: modelName, onChange: (e) => setModelName(e.target.value), required: true })] }), _jsxs("label", { children: ["\uC815\uACA9 \uC6A9\uB7C9 (Ah)", _jsx("input", { type: "number", step: "0.01", value: ratedCapacity, onChange: (e) => setRatedCapacity(e.target.value), required: true })] }), _jsx("button", { type: "submit", disabled: submitting, children: submitting ? "등록 중..." : "등록" })] }), error && _jsx("p", { className: "error-text", children: error })] })] }));
}
