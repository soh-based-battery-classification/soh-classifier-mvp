import AnalysisSection from "../components/home/AnalysisSection";
import CtaSection from "../components/home/CtaSection";
import GradeMatrixSection from "../components/home/GradeMatrixSection";
import HeroSection from "../components/home/HeroSection";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { useServiceStatus } from "../hooks/useServiceStatus";

/**
 * 서비스 소개.
 *
 * 스크롤 순서: 무슨 서비스인지 -> 어떻게 분석하는지 -> 등급 기준 -> 시작
 */
export default function Home() {
  const status = useServiceStatus();

  useScrollReveal([status]);

  return (
    <div className="home">
      <HeroSection status={status} />
      <AnalysisSection />
      <GradeMatrixSection />
      <CtaSection />
    </div>
  );
}
