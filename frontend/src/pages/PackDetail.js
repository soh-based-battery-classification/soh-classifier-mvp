import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import GradeBadge from "../components/GradeBadge";
export default function PackDetail() {
    const { packId } = useParams();
    const navigate = useNavigate();
    const [detail, setDetail] = useState(null);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    const [cycleIndex, setCycleIndex] = useState("1");
    const [sohPercent, setSohPercent] = useState("");
    const [csvFile, setCsvFile] = useState(null);
    const fileInputRef = useRef(null);
    async function reload() {
        if (!packId)
            return;
        const data = await api.getPack(packId);
        setDetail(data);
    }
    useEffect(() => {
        reload().catch((e) => setError(e.message));
    }, [packId]);
    async function handleAddCycle(e) {
        e.preventDefault();
        if (!packId)
            return;
        setError(null);
        setBusy(true);
        try {
            await api.addCycleLog(packId, {
                cycle_index: parseInt(cycleIndex, 10),
                soh_percent: parseFloat(sohPercent),
            });
            setCycleIndex((n) => String(parseInt(n, 10) + 1));
            setSohPercent("");
            await reload();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
        finally {
            setBusy(false);
        }
    }
    function handleCsvSelect(e) {
        setCsvFile(e.target.files?.[0] ?? null);
    }
    async function handleCsvUpload() {
        if (!packId || !csvFile)
            return;
        setError(null);
        setBusy(true);
        try {
            await api.uploadCyclesCsv(packId, csvFile);
            setCsvFile(null);
            if (fileInputRef.current)
                fileInputRef.current.value = "";
            await reload();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
        finally {
            setBusy(false);
        }
    }
    async function handleDeleteCycle(cycleLogId) {
        if (!packId)
            return;
        setError(null);
        setBusy(true);
        try {
            await api.deleteCycleLog(packId, cycleLogId);
            await reload();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
        finally {
            setBusy(false);
        }
    }
    async function handleDeletePack() {
        if (!packId)
            return;
        if (!confirm(`'${packId}' 팩을 삭제할까요? 사이클 로그/예측 이력도 함께 삭제됩니다.`)) {
            return;
        }
        setError(null);
        setBusy(true);
        try {
            await api.deletePack(packId);
            navigate("/");
        }
        catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            setBusy(false);
        }
    }
    async function handlePredict() {
        if (!packId)
            return;
        setError(null);
        setBusy(true);
        try {
            await api.predictSoh(packId);
            await reload();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
        finally {
            setBusy(false);
        }
    }
    async function handleSeverity(severity) {
        if (!packId)
            return;
        setError(null);
        setBusy(true);
        try {
            await api.setVisualSeverity(packId, severity);
            await reload();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
        finally {
            setBusy(false);
        }
    }
    if (!detail) {
        return _jsx("p", { className: "hint-text", children: error ?? "불러오는 중..." });
    }
    const latestPrediction = detail.predictions[0];
    return (_jsxs("div", { children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [_jsxs("div", { children: [_jsx("h1", { style: { marginBottom: 0 }, children: detail.pack.pack_id }), _jsxs("p", { className: "hint-text", children: [detail.pack.model_name, " \u00B7 \uC815\uACA9 \uC6A9\uB7C9 ", detail.pack.rated_capacity, " Ah"] })] }), _jsx("button", { disabled: busy, onClick: handleDeletePack, children: "\uC774 \uD329 \uC0AD\uC81C" })] }), error && _jsx("p", { className: "error-text", children: error }), _jsxs("div", { className: "card", children: [_jsx("h2", { children: "\uCD5C\uC885 \uB4F1\uAE09" }), _jsxs("p", { children: ["SOH \uB4F1\uAE09: ", _jsx(GradeBadge, { grade: detail.final_state?.soh_grade }), " \u00A0\u2192\u00A0 \uCD5C\uC885 \uB4F1\uAE09:", " ", _jsx(GradeBadge, { grade: detail.final_state?.final_grade })] }), _jsxs("p", { className: "hint-text", children: ["\uC678\uD615 \uC0C1\uD0DC(visual_severity): ", detail.final_state?.visual_severity ?? "PENDING", detail.final_state?.final_state ? ` · ${detail.final_state.final_state}` : ""] }), _jsx("p", { className: "hint-text", children: "\uAC1D\uCCB4\uD0D0\uC9C0(YOLO) \uC11C\uBE44\uC2A4\uAC00 \uC544\uC9C1 \uC5F0\uACB0\uB418\uC9C0 \uC54A\uC544, \uC544\uB798 \uBC84\uD2BC\uC73C\uB85C \uC678\uD615 \uC0C1\uD0DC\uB97C \uC784\uC2DC \uC9C0\uC815\uD574 \uB4F1\uAE09 \uC624\uBC84\uB77C\uC774\uB4DC \uB85C\uC9C1\uC744 \uD14C\uC2A4\uD2B8\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." }), _jsxs("div", { className: "inline-form", children: [_jsx("button", { disabled: busy, onClick: () => handleSeverity("OK"), children: "OK" }), _jsx("button", { disabled: busy, onClick: () => handleSeverity("MODERATE"), children: "MODERATE" }), _jsx("button", { disabled: busy, onClick: () => handleSeverity("CRITICAL"), children: "CRITICAL" })] })] }), _jsxs("div", { className: "card", children: [_jsx("h2", { children: "SOH \uC608\uCE21" }), _jsxs("p", { className: "hint-text", children: ["\uB4F1\uB85D\uB41C \uC0AC\uC774\uD074 \uB85C\uADF8\uB97C \uAE30\uBC18\uC73C\uB85C \uB2E4\uC74C \uC0AC\uC774\uD074\uC758 SOH(%)\uB97C \uC608\uCE21\uD569\uB2C8\uB2E4.", latestPrediction && (_jsxs(_Fragment, { children: [" ", "\uCD5C\uADFC \uC608\uCE21: ", latestPrediction.predicted_soh.toFixed(2), "% (", latestPrediction.grade, "\uB4F1\uAE09, \uBAA8\uB378: ", latestPrediction.model_version, ")"] }))] }), _jsx("button", { disabled: busy, onClick: handlePredict, children: "\uC608\uCE21 \uC2E4\uD589" })] }), _jsxs("div", { className: "card", children: [_jsx("h2", { children: "\uC0AC\uC774\uD074 \uB85C\uADF8 \uCD94\uAC00" }), _jsxs("form", { className: "inline-form", onSubmit: handleAddCycle, children: [_jsxs("label", { children: ["Cycle Index", _jsx("input", { type: "number", value: cycleIndex, onChange: (e) => setCycleIndex(e.target.value), required: true })] }), _jsxs("label", { children: ["SOH (%)", _jsx("input", { type: "number", step: "0.01", value: sohPercent, onChange: (e) => setSohPercent(e.target.value), required: true })] }), _jsx("button", { type: "submit", disabled: busy, children: "\uCD94\uAC00" })] }), _jsx("hr", { style: { margin: "16px 0", border: "none", borderTop: "1px solid #e5e7eb" } }), _jsxs("p", { className: "hint-text", children: ["\uC5EC\uB7EC \uC0AC\uC774\uD074\uC744 \uD55C \uBC88\uC5D0 \uB123\uC73C\uB824\uBA74 CSV\uB85C \uC5C5\uB85C\uB4DC\uD558\uC138\uC694. \uD5E4\uB354\uB294", " ", _jsx("code", { children: "cycle_index,soh_percent" }), " (\uB610\uB294 ", _jsx("code", { children: "cycle_index,capacity_ah" }), ")."] }), _jsxs("div", { className: "inline-form", children: [_jsx("input", { ref: fileInputRef, type: "file", accept: ".csv", onChange: handleCsvSelect }), _jsx("button", { disabled: busy || !csvFile, onClick: handleCsvUpload, children: "CSV \uC5C5\uB85C\uB4DC" })] })] }), _jsxs("div", { className: "card", children: [_jsxs("h2", { children: ["\uC0AC\uC774\uD074 \uC774\uB825 (", detail.cycle_logs.length, ")"] }), _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Cycle" }), _jsx("th", { children: "SOH (%)" }), _jsx("th", { children: "\uCE21\uC815 \uC2DC\uAC01" }), _jsx("th", {})] }) }), _jsx("tbody", { children: detail.cycle_logs.map((log) => (_jsxs("tr", { children: [_jsx("td", { children: log.cycle_index }), _jsx("td", { children: log.soh_percent.toFixed(2) }), _jsx("td", { children: new Date(log.measured_at).toLocaleString() }), _jsx("td", { children: _jsx("button", { disabled: busy, onClick: () => handleDeleteCycle(log.id), children: "\uC0AD\uC81C" }) })] }, log.id))) })] })] })] }));
}
