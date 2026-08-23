import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import GradeBadge from "../components/GradeBadge";
import type { DetectionResult, PackDetail as PackDetailType, VisualSeverity } from "../types";

export default function PackDetail() {
  const { packId } = useParams<{ packId: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<PackDetailType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [cycleIndex, setCycleIndex] = useState("1");
  const [sohPercent, setSohPercent] = useState("");

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [lastDetection, setLastDetection] = useState<DetectionResult | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  async function reload() {
    if (!packId) return null;
    const data = await api.getPack(packId);
    setDetail(data);
    return data;
  }

  useEffect(() => {
    reload().catch((e) => setError(e.message));
  }, [packId]);

  async function handleAddCycle(e: FormEvent) {
    e.preventDefault();
    if (!packId) return;

    // 프론트엔드 유효성 검사 (0% ~ 100% 범위 제한)
    const sohVal = parseFloat(sohPercent);
    if (isNaN(sohVal) || sohVal < 0 || sohVal > 100) {
      setError("SOH 값은 0%에서 100% 사이의 숫자여야 합니다.");
      return;
    }

    setError(null);
    setBusy(true);
    try {
      await api.addCycleLog(packId, {
        cycle_index: parseInt(cycleIndex, 10),
        soh_percent: sohVal,
      });
      setCycleIndex((n) => String(parseInt(n, 10) + 1));
      setSohPercent("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function handleCsvSelect(e: ChangeEvent<HTMLInputElement>) {
    setCsvFile(e.target.files?.[0] ?? null);
  }

  async function handleCsvUpload() {
    if (!packId || !csvFile) return;
    setError(null);
    setBusy(true);
    try {
      await api.uploadCyclesCsv(packId, csvFile);
      setCsvFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteCycle(cycleLogId: number) {
    if (!packId) return;
    setError(null);
    setBusy(true);
    try {
      await api.deleteCycleLog(packId, cycleLogId);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeletePack() {
    if (!packId) return;
    if (!confirm(`'${packId}' 팩을 삭제할까요? 사이클 로그/예측 이력도 함께 삭제됩니다.`)) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await api.deletePack(packId);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  async function handlePredict() {
    if (!packId) return;
    setError(null);
    setBusy(true);
    try {
      await api.predictSoh(packId);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleSeverity(severity: VisualSeverity) {
    if (!packId) return;
    setError(null);
    setBusy(true);
    try {
      await api.setVisualSeverity(packId, severity);
      const fresh = await reload();
      if (fresh?.final_state?.final_grade) {
        navigate(`/packs/${packId}/result`, { state: { detail: fresh, detection: null } });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function handleImageSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    setLastDetection(null);
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  async function handleImageUpload() {
    if (!packId || !imageFile) return;
    setError(null);
    setDetecting(true);
    try {
      const result = await api.detectImage(packId, imageFile);
      setLastDetection(result);
      setImageFile(null);
      if (imageInputRef.current) imageInputRef.current.value = "";
      const fresh = await reload();
      if (fresh?.final_state?.final_grade) {
        navigate(`/packs/${packId}/result`, { state: { detail: fresh, detection: result } });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDetecting(false);
    }
  }

  if (!detail) {
    return <p className="hint-text">{error ?? "불러오는 중..."}</p>;
  }

  const latestPrediction = detail.predictions[0];

  return (
    <div>
      {/* 헤더 섹션 */}
      <div className="page-header">
        <div>
          <p className="eyebrow">Pack Detail</p>
          <h1 className="page-header__title">{detail.pack.pack_id}</h1>
          <p className="hint-text">
            모델명: {detail.pack.model_name} · 정격 용량: {detail.pack.rated_capacity} Ah
          </p>
        </div>
        <button className="btn-danger" disabled={busy} onClick={handleDeletePack}>
          이 팩 삭제
        </button>
      </div>

      {error && <p className="alert-error">⚠️ {error}</p>}

      {/* 최종 등급 & 사진 업로드 카드 */}
      <div className="card">
        <h2>최종 등급 및 외형 검사</h2>
        <div className="pack-grade-row">
          SOH 등급: <GradeBadge grade={detail.final_state?.soh_grade} /> &nbsp;→&nbsp; 최종 등급:{" "}
          <GradeBadge grade={detail.final_state?.final_grade} />
        </div>
        <p className="hint-text">
          외형 상태(visual_severity): <strong>{detail.final_state?.visual_severity ?? "PENDING"}</strong>
          {detail.final_state?.final_state ? ` · ${detail.final_state.final_state}` : ""}
        </p>
        <p className="hint-text">
          팩 사진을 올리면 YOLO가 부품을 탐지해 외형 상태를 자동으로 판정합니다.
        </p>

        <div className="inline-form" style={{ marginTop: "var(--space-4)" }}>
          <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageSelect} />
          <button className="btn-primary" disabled={detecting || !imageFile} onClick={handleImageUpload}>
            {detecting ? "탐지 중..." : "사진 업로드 & 탐지"}
          </button>
        </div>

        {imagePreviewUrl && (
          <img src={imagePreviewUrl} alt="업로드할 사진 미리보기" className="detect-preview" />
        )}

        {lastDetection && (
          <div className="detect-result">
            <p className="hint-text">
              탐지 결과 {lastDetection.objects.length}개 · 판정: {lastDetection.visual_severity} · 모델: {lastDetection.model_version}
            </p>
            {lastDetection.objects.length > 0 && (
              <ul className="detect-object-list">
                {lastDetection.objects.map((o, i) => (
                  <li key={i}>
                    {o.class_name} ({(o.confidence * 100).toFixed(0)}%)
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <hr className="divider" />

        <p className="hint-text">외형 상태 직접 지정 (수동 오버라이드 테스트)</p>
        <div className="inline-form">
          <button disabled={busy} onClick={() => handleSeverity("OK")}>OK</button>
          <button disabled={busy} onClick={() => handleSeverity("MODERATE")}>MODERATE</button>
          <button disabled={busy} onClick={() => handleSeverity("CRITICAL")}>CRITICAL</button>
        </div>
      </div>

      {/* 사이클 로그 추가 카드 */}
      <div className="card">
        <h2>사이클 로그 추가 및 SOH 예측</h2>
        <p className="hint-text">
          등록된 사이클 로그를 기반으로 NLinear 모델이 다음 사이클의 SOH(%)를 예측합니다.
          {latestPrediction && (
            <span className="pack-latest-pred">
               최근 예측: {latestPrediction.predicted_soh.toFixed(2)}% ({latestPrediction.grade}등급)
            </span>
          )}
        </p>

        <form className="inline-form" onSubmit={handleAddCycle} style={{ marginTop: "var(--space-4)" }}>
          <label className="field">
            Cycle Index
            <input
              type="number"
              min="1"
              value={cycleIndex}
              onChange={(e) => setCycleIndex(e.target.value)}
              required
            />
          </label>
          <label className="field">
            SOH (%)
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="0 ~ 100"
              value={sohPercent}
              onChange={(e) => setSohPercent(e.target.value)}
              required
            />
          </label>
          <button className="btn-primary" type="submit" disabled={busy}>추가</button>
          <button type="button" disabled={busy} onClick={handlePredict}>
            SOH 예측 실행
          </button>
        </form>

        <hr className="divider" />

        <p className="hint-text">CSV 일괄 업로드 (헤더: cycle_index, soh_percent)</p>
        <div className="inline-form">
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCsvSelect} />
          <button disabled={busy || !csvFile} onClick={handleCsvUpload}>CSV 업로드</button>
        </div>
      </div>

      {/* 사이클 이력 테이블 카드 */}
      <div className="card">
        <h2>사이클 이력 ({detail.cycle_logs.length})</h2>
        <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Cycle</th>
              <th scope="col">SOH (%)</th>
              <th scope="col">측정 시각</th>
              <th scope="col"></th>
            </tr>
          </thead>
          <tbody>
            {detail.cycle_logs.map((log) => (
              <tr key={log.id}>
                <td className="num">{log.cycle_index}</td>
                <td className="num">{log.soh_percent.toFixed(2)}%</td>
                <td className="hint-text">{new Date(log.measured_at).toLocaleString()}</td>
                <td style={{ textAlign: "right" }}>
                  <button
                    className="btn-danger-quiet"
                    disabled={busy}
                    onClick={() => handleDeleteCycle(log.id)}
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
            {detail.cycle_logs.length === 0 && (
              <tr>
                <td colSpan={4} className="empty-cell">
                  등록된 사이클 로그가 없습니다. 위에서 직접 추가하거나 CSV를 업로드하세요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}