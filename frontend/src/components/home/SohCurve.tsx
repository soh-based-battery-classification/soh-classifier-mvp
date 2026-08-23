/**
 * Hero 시그니처 그래픽 — 용량 열화 곡선.
 *
 * 서비스가 실제로 다루는 대상(사이클이 쌓이면서 SOH가 90 → 80 → 70% 임계선을
 * 차례로 내려가는 모습)을 그대로 첫 화면의 그래픽으로 쓴다. 임계선과 등급 밴드가
 * 곧 grading.py 의 판정 기준이므로, 그림 자체가 규칙 설명이 된다.
 *
 * 외부 이미지·차트 라이브러리를 쓰지 않고 순수 SVG로 그린다.
 * 애니메이션은 CSS(stroke-dashoffset)에서 처리하며 pathLength="1" 로 정규화한다.
 */

const W = 440;
const H = 252;
const PAD_L = 30;
const PAD_R = 44;
const PAD_T = 18;
const PAD_B = 26;

const SOH_MAX = 100;
const SOH_MIN = 65;
const CYCLES = 160;

const plotW = W - PAD_L - PAD_R;
const plotH = H - PAD_T - PAD_B;

const yOf = (soh: number) =>
  PAD_T + ((SOH_MAX - soh) / (SOH_MAX - SOH_MIN)) * plotH;
const xOf = (cycle: number) => PAD_L + (cycle / CYCLES) * plotW;

/** 결정적 노이즈 — 렌더마다 곡선이 달라지지 않도록 고정값을 쓴다. */
const NOISE = [
  0, 0.32, -0.22, 0.14, -0.36, 0.25, -0.1, 0.38, -0.28, 0.08, 0.3, -0.34, 0.18,
  -0.16, 0.36, -0.24, 0.12, 0.28, -0.32, 0.2, -0.12, 0.34, -0.26, 0.16, 0.1,
  -0.3, 0.24, -0.18, 0.32, -0.08, 0.22,
];

/** 초기 안정 구간 후 가속 열화 — 실제 리튬이온 팩의 전형적 곡선 형태. */
function sohAt(cycle: number): number {
  const t = cycle / CYCLES;
  const fade = 4.5 * t + 17 * Math.pow(t, 2.7);
  return 99.4 - fade;
}

const POINTS = Array.from({ length: 31 }, (_, i) => {
  const cycle = (i / 30) * CYCLES;
  return { x: xOf(cycle), y: yOf(sohAt(cycle) + NOISE[i]) };
});

const CURVE_PATH = POINTS.map(
  (p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`
).join(" ");

const LAST = POINTS[POINTS.length - 1];

const BANDS = [
  { grade: "A", top: PAD_T, bottom: yOf(90), color: "#15803d" },
  { grade: "B", top: yOf(90), bottom: yOf(80), color: "#2563eb" },
  { grade: "C", top: yOf(80), bottom: yOf(70), color: "#d97706" },
  { grade: "D", top: yOf(70), bottom: PAD_T + plotH, color: "#dc2626" },
];

export default function SohCurve() {
  return (
    <svg
      className="soh-chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="사이클이 쌓일수록 SOH가 90%, 80% 임계선을 차례로 내려가며 등급이 A에서 B로 낮아지는 용량 열화 곡선"
    >
      <defs>
        <linearGradient id="soh-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* 등급 밴드 — 아주 옅게 */}
      {BANDS.map((b) => (
        <rect
          key={b.grade}
          x={PAD_L}
          y={b.top}
          width={plotW}
          height={Math.max(0, b.bottom - b.top)}
          fill={b.color}
          opacity="0.055"
        />
      ))}

      {/* 임계선 + 우측 등급 라벨 */}
      {[90, 80, 70].map((soh, i) => (
        <g key={soh}>
          <line
            className="soh-chart__threshold"
            x1={PAD_L}
            y1={yOf(soh)}
            x2={PAD_L + plotW}
            y2={yOf(soh)}
            stroke={BANDS[i + 1].color}
          />
          <text
            className="soh-chart__axis-label"
            x={PAD_L - 6}
            y={yOf(soh) + 3}
            textAnchor="end"
          >
            {soh}
          </text>
        </g>
      ))}

      {/* 우측 등급 밴드 라벨 */}
      {BANDS.map((b) => {
        const mid = (b.top + b.bottom) / 2;
        return (
          <text
            key={`label-${b.grade}`}
            className="soh-chart__band-label"
            x={PAD_L + plotW + 12}
            y={mid + 3.5}
            fill={b.color}
            >
            {b.grade}
          </text>
        );
      })}

      {/* 축 */}
      <line
        x1={PAD_L}
        y1={PAD_T + plotH}
        x2={PAD_L + plotW}
        y2={PAD_T + plotH}
        stroke="#cbd5e1"
        strokeWidth="1"
      />
      <text className="soh-chart__axis-label" x={PAD_L} y={H - 8}>
        CYCLE 0
      </text>
      <text
        className="soh-chart__axis-label"
        x={PAD_L + plotW}
        y={H - 8}
        textAnchor="end"
      >
        {CYCLES}
      </text>
      <text
        className="soh-chart__axis-label"
        x={PAD_L - 6}
        y={PAD_T + 4}
        textAnchor="end"
      >
        SOH
      </text>

      {/* 곡선 아래 면적 */}
      <path
        d={`${CURVE_PATH} L${LAST.x.toFixed(1)} ${PAD_T + plotH} L${PAD_L} ${
          PAD_T + plotH
        } Z`}
        fill="url(#soh-fill)"
        opacity="0.85"
      />

      {/* 곡선 본체 — CSS 에서 그려 들어온다 */}
      <path
        className="soh-chart__curve"
        d={CURVE_PATH}
        pathLength={1}
        stroke="#2563eb"
      />

      {/* 현재 지점 마커 */}
      <g className="soh-chart__marker">
        <circle cx={LAST.x} cy={LAST.y} r="4" fill="#ffffff" />
        <circle
          cx={LAST.x}
          cy={LAST.y}
          r="4"
          fill="none"
          stroke="#2563eb"
          strokeWidth="2"
        />
      </g>
    </svg>
  );
}
