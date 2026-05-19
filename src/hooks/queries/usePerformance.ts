/**
 * Phase 7 shim. The core cycle / assessment / calibration flows wrap
 * @/api/performance. The "assessment ratings" sub-feature (per-question
 * numerical scoring) and the realtime cycle delete/update routes aren't
 * yet exposed by the backend — those return empty / no-op until ported.
 */
import {
  usePerformanceCycles as useCyclesApi,
  useCreatePerformanceCycle as useCreateCycleApi,
  useSetCycleStatus,
  usePerformanceAssessments as useAssessmentsApi,
  useCreateAssessment,
  useSubmitAssessment,
  useCalibrations as useCalibrationsApi,
  useUpsertCalibration as useUpsertCalibrationApi,
  useQuestionnaires as useQuestionnairesApi,
  useUpsertQuestionnaire as useUpsertQuestionnaireApi,
} from "@/api";

// ─── Type aliases used by legacy pages ───────────────────────────────────────

export interface DBPerformanceAssessment {
  id: string;
  client_id: string;
  cycle_id: string;
  employee_id: string;
  reviewer_id: string;
  type: string;
  responses: Record<string, unknown>;
  rating: number | null;
  status: string;
  submitted_at: string | null;
}

export interface DBAssessmentRating {
  id: string;
  assessment_id: string;
  question_id: string;
  rating: number;
  comment: string | null;
}

const noopMut = {
  mutate: () => console.warn("[usePerformance] feature not yet on NestJS"),
  mutateAsync: async () => undefined,
  isPending: false,
};

// ─── Cycles ──────────────────────────────────────────────────────────────────

export function usePerformanceCycles() {
  return useCyclesApi();
}
export function useCreatePerformanceCycle() {
  return useCreateCycleApi();
}
export function useUpdatePerformanceCycle() {
  // Backend only exposes status change; richer edits aren't exposed yet.
  return useSetCycleStatus();
}
export function useDeletePerformanceCycle() {
  return noopMut;
}

// ─── Questionnaires ──────────────────────────────────────────────────────────

export function usePerformanceQuestionnaires(cycleId?: string | null) {
  return useQuestionnairesApi(cycleId);
}
export function useUpsertQuestionnaire() {
  return useUpsertQuestionnaireApi();
}
export function useDeleteQuestionnaire() {
  return noopMut;
}

// ─── Assessments ─────────────────────────────────────────────────────────────

export function usePerformanceAssessments(
  params: { cycleId?: string; reviewerId?: string } = {},
) {
  return useAssessmentsApi(params);
}
export function useUpsertPerformanceAssessment() {
  // The backend has two distinct mutations (create + submit). Default to
  // submit so the existing pages' "save" buttons work; create is reachable
  // via @/api directly if needed.
  return useSubmitAssessment();
}
export function useCreateAssessmentMutation() {
  return useCreateAssessment();
}
export function useSubmitAssessmentMutation() {
  return useSubmitAssessment();
}

// ─── Per-question assessment ratings (not yet ported) ────────────────────────

export function useAssessmentRatings(_assessmentId?: string) {
  return { data: [] as DBAssessmentRating[], isLoading: false };
}
export function useUpsertAssessmentRating() {
  return noopMut;
}
export function useDeleteAssessmentRating() {
  return noopMut;
}

// ─── Calibrations ────────────────────────────────────────────────────────────

export function usePerformanceCalibrations(cycleId?: string | null) {
  return useCalibrationsApi(cycleId);
}
export function useUpsertCalibration() {
  return useUpsertCalibrationApi();
}

// Legacy export names kept for compat
export function useCycles() {
  return usePerformanceCycles();
}
export function useAssessments(params: { cycleId?: string; reviewerId?: string } = {}) {
  return usePerformanceAssessments(params);
}
