import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import GradeBadge from "../components/GradeBadge";
import type { PackDetail as PackDetailType, VisualSeverity } from "../types";

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

  async function reload() {
    if (!packId) return;
    const data = await api.getPack(packId);
    setDetail(data);
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
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
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
          객체탐지(YOLO) 서비스가 아직 연결되지 않아, 아래 버튼으로 외형 상태를 임시 지정해
          등급 오버라이드 로직을 테스트할 수 있습니다.
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
        <h2>SOH 예측</h2>
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
        <button disabled={busy} onClick={handlePredict}>
          예측 실행
        </button>
      </div>

      <div className="card">
        <h2>사이클 로그 추가</h2>
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
