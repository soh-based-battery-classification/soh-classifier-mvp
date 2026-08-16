import type { CycleLog, FinalState, Pack, PackDetail, Prediction, VisualSeverity } from "./types";
export declare const api: {
    listPacks: () => Promise<Pack[]>;
    createPack: (payload: {
        pack_id: string;
        model_name: string;
        rated_capacity: number;
    }) => Promise<Pack>;
    getPack: (packId: string) => Promise<PackDetail>;
    deletePack: (packId: string) => Promise<void>;
    addCycleLog: (packId: string, payload: {
        cycle_index: number;
        soh_percent?: number;
        capacity_ah?: number;
    }) => Promise<CycleLog>;
    deleteCycleLog: (packId: string, cycleLogId: number) => Promise<void>;
    uploadCyclesCsv: (packId: string, file: File) => Promise<CycleLog[]>;
    predictSoh: (packId: string) => Promise<Prediction>;
    setVisualSeverity: (packId: string, visual_severity: VisualSeverity) => Promise<FinalState>;
    modelStatus: () => Promise<{
        is_ready: boolean;
        mode: string;
        model_dir: string;
    }>;
};
