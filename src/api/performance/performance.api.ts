import { apiGet, apiPatch, apiPost } from "../client";
import type {
  CreateAssessmentRequest,
  CreateCycleRequest,
  PerformanceAssessment,
  PerformanceCalibration,
  PerformanceCycle,
  PerformanceCycleStatus,
  PerformanceQuestionnaire,
  SubmitAssessmentRequest,
  UpsertCalibrationRequest,
  UpsertQuestionnaireRequest,
} from "./performance.types";

export const performanceApi = {
  listCycles: (): Promise<PerformanceCycle[]> => apiGet("/performance/cycles"),
  createCycle: (b: CreateCycleRequest): Promise<PerformanceCycle> =>
    apiPost("/performance/cycles", b),
  setCycleStatus: (id: string, status: PerformanceCycleStatus): Promise<{ count: number }> =>
    apiPatch(`/performance/cycles/${id}/status`, { status }),

  listQuestionnaires: (cycleId: string): Promise<PerformanceQuestionnaire[]> =>
    apiGet("/performance/questionnaires", { cycleId }),
  upsertQuestionnaire: (b: UpsertQuestionnaireRequest): Promise<PerformanceQuestionnaire> =>
    apiPost("/performance/questionnaires", b),

  listAssessments: (params: { cycleId?: string; reviewerId?: string } = {}): Promise<PerformanceAssessment[]> =>
    apiGet("/performance/assessments", params),
  createAssessment: (b: CreateAssessmentRequest): Promise<PerformanceAssessment> =>
    apiPost("/performance/assessments", b),
  submitAssessment: (id: string, b: SubmitAssessmentRequest): Promise<PerformanceAssessment> =>
    apiPost(`/performance/assessments/${id}/submit`, b),

  listCalibrations: (cycleId: string): Promise<PerformanceCalibration[]> =>
    apiGet("/performance/calibrations", { cycleId }),
  upsertCalibration: (b: UpsertCalibrationRequest): Promise<PerformanceCalibration> =>
    apiPost("/performance/calibrations", b),
};
