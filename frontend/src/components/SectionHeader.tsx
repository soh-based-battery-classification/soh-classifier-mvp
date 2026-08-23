interface SectionHeaderProps {
  title: string;
  sub?: string;
  /** h2 에 연결할 id — 섹션의 aria-labelledby 대상 */
  titleId?: string;
}

export default function SectionHeader({ title, sub, titleId }: SectionHeaderProps) {
  return (
    <div className="section-header">
      <h2 id={titleId} className="section-header__title">
        {title}
      </h2>
      {sub && <p className="section-header__sub">{sub}</p>}
    </div>
  );
}
