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
    setError(null);
    setBusy(true);
    try {
      await api.addCycleLog(packId, {
        cycle_index: parseInt(cycleIndex, 10),
        soh_percent: parseFloat(sohPercent),
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ marginBottom: 0 }}>{detail.pack.pack_id}</h1>
          <p className="hint-text">
            {detail.pack.model_name} · 정격 용량 {detail.pack.rated_capacity} Ah
          </p>
        </div>
        <button disabled={busy} onClick={handleDeletePack}>
          이 팩 삭제
        </button>
      </div>
      {error && <p className="error-text">{error}</p>}

      <div className="card">
        <h2>최종 등급</h2>
        <p>
          SOH 등급: <GradeBadge grade={detail.final_state?.soh_grade} /> &nbsp;→&nbsp; 최종 등급:{" "}
          <GradeBadge grade={detail.final_state?.final_grade} />
        </p>
        <p className="hint-text">
          외형 상태(visual_severity): {detail.final_state?.visual_severity ?? "PENDING"}
          {detail.final_state?.final_state ? ` · ${detail.final_state.final_state}` : ""}
        </p>
        <p className="hint-text">
          팩 사진을 올리면 YOLO가 부품을 탐지해 외형 상태를 자동으로 판정합니다. (핵심 구조
          부품이 하나라도 안 잡히면 CRITICAL, 다 잡혔지만 평균 신뢰도가 낮으면 MODERATE — 아직
          임시 규칙입니다.)
        </p>
        <div className="inline-form">
          <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageSelect} />
          <button disabled={detecting || !imageFile} onClick={handleImageUpload}>
            {detecting ? "탐지 중..." : "사진 업로드 & 탐지"}
          </button>
        </div>
        {imagePreviewUrl && (
          <img src={imagePreviewUrl} alt="업로드할 사진 미리보기" className="detect-preview" />
        )}
        {lastDetection && (
          <div className="detect-result">
            <p className="hint-text">
              탐지 결과 {lastDetection.objects.length}개 · 판정: {lastDetection.visual_severity} ·
              모델: {lastDetection.model_version}
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

        <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid #e5e7eb" }} />

        <p className="hint-text">
          외형 상태를 직접 지정해 등급 오버라이드 로직만 테스트할 수도 있습니다 (사진을 올리면
          이 값은 덮어써집니다).
        </p>
        <div className="inline-form">
          <button disabled={busy} onClick={() => handleSeverity("OK")}>
            OK
          </button>
          <button disabled={busy} onClick={() => handleSeverity("MODERATE")}>
            MODERATE
          </button>
          <button disabled={busy} onClick={() => handleSeverity("CRITICAL")}>
            CRITICAL
          </button>
        </div>
      </div>

      <div className="card">
        <h2>사이클 로그 추가</h2>
        <p className="hint-text">
          등록된 사이클 로그를 기반으로 다음 사이클의 SOH(%)를 예측합니다.
          {latestPrediction && (
            <>
              {" "}
              최근 예측: {latestPrediction.predicted_soh.toFixed(2)}% ({latestPrediction.grade}등급,
              모델: {latestPrediction.model_version})
            </>
          )}
        </p>
        <form className="inline-form" onSubmit={handleAddCycle}>
          <label>
            Cycle Index
            <input
              type="number"
              value={cycleIndex}
              onChange={(e) => setCycleIndex(e.target.value)}
              required
            />
          </label>
          <label>
            SOH (%)
            <input
              type="number"
              step="0.01"
              value={sohPercent}
              onChange={(e) => setSohPercent(e.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={busy}>
            추가
          </button>
          <button type="button" disabled={busy} onClick={handlePredict}>
            SOH 예측 실행
          </button>
        </form>

        <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid #e5e7eb" }} />

        <p className="hint-text">
          여러 사이클을 한 번에 넣으려면 CSV로 업로드하세요. 헤더는{" "}
          <code>cycle_index,soh_percent</code> (또는 <code>cycle_index,capacity_ah</code>).
        </p>
        <div className="inline-form">
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCsvSelect} />
          <button disabled={busy || !csvFile} onClick={handleCsvUpload}>
            CSV 업로드
          </button>
        </div>
      </div>

      <div className="card">
        <h2>사이클 이력 ({detail.cycle_logs.length})</h2>
        <table>
          <thead>
            <tr>
              <th>Cycle</th>
              <th>SOH (%)</th>
              <th>측정 시각</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {detail.cycle_logs.map((log) => (
              <tr key={log.id}>
                <td>{log.cycle_index}</td>
                <td>{log.soh_percent.toFixed(2)}</td>
                <td>{new Date(log.measured_at).toLocaleString()}</td>
                <td>
                  <button disabled={busy} onClick={() => handleDeleteCycle(log.id)}>
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
