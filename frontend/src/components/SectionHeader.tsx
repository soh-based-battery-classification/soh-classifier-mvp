interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  sub?: string;
  align?: "start" | "center";
  /** h2 에 연결할 id — 섹션의 aria-labelledby 대상 */
  titleId?: string;
}

export default function SectionHeader({
  eyebrow,
  title,
  sub,
  align = "start",
  titleId,
}: SectionHeaderProps) {
  return (
    <div
      className={
        align === "center" ? "section-header section-header--center" : "section-header"
      }
    >
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={titleId} className="section-header__title">
        {title}
      </h2>
      {sub && <p className="section-header__sub">{sub}</p>}
    </div>
  );
}
