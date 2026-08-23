export type Grade = "A" | "B" | "C" | "D";
export type VisualSeverity = "OK" | "MODERATE" | "CRITICAL" | "PENDING";

export interface Pack {
  pack_id: string;
  model_name: string;
  rated_capacity: number;
  registered_at: string;
}

export interface CycleLog {
  id: number;
  cycle_index: number;
  capacity_ah: number | null;
  soh_percent: number;
  measured_at: string;
}

export interface Prediction {
  id: number;
  predicted_at: string;
  predicted_soh: number;
  grade: Grade;
  model_version: string;
}

export interface FinalState {
  pack_id: string;
  soh_grade: Grade | null;
  visual_severity: VisualSeverity;
  final_grade: Grade | null;
  final_state: string | null;
  decided_at: string | null;
}

export interface PackDetail {
  pack: Pack;
  cycle_logs: CycleLog[];
  predictions: Prediction[];
  final_state: FinalState | null;
}

export interface DetectionObject {
  class_name: string;
  confidence: number;
  bbox_x: number;
  bbox_y: number;
  bbox_w: number;
  bbox_h: number;
}

export interface DetectionResult {
  id: number;
  pack_id: string;
  detected_at: string;
  model_version: string;
  visual_severity: VisualSeverity;
  objects: DetectionObject[];
}

export interface Industry {
  key: string;
  label: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
