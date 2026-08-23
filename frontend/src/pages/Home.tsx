import AnalysisFlowSection from "../components/home/AnalysisFlowSection";
import CtaSection from "../components/home/CtaSection";
import FeatureSection from "../components/home/FeatureSection";
import GradeMatrixSection from "../components/home/GradeMatrixSection";
import HeroSection from "../components/home/HeroSection";
import PainPointSection from "../components/home/PainPointSection";
import UsageSection from "../components/home/UsageSection";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { useServiceStatus } from "../hooks/useServiceStatus";

/**
 * 랜딩 페이지.
 *
 * 스크롤 순서가 곧 서비스 설명의 순서다:
 *   문제 인식 -> 두 갈래 분석 -> 실제 배포된 기능 -> 데이터 투입 방법
 *   -> 판정 규칙 -> 시작하기
 */
export default function Home() {
  const status = useServiceStatus();

  // 상태 로딩으로 레이아웃이 바뀔 수 있으므로 status 를 의존성에 넣어 재관찰한다.
  useScrollReveal([status]);

  return (
    <div className="home">
      <HeroSection status={status} />
      <PainPointSection />
      <AnalysisFlowSection />
      <FeatureSection />
      <UsageSection />
      <GradeMatrixSection />
      <CtaSection />
    </div>
  );
}
