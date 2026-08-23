import { useState } from "react";
import GradeBadge from "../GradeBadge";
import SectionHeader from "../SectionHeader";
import {
  GRADE_TABLE,
  GRADE_TO_STATE,
  MATRIX,
  OVERRIDE_MATRIX,
  SEVERITY_LABEL,
  SEVERITY_ORDER,
  SEVERITY_RULE,
  applyVisualOverride,
  sohToGrade,
} from "../../content/home";
import type { OverrideSeverity } from "../../content/home";
import type { Grade } from "../../types";

const GRADES: Grade[] = ["A", "B", "C", "D"];

/**
 * 시뮬레이터는 backend/app/grading.py 의 soh_to_grade 와
 * backend/app/visual_grading.py 의 OVERRIDE_MATRIX 를 그대로 옮긴 것이라
 * 임의 규칙 없이 100% 동일한 결과를 낸다. 표시 전용이며 서버에 아무것도 쓰지 않는다.
 */
export default function GradeMatrixSection() {
  const [soh, setSoh] = useState(84);
  const [severity, setSeverity] = useState<OverrideSeverity>("OK");

  const sohGrade = sohToGrade(soh);
  const finalGrade = applyVisualOverride(sohGrade, severity);
  const demoted = finalGrade !== sohGrade;

  return (
    <section className="home-section" aria-labelledby="matrix-title">
      <div className="container">
        <div className="reveal">
          <SectionHeader
            eyebrow={MATRIX.eyebrow}
            title={MATRIX.title}
            sub={MATRIX.sub}
            titleId="matrix-title"
          />
        </div>

        <div className="matrix__layout">
          {/* --- 좌: 규칙 표 ------------------------------------------------ */}
          <div className="matrix-column">
            <div className="matrix-block reveal">
              <div className="matrix-block__head">
                <h3>SOH 등급 기준</h3>
                <p>예측된 SOH(%)를 임계값에 대입해 기본 등급을 정합니다.</p>
              </div>

              <div className="table-scroll">
                <table className="grade-table">
                  <thead>
                    <tr>
                      <th scope="col">등급</th>
                      <th scope="col">SOH 범위</th>
                      <th scope="col">판정</th>
                    </tr>
                  </thead>
                  <tbody>
                    {GRADE_TABLE.map((row) => (
                      <tr key={row.grade}>
                        <td>
                          <GradeBadge grade={row.grade} />
                        </td>
                        <td className="grade-table__soh">{row.sohLabel}</td>
                        <td className="grade-table__state">
                          {row.state}
                          <span className="grade-table__note">{row.note}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="matrix-block reveal">
              <div className="matrix-block__head">
                <h3>외형 심각도 오버라이드</h3>
                <p>
                  사진에서 손상이 확인되면 SOH 등급을 그대로 쓰지 않고 아래 표대로
                  낮춥니다.
                </p>
              </div>

              <div className="table-scroll">
                <table className="override-table">
                  <thead>
                    <tr>
                      <th scope="col">외형 \ SOH</th>
                      {GRADES.map((g) => (
                        <th key={g} scope="col">
                          {g}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SEVERITY_ORDER.map((sev) => (
                      <tr key={sev}>
                        <th
                          scope="row"
                          className={`override-table__sev-${sev.toLowerCase()}`}
                        >
                          {sev}
                        </th>
                        {GRADES.map((g) => {
                          const out = OVERRIDE_MATRIX[sev][g];
                          return (
                            <td
                              key={g}
                              className={out !== g ? "override-cell--demoted" : undefined}
                            >
                              <GradeBadge grade={out} />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="override-table__caption">
                스웰링·누액이 확신도 {SEVERITY_RULE.minConfidence} 이상으로 탐지되면
                CRITICAL, 부식만 탐지되면 MODERATE, 그 외에는 OK입니다. CRITICAL이면
                SOH와 무관하게 최종 등급은 D가 됩니다.
              </p>
            </div>
          </div>

          {/* --- 우: 시뮬레이터 --------------------------------------------- */}
          <div className="matrix-block reveal">
            <div className="matrix-block__head">
              <h3>직접 조절해 보기</h3>
              <p>SOH와 외형 상태를 바꾸면 최종 등급이 어떻게 나오는지 확인합니다.</p>
            </div>

            <div className="simulator">
              <div className="simulator__control">
                <div className="simulator__control-head">
                  <label htmlFor="sim-soh">예측 SOH</label>
                  <span className="simulator__value">{soh.toFixed(0)}%</span>
                </div>
                <input
                  id="sim-soh"
                  className="simulator__slider"
                  type="range"
                  min={50}
                  max={100}
                  step={1}
                  value={soh}
                  onChange={(e) => setSoh(Number(e.target.value))}
                  aria-describedby="sim-result"
                />
                <div className="simulator__ticks" aria-hidden="true">
                  <span>50</span>
                  <span>70</span>
                  <span>80</span>
                  <span>90</span>
                  <span>100</span>
                </div>
              </div>

              <div className="simulator__control">
                <div className="simulator__control-head">
                  <span id="sim-sev-label">외형 심각도</span>
                </div>
                <div
                  className="simulator__severity"
                  role="group"
                  aria-labelledby="sim-sev-label"
                >
                  {SEVERITY_ORDER.map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      className="severity-btn"
                      data-sev={sev}
                      aria-pressed={severity === sev}
                      onClick={() => setSeverity(sev)}
                    >
                      {sev}
                      <span className="severity-btn__ko">{SEVERITY_LABEL[sev]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="simulator__result" id="sim-result" aria-live="polite">
                <div className="simulator__result-arrow">
                  <GradeBadge grade={sohGrade} />
                  <span aria-hidden="true">→</span>
                  <span>{demoted ? "오버라이드 적용" : "변동 없음"}</span>
                </div>

                <div className="simulator__result-final">
                  <GradeBadge grade={finalGrade} />
                  <span className="simulator__result-state">
                    {GRADE_TO_STATE[finalGrade]}
                  </span>
                </div>
              </div>

              <p className="simulator__disclaimer">
                이 계산은 백엔드의 판정 규칙을 화면에서 그대로 재현한 것입니다. 실제
                등급은 팩을 등록해 예측을 실행할 때 서버가 산출합니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
