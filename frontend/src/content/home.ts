/* ===========================================================================
 * Home 랜딩 콘텐츠 + 백엔드 규칙 미러
 *
 * ⚠️ 동기화 주의
 * 이 파일의 GRADE_TABLE / OVERRIDE_MATRIX / SEVERITY_RULE / MODEL_SPEC 은
 * 백엔드 소스의 **복제본**이다. 백엔드가 바뀌면 여기도 함께 고쳐야 한다.
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
 * 이 값들은 화면 표시 전용이다. 실제 판정은 항상 백엔드가 수행하며,
 * 프론트는 어떤 등급도 서버에 써 넣지 않는다.
 * =========================================================================== */

import type { Grade, VisualSeverity } from "../types";

/* --- 등급 기준 (grading.py) ---------------------------------------------- */

export interface GradeRow {
  grade: Grade;
  /** 이 등급이 되기 위한 SOH 하한(%). D는 하한이 없다(EOL). */
  min: number | null;
  sohLabel: string;
  state: string;
  note: string;
}

export const GRADE_TABLE: GradeRow[] = [
  {
    grade: "A",
    min: 90,
    sohLabel: "SOH ≥ 90%",
    state: "재사용 우수",
    note: "성능 저하가 거의 없어 그대로 다시 쓸 수 있는 상태",
  },
  {
    grade: "B",
    min: 80,
    sohLabel: "90% > SOH ≥ 80%",
    state: "재사용 가능",
    note: "용량은 줄었지만 용도를 낮추면 재사용 가능한 상태",
  },
  {
    grade: "C",
    min: 70,
    sohLabel: "80% > SOH ≥ 70%",
    state: "재제조 검토",
    note: "셀 교체나 재구성을 거쳐야 다시 쓸 수 있는 상태",
  },
  {
    grade: "D",
    min: null,
    sohLabel: "SOH < 70%",
    state: "재활용 대상",
    note: "수명이 끝나 소재 회수로 보내야 하는 상태",
  },
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

/* --- 외형 오버라이드 매트릭스 (visual_grading.py) ------------------------- */

export type OverrideSeverity = Exclude<VisualSeverity, "PENDING">;

export const SEVERITY_ORDER: OverrideSeverity[] = ["OK", "MODERATE", "CRITICAL"];

export const SEVERITY_LABEL: Record<OverrideSeverity, string> = {
  OK: "결함 없음",
  MODERATE: "경미",
  CRITICAL: "심각",
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

/** 심각도가 어떤 손상 클래스에서 나오는지 (estimate_severity_from_detections) */
export const SEVERITY_RULE = {
  minConfidence: 0.65,
  critical: ["swelling", "leak"],
  moderate: ["corrosion"],
} as const;

/* --- 배포된 모델 스펙 (weights/*.json) ------------------------------------ */

export const MODEL_SPEC = {
  soh: {
    version: "nlinear_b5b6b7_test_b18_v1",
    seqLen: 16,
    trainCells: "B0005 · B0006 · B0007",
    testCell: "B0018",
    mae: "0.74 %p",
    gradeAccuracy: "94.8%",
  },
  vision: {
    version: "yolov8n_ev_battery_defect_v5_noleak",
    classes: "swelling · leak · corrosion",
    confThreshold: "0.65",
    valMap50: "0.981",
  },
} as const;

/* --- 카피 ----------------------------------------------------------------- */

export const HERO = {
  eyebrow: "SOH Classifier",
  titleLead: "겉모습으로는 알 수 없는",
  titleMain: "배터리의 남은 수명을\n데이터로 판정합니다.",
  sub: "충방전 사이클 이력으로 SOH를 예측하고, 팩 사진에서 손상을 탐지합니다. 두 결과를 합쳐 재사용·재제조·재활용 등급을 산출합니다.",
  note: "NLinear · YOLOv8n · FastAPI",
};

export const PROBLEM = {
  eyebrow: "Problem",
  headline: {
    line1: "같은 팩을 두 사람이 보면,",
    line2Pre: "등급도 ",
    line2Em: "두 개",
    line2Post: "가 나옵니다.",
  },
  lead: "폐배터리의 실제 상태는 외관으로 판단하기 어렵습니다. 기준이 사람에게 있으면 결과도 사람마다 달라집니다.",
  items: [
    {
      index: "P-01",
      title: "재사용 여부를 감으로 결정합니다",
      body: "그대로 다시 쓸 팩인지, 재제조로 보낼 팩인지를 담당자의 경험에 기대어 판단하는 경우가 많습니다.",
    },
    {
      index: "P-02",
      title: "같은 스펙인데 등급이 달라집니다",
      body: "SOH를 측정하더라도 어느 값부터 어느 등급인지에 대한 기준이 문서화되어 있지 않으면 결과가 매번 흔들립니다.",
    },
    {
      index: "P-03",
      title: "성능 데이터와 외형 상태가 따로 놉니다",
      body: "사이클 로그는 쌓이는데 스웰링·누액 같은 외형 위험은 별도로 관리돼, 한 화면에서 함께 보는 곳이 없습니다.",
    },
  ],
};

export const FLOW = {
  eyebrow: "How it works",
  title: "두 갈래로 분석하고, 마지막에 합칩니다",
  sub: "성능은 사이클 데이터로, 안전은 사진으로 봅니다. 두 결과가 모두 준비되어야 최종 등급이 확정됩니다.",
  branches: [
    {
      id: "data",
      tag: "Branch A",
      title: "성능 분석",
      steps: [
        {
          title: "사이클 로그 수집",
          desc: "사이클별 SOH(%) 또는 용량(Ah)을 직접 입력하거나 CSV로 올립니다.",
          meta: "POST /api/packs/{id}/cycles",
        },
        {
          title: "SOH 예측",
          desc: "NLinear 모델이 최근 사이클 구간을 보고 다음 사이클의 SOH를 예측합니다.",
          meta: "POST /api/packs/{id}/predict",
        },
        {
          title: "SOH 등급 산출",
          desc: "예측된 SOH를 90 / 80 / 70% 기준에 대입해 A·B·C·D 중 하나를 매깁니다.",
          meta: "soh_grade",
        },
      ],
    },
    {
      id: "vision",
      tag: "Branch B",
      title: "외형 분석",
      steps: [
        {
          title: "팩 사진 업로드",
          desc: "배터리 팩 외형 사진 한 장을 올립니다.",
          meta: "POST /api/packs/{id}/detect",
        },
        {
          title: "손상 탐지",
          desc: "YOLO 모델이 스웰링·누액·부식을 찾고, 확신도 0.65 미만은 오탐으로 보고 버립니다.",
          meta: "swelling · leak · corrosion",
        },
        {
          title: "외형 심각도 판정",
          desc: "스웰링이나 누액이 잡히면 CRITICAL, 부식만 잡히면 MODERATE, 없으면 OK입니다.",
          meta: "visual_severity",
        },
      ],
    },
  ],
  outcome: {
    title: "최종 등급 확정",
    body: "SOH 등급에 외형 심각도를 겹쳐 최종 등급을 내립니다. 성능이 아무리 좋아도 스웰링이나 누액이 확인되면 등급은 D로 내려갑니다 — 안전이 성능보다 앞섭니다.",
    gate: "soh_grade + visual_severity 가 모두 있어야 final_grade 가 결정됩니다",
  },
};

export const CAPABILITY = {
  eyebrow: "Capabilities",
  title: "지금 실제로 배포되어 있는 것",
  sub: "아래 세 가지가 현재 서버에서 동작하는 기능의 전부입니다. 학습에 사용한 데이터와 검증 수치를 함께 적었습니다.",
  cards: [
    {
      kicker: "01 / SOH Prediction",
      title: "다음 사이클의 SOH 예측",
      body: "NASA 배터리 데이터셋으로 학습한 NLinear 모델이 사이클 이력을 받아 다음 사이클의 SOH(%)를 예측합니다. 학습된 가중치가 없으면 최근 추세를 연장하는 방식으로 대체 동작합니다.",
      specs: [
        { label: "MODEL", value: MODEL_SPEC.soh.version },
        { label: "TRAIN / TEST", value: `${MODEL_SPEC.soh.trainCells} → ${MODEL_SPEC.soh.testCell}` },
        { label: "TEST MAE", value: MODEL_SPEC.soh.mae },
        { label: "등급 정확도", value: MODEL_SPEC.soh.gradeAccuracy },
      ],
    },
    {
      kicker: "02 / Damage Detection",
      title: "팩 사진에서 손상 탐지",
      body: "업로드한 사진에서 스웰링·누액·부식 세 가지 손상을 찾습니다. 확신도가 0.65에 못 미치는 탐지는 오탐으로 보고 판정에서 제외합니다.",
      specs: [
        { label: "MODEL", value: MODEL_SPEC.vision.version },
        { label: "CLASSES", value: MODEL_SPEC.vision.classes },
        { label: "CONF 임계값", value: MODEL_SPEC.vision.confThreshold },
        { label: "VAL mAP50", value: MODEL_SPEC.vision.valMap50 },
      ],
    },
    {
      kicker: "03 / Grade Classification",
      title: "최종 등급 판정과 이력 관리",
      body: "SOH 등급과 외형 심각도를 매트릭스에 대입해 최종 등급을 확정하고, 팩별 사이클 로그·예측·판정 이력을 대시보드에서 함께 관리합니다.",
      specs: [
        { label: "등급", value: "A · B · C · D" },
        { label: "SOH 임계값", value: "90 / 80 / 70 %" },
        { label: "심각도", value: "OK · MODERATE · CRITICAL" },
        { label: "판정", value: "재사용 · 재제조 · 재활용" },
      ],
    },
  ],
};

export const INTAKE = {
  eyebrow: "Getting started",
  title: "데이터는 편한 방식으로 넣으세요",
  sub: "직접 입력이든 CSV든 사진이든, 등급 산출까지는 서비스가 이어서 처리합니다.",
  cards: [
    {
      title: "사이클 로그 직접 입력",
      body: "cycle_index와 SOH(%)만 있으면 한 건씩 바로 등록할 수 있습니다.",
    },
    {
      title: "CSV 일괄 업로드",
      body: "이미 쌓아둔 이력이 있다면 cycle_index, soh_percent 헤더의 CSV로 한 번에 채웁니다.",
    },
    {
      title: "외형 사진 업로드",
      body: "사진 한 장이면 손상 탐지부터 최종 등급 확정까지 자동으로 이어집니다.",
    },
  ],
};

export const MATRIX = {
  eyebrow: "Grading rules",
  title: "등급은 이 규칙으로 정해집니다",
  sub: "판정 기준을 숨기지 않습니다. 아래 두 표가 서비스가 쓰는 규칙의 전부입니다.",
};

export const CLOSING = {
  eyebrow: "Start",
  title: "배터리 하나로 시작해보세요.",
  sub: "팩을 등록하고 사이클 로그를 넣으면 SOH 예측이, 사진을 올리면 최종 등급이 나옵니다.",
  primary: "배터리 등록하고 분석하기",
  secondary: "대시보드 보기",
};

export const DISCLAIMER = [
  "SOH 예측값은 NLinear 모델의 추정치이며 실측값과 다를 수 있습니다. 실제 재사용 여부 결정에는 별도의 정밀 검사가 필요합니다.",
  "외형 심각도는 손상 탐지 모델(스웰링·누액·부식)의 결과에 규칙을 적용해 산출한 값이며, 전문가의 안전 판정을 대체하지 않습니다.",
];
