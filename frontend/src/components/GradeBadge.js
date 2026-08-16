import { jsx as _jsx } from "react/jsx-runtime";
export default function GradeBadge({ grade }) {
    if (!grade) {
        return _jsx("span", { className: "grade-badge grade-none", children: "\uBBF8\uC815" });
    }
    return _jsx("span", { className: `grade-badge grade-${grade}`, children: grade });
}
