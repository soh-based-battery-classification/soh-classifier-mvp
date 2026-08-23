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
 * 임의 규칙 없이 동일한 결과를 낸다. 표시 전용이며 서버에 아무것도 쓰지 않는다.
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
          <SectionHeader title={MATRIX.title} sub={MATRIX.sub} titleId="matrix-title" />
        </div>

        <div className="matrix__layout">
          <div className="matrix-column">
            <div className="matrix-block reveal">
              <div className="matrix-block__head">
                <h3>SOH에 따른 등급</h3>
                <p>예측된 SOH를 기준값에 대입해 등급을 정합니다.</p>
              </div>

              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">등급</th>
                      <th scope="col">SOH</th>
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
                        <td className="grade-table__state">{row.state}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="matrix-block reveal">
              <div className="matrix-block__head">
                <h3>외형 상태에 따른 조정</h3>
                <p>손상이 확인되면 SOH 등급을 그대로 쓰지 않고 낮춥니다.</p>
              </div>

              <div className="table-scroll">
                <table className="override-table">
                  <thead>
                    <tr>
                      <th scope="col">외형 \ SOH 등급</th>
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
                          {SEVERITY_LABEL[sev]}
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
                스웰링이나 누액이 확신도 {SEVERITY_RULE.minConfidence} 이상으로 잡히면
                심각, 부식만 잡히면 경미, 아무것도 없으면 이상 없음입니다.
              </p>
            </div>
          </div>

          <div className="matrix-block reveal">
            <div className="matrix-block__head">
              <h3>직접 확인해 보기</h3>
              <p>SOH와 외형 상태를 바꾸면 최종 등급이 어떻게 나오는지 보여줍니다.</p>
            </div>

            <div className="simulator">
              <div className="simulator__control">
                <div className="simulator__control-head">
                  <label htmlFor="sim-soh">SOH</label>
                  <span className="simulator__value">{soh}%</span>
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
                  <span id="sim-sev-label">외형 상태</span>
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
                      <span className="severity-btn__ko">{SEVERITY_LABEL[sev]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="simulator__result" id="sim-result" aria-live="polite">
                <div className="simulator__result-arrow">
                  <GradeBadge grade={sohGrade} />
                  <span aria-hidden="true">→</span>
                  <span>{demoted ? "외형 반영해 조정" : "조정 없음"}</span>
                </div>

                <div className="simulator__result-final">
                  <GradeBadge grade={finalGrade} />
                  <span className="simulator__result-state">
                    {GRADE_TO_STATE[finalGrade]}
                  </span>
                </div>
              </div>

              <p className="simulator__disclaimer">
                실제 등급은 팩을 등록해 분석을 실행할 때 서버가 계산합니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
