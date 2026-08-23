import { useEffect } from "react";

/**
 * 스크롤 등장 효과.
 *
 * 라이브러리를 추가하지 않고 IntersectionObserver 만 사용한다.
 * `.reveal` 클래스가 붙은 요소가 뷰포트에 들어오면 `.is-visible` 을 부여하고
 * 관찰을 해제한다(한 번만 실행).
 *
 * - IntersectionObserver 미지원 환경: 전부 즉시 표시
 * - prefers-reduced-motion: CSS 쪽에서 이미 opacity 1 로 고정되지만,
 *   여기서도 관찰 자체를 건너뛴다.
 */
export function useScrollReveal(deps: readonly unknown[] = []) {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    if (nodes.length === 0) return;

    const prefersReduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced || typeof IntersectionObserver === "undefined") {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
    );

    nodes.forEach((node) => {
      // 이미 화면 안(첫 화면)에 있는 요소는 관찰 없이 바로 표시
      const rect = node.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92) {
        node.classList.add("is-visible");
        return;
      }
      observer.observe(node);
    });

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
