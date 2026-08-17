import type { Grade } from "../types";

export default function GradeBadge({ grade }: { grade: Grade | null | undefined }) {
  if (!grade) {
    return <span className="grade-badge grade-none">미정</span>;
  }
  return <span className={`grade-badge grade-${grade}`}>{grade}</span>;
}
