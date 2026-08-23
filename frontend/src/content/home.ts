/* ===========================================================================
 * 화면 문구 + 백엔드 규칙 미러
 *
 * ⚠️ 동기화 주의
 * GRADE_TABLE / OVERRIDE_MATRIX / SEVERITY_RULE / MODEL_SPEC 은 백엔드 소스의
 * **복제본**이다. 백엔드가 바뀌면 여기도 함께 고쳐야 한다.
 *
 *   GRADE_TABLE      <- backend/app/grading.py
 *                       DEFAULT_THRESHOLDS = {"A": 90.0, "B": 80.0, "C": 70.0}
 *                       EOL_GRADE = "D"
 *                       GRADE_TO_STATE = {A:재사용 우수, B:재사용 가능,
 *                                         C:재제조 검토, D:재활용 대상}
 *   OVERRIDE_MATRIX  <- backend/app/visual_grading.py OVERRIDE_MATRIX
 *   SEVERITY_RULE    <- backend/app/visual_grading.py
 *                       CRITICAL_DEFECTS / MODERATE_DEFECTS / MIN_CONFIDENCE
 *   MODEL_SPEC       <- backend/app/ml/weights/model_meta.json
 *                       backend/app/ml/weights/yolo_model_meta.json
 *
 * 이 값들은 화면 표시 전용이다. 실제 판정은 항상 백엔드가 수행한다.
 * =========================================================================== */

import type { Grade, VisualSeverity } from "../types";

/* --- 등급 기준 (grading.py) ---------------------------------------------- */

export interface GradeRow {
  grade: Grade;
  sohLabel: string;
  state: string;
}

export const GRADE_TABLE: GradeRow[] = [
  { grade: "A", sohLabel: "90% 이상", state: "재사용 우수" },
  { grade: "B", sohLabel: "80% 이상 90% 미만", state: "재사용 가능" },
  { grade: "C", sohLabel: "70% 이상 80% 미만", state: "재제조 검토" },
  { grade: "D", sohLabel: "70% 미만", state: "재활용 대상" },
];

/** grading.py soh_to_grade() 와 동일한 판정. */
export function sohToGrade(soh: number): Grade {
  if (soh >= 90) return "A";
  if (soh >= 80) return "B";
  if (soh >= 70) return "C";
  return "D";
}

export const GRADE_TO_STATE: Record<Grade, string> = {
  A: "재사용 우수",
  B: "재사용 가능",
  C: "재제조 검토",
  D: "재활용 대상",
};

/** 대시보드 집계용 묶음 — 재사용(A,B) / 재제조(C) / 재활용(D) */
export const GRADE_GROUP: Record<Grade, "reuse" | "remanufacture" | "recycle"> = {
  A: "reuse",
  B: "reuse",
  C: "remanufacture",
  D: "recycle",
};

/* --- 외형 오버라이드 (visual_grading.py) ---------------------------------- */

export type OverrideSeverity = Exclude<VisualSeverity, "PENDING">;

export const SEVERITY_ORDER: OverrideSeverity[] = ["OK", "MODERATE", "CRITICAL"];

export const SEVERITY_LABEL: Record<VisualSeverity, string> = {
  OK: "이상 없음",
  MODERATE: "경미",
  CRITICAL: "심각",
  PENDING: "미분석",
};

export const OVERRIDE_MATRIX: Record<OverrideSeverity, Record<Grade, Grade>> = {
  OK: { A: "A", B: "B", C: "C", D: "D" },
  MODERATE: { A: "B", B: "C", C: "C", D: "D" },
  CRITICAL: { A: "D", B: "D", C: "D", D: "D" },
};

/** visual_grading.py apply_visual_override() 와 동일한 판정. */
export function applyVisualOverride(
  sohGrade: Grade,
  severity: OverrideSeverity
): Grade {
  return OVERRIDE_MATRIX[severity][sohGrade];
}

export const SEVERITY_RULE = {
  minConfidence: 0.65,
  critical: ["swelling", "leak"],
  moderate: ["corrosion"],
} as const;

/* --- 배포된 모델 (weights/*.json) ----------------------------------------- */

export const MODEL_SPEC = {
  soh: {
    version: "nlinear_b5b6b7_test_b18_v1",
    seqLen: 16,
    mae: "0.74%p",
  },
  vision: {
    version: "yolov8n_ev_battery_defect_v5_noleak",
    classes: "스웰링 · 누액 · 부식",
    confThreshold: "0.65",
  },
} as const;

/* --- 화면 문구 ------------------------------------------------------------ */

export const HERO = {
  title: "배터리 상태를 분석합니다",
  sub: "충·방전 데이터로 SOH를 예측하고, 팩 이미지에서 손상을 확인해 등급을 판정합니다.",
  meta: ["NLinear", "YOLOv8n", "FastAPI"],
};

export const ANALYSIS = {
  title: "분석 방식",
  sub: "데이터와 이미지를 각각 분석한 뒤, 두 결과를 합쳐 등급을 정합니다.",
  steps: [
    {
      num: "1",
      title: "배터리 데이터 분석",
      body: "사이클별 SOH를 입력하거나 CSV로 올리면, 다음 사이클의 SOH를 예측합니다.",
      specs: [
        { label: "모델", value: MODEL_SPEC.soh.version },
        { label: "필요 사이클", value: `${MODEL_SPEC.soh.seqLen}개 이상` },
        { label: "테스트 오차", value: MODEL_SPEC.soh.mae },
      ],
    },
    {
      num: "2",
      title: "배터리 팩 이미지 분석",
      body: "팩 사진을 올리면 스웰링·누액·부식을 찾아 외형 상태를 판정합니다.",
      specs: [
        { label: "모델", value: MODEL_SPEC.vision.version },
        { label: "탐지 대상", value: MODEL_SPEC.vision.classes },
        { label: "확신도 기준", value: MODEL_SPEC.vision.confThreshold },
      ],
    },
    {
      num: "3",
      title: "분석 결과 및 등급 확인",
      body: "예측된 SOH와 외형 상태를 합쳐 최종 등급을 정하고, 팩별 이력을 남깁니다.",
      specs: [
        { label: "등급", value: "A · B · C · D" },
        { label: "SOH 기준", value: "90 / 80 / 70%" },
        { label: "판정", value: "재사용 · 재제조 · 재활용" },
      ],
    },
  ],
  merge:
    "두 분석이 모두 끝나야 최종 등급이 나옵니다. 데이터상 상태가 좋아도 스웰링이나 누액이 확인되면 등급은 D로 내려갑니다.",
};

export const MATRIX = {
  title: "등급 기준",
  sub: "판정에 쓰는 규칙은 아래 두 표가 전부입니다.",
};

export const CLOSING = {
  title: "배터리 팩을 등록하고 분석을 시작하세요",
  sub: "팩 정보를 입력하고 데이터나 이미지를 올리면 분석이 진행됩니다.",
  primary: "분석 시작",
  secondary: "대시보드 보기",
};

export const DISCLAIMER = [
  "SOH 예측값은 모델의 추정치이며 실측값과 다를 수 있습니다.",
  "외형 상태는 손상 탐지 결과에 규칙을 적용한 값이며, 전문가의 안전 판정을 대체하지 않습니다.",
];
