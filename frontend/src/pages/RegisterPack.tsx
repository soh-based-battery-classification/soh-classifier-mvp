import { DragEvent, FormEvent, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { MODEL_SPEC } from "../content/home";

type Phase = "idle" | "running" | "done";

interface StepLog {
  label: string;
  state: "ok" | "skip" | "fail";
  detail?: string;
}

/**
 * 새 배터리 팩 등록 + 분석 시작.
 *
 * 화면은 4단계로 안내하지만, 실제 호출은 모두 기존 엔드포인트다:
 *   1) POST /api/packs                     (필수)
 *   2) POST /api/packs/{id}/cycles/bulk     (CSV 있을 때만)
 *   3) POST /api/packs/{id}/predict         (CSV 올렸을 때만)
 *   4) POST /api/packs/{id}/detect          (이미지 있을 때만)
 * 중간 단계가 실패해도 팩 생성은 유지하고, 어디까지 됐는지 알려준 뒤
 * 팩 상세로 보낸다.
 */
export default function RegisterPack() {
  const navigate = useNavigate();

  const [packId, setPackId] = useState("");
  const [modelName, setModelName] = useState("");
  const [ratedCapacity, setRatedCapacity] = useState("2.0");

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [dragTarget, setDragTarget] = useState<"csv" | "image" | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [logs, setLogs] = useState<StepLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  const csvInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  function pickCsv(file: File | null) {
    setCsvFile(file);
  }

  function pickImage(file: File | null) {
    setImageFile(file);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  function handleDrop(e: DragEvent<HTMLDivElement>, kind: "csv" | "image") {
    e.preventDefault();
    setDragTarget(null);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (kind === "csv") pickCsv(file);
    else pickImage(file);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>, kind: "csv" | "image") {
    e.preventDefault();
    setDragTarget(kind);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLogs([]);
    setPhase("running");

    const collected: StepLog[] = [];

    // 1) 팩 생성 — 실패하면 여기서 중단
    try {
      await api.createPack({
        pack_id: packId.trim(),
        model_name: modelName.trim(),
        rated_capacity: parseFloat(ratedCapacity),
      });
      collected.push({ label: "팩 등록", state: "ok" });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("idle");
      return;
    }

    const id = packId.trim();
    let cyclesUploaded = false;

    // 2) 사이클 데이터
    if (csvFile) {
      try {
        const created = await api.uploadCyclesCsv(id, csvFile);
        cyclesUploaded = created.length > 0;
        collected.push({
          label: "배터리 데이터 업로드",
          state: "ok",
          detail: `${created.length}개 사이클`,
        });
      } catch (err) {
        collected.push({
          label: "배터리 데이터 업로드",
          state: "fail",
          detail: err instanceof Error ? err.message : String(err),
        });
      }
    } else {
      collected.push({ label: "배터리 데이터 업로드", state: "skip" });
    }

    // 3) SOH 예측 — 사이클이 올라간 경우에만
    if (cyclesUploaded) {
      try {
        const prediction = await api.predictSoh(id);
        collected.push({
          label: "SOH 예측",
          state: "ok",
          detail: `${prediction.predicted_soh.toFixed(1)}% · ${prediction.grade}등급`,
        });
      } catch (err) {
        collected.push({
          label: "SOH 예측",
          state: "fail",
          detail: err instanceof Error ? err.message : String(err),
        });
      }
    } else {
      collected.push({ label: "SOH 예측", state: "skip" });
    }

    // 4) 이미지 분석
    if (imageFile) {
      try {
        const result = await api.detectImage(id, imageFile);
        collected.push({
          label: "이미지 분석",
          state: "ok",
          detail: `손상 ${result.objects.length}건 · ${result.visual_severity}`,
        });
      } catch (err) {
        collected.push({
          label: "이미지 분석",
          state: "fail",
          detail: err instanceof Error ? err.message : String(err),
        });
      }
    } else {
      collected.push({ label: "이미지 분석", state: "skip" });
    }

    setLogs(collected);
    setPhase("done");
  }

  const canSubmit =
    packId.trim().length > 0 && modelName.trim().length > 0 && phase !== "running";

  if (phase === "done") {
    return (
      <div className="register">
        <div className="page-header">
          <div>
            <h1 className="page-header__title">분석을 시작했습니다</h1>
            <p className="hint-text">{packId} 팩이 등록되었습니다.</p>
          </div>
        </div>

        <section className="card">
          <ul className="run-log">
            {logs.map((log) => (
              <li key={log.label} className={`run-log__item run-log__item--${log.state}`}>
                <span className="run-log__mark" aria-hidden="true">
                  {log.state === "ok" ? "✓" : log.state === "skip" ? "–" : "!"}
                </span>
                <span className="run-log__label">{log.label}</span>
                <span className="run-log__detail">
                  {log.state === "skip" ? "건너뜀" : log.detail ?? "완료"}
                </span>
              </li>
            ))}
          </ul>

          <div className="register__actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate(`/packs/${packId.trim()}`)}
            >
              분석 결과 보기
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => navigate("/dashboard")}
            >
              대시보드로
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="register">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">배터리 팩 등록</h1>
          <p className="hint-text">
            팩 정보를 입력하고 데이터나 이미지를 올리면 분석이 시작됩니다.
          </p>
        </div>
      </div>

      {error && <p className="alert-error">{error}</p>}

      <form onSubmit={handleSubmit}>
        {/* 1 --------------------------------------------------------------- */}
        <section className="form-step">
          <div className="form-step__head">
            <span className="form-step__num">1</span>
            <div>
              <h2 className="form-step__title">팩 정보</h2>
              <p className="hint-text">분석 대상 배터리 팩을 구분할 정보입니다.</p>
            </div>
          </div>

          <div className="form-step__body form-grid">
            <div className="field">
              <label htmlFor="pack-id">Pack ID</label>
              <input
                id="pack-id"
                type="text"
                placeholder="PACK-001"
                value={packId}
                onChange={(e) => setPackId(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="model-name">모델명</label>
              <input
                id="model-name"
                type="text"
                placeholder="NCM 72Ah"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="rated-capacity">정격 용량 (Ah)</label>
              <input
                id="rated-capacity"
                type="number"
                step="0.01"
                min="0"
                value={ratedCapacity}
                onChange={(e) => setRatedCapacity(e.target.value)}
                required
              />
            </div>
          </div>
        </section>

        {/* 2 --------------------------------------------------------------- */}
        <section className="form-step">
          <div className="form-step__head">
            <span className="form-step__num">2</span>
            <div>
              <h2 className="form-step__title">
                배터리 데이터 <span className="form-step__optional">선택</span>
              </h2>
              <p className="hint-text">
                cycle_index, soh_percent 열이 있는 CSV 파일. 사이클{" "}
                {MODEL_SPEC.soh.seqLen}개 이상이면 SOH 예측까지 바로 진행합니다.
              </p>
            </div>
          </div>

          <div className="form-step__body">
            <div
              className={`dropzone${dragTarget === "csv" ? " is-dragging" : ""}${
                csvFile ? " is-filled" : ""
              }`}
              onDragOver={(e) => handleDragOver(e, "csv")}
              onDragLeave={() => setDragTarget(null)}
              onDrop={(e) => handleDrop(e, "csv")}
            >
              {csvFile ? (
                <>
                  <span className="dropzone__filename">{csvFile.name}</span>
                  <span className="dropzone__state">선택 완료</span>
                  <button
                    type="button"
                    className="btn-danger-quiet"
                    onClick={() => {
                      pickCsv(null);
                      if (csvInputRef.current) csvInputRef.current.value = "";
                    }}
                  >
                    제거
                  </button>
                </>
              ) : (
                <>
                  <span className="dropzone__title">배터리 데이터를 업로드하세요</span>
                  <span className="dropzone__hint">
                    CSV 파일을 끌어다 놓거나 아래 버튼으로 선택하세요
                  </span>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => csvInputRef.current?.click()}
                  >
                    파일 선택
                  </button>
                </>
              )}

              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                className="visually-hidden"
                onChange={(e) => pickCsv(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
        </section>

        {/* 3 --------------------------------------------------------------- */}
        <section className="form-step">
          <div className="form-step__head">
            <span className="form-step__num">3</span>
            <div>
              <h2 className="form-step__title">
                배터리 팩 이미지 <span className="form-step__optional">선택</span>
              </h2>
              <p className="hint-text">
                팩 외형 사진에서 스웰링·누액·부식을 확인합니다.
              </p>
            </div>
          </div>

          <div className="form-step__body">
            <div
              className={`dropzone${dragTarget === "image" ? " is-dragging" : ""}${
                imageFile ? " is-filled" : ""
              }`}
              onDragOver={(e) => handleDragOver(e, "image")}
              onDragLeave={() => setDragTarget(null)}
              onDrop={(e) => handleDrop(e, "image")}
            >
              {imageFile ? (
                <>
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="업로드할 배터리 팩 사진 미리보기"
                      className="dropzone__preview"
                    />
                  )}
                  <span className="dropzone__filename">{imageFile.name}</span>
                  <span className="dropzone__state">선택 완료</span>
                  <button
                    type="button"
                    className="btn-danger-quiet"
                    onClick={() => {
                      pickImage(null);
                      if (imageInputRef.current) imageInputRef.current.value = "";
                    }}
                  >
                    제거
                  </button>
                </>
              ) : (
                <>
                  <span className="dropzone__title">배터리 팩 이미지를 업로드하세요</span>
                  <span className="dropzone__hint">
                    이미지를 끌어다 놓거나 아래 버튼으로 선택하세요
                  </span>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    파일 선택
                  </button>
                </>
              )}

              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="visually-hidden"
                onChange={(e) => pickImage(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
        </section>

        {/* 4 --------------------------------------------------------------- */}
        <section className="form-step form-step--last">
          <div className="form-step__head">
            <span className="form-step__num">4</span>
            <div>
              <h2 className="form-step__title">분석 시작</h2>
              <p className="hint-text">
                올린 항목만 분석합니다. 데이터나 이미지는 나중에 팩 상세에서 추가할 수
                있습니다.
              </p>
            </div>
          </div>

          <div className="form-step__body register__actions">
            <button type="submit" className="btn-primary" disabled={!canSubmit}>
              {phase === "running" ? "분석 중" : "분석 시작"}
            </button>
            <span className="hint-text">
              {csvFile || imageFile
                ? `${csvFile ? "데이터" : ""}${csvFile && imageFile ? " · " : ""}${
                    imageFile ? "이미지" : ""
                  } 포함`
                : "팩 정보만 등록됩니다"}
            </span>
          </div>
        </section>
      </form>
    </div>
  );
}
