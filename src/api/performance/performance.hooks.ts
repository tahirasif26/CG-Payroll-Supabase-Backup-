import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { performanceApi } from "./performance.api";
import { tokenStorage } from "../token-storage";
import type {
  CreateAssessmentRequest,
  CreateCycleRequest,
  PerformanceCycleStatus,
  SubmitAssessmentRequest,
  UpsertCalibrationRequest,
  UpsertQuestionnaireRequest,
} from "./performance.types";

const enabled = () => !!tokenStorage.getAccessToken();
export const performanceKeys = {
  all: ["performance"] as const,
  cycles: () => [...performanceKeys.all, "cycles"] as const,
  questionnaires: (cycleId: string) => [...performanceKeys.all, "questionnaires", cycleId] as const,
  assessments: (params: object) => [...performanceKeys.all, "assessments", params] as const,
  calibrations: (cycleId: string) => [...performanceKeys.all, "calibrations", cycleId] as const,
};

export function usePerformanceCycles() {
  return useQuery({
    queryKey: performanceKeys.cycles(),
    queryFn: () => performanceApi.listCycles(),
    enabled: enabled(),
  });
}
export function useCreatePerformanceCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: CreateCycleRequest) => performanceApi.createCycle(b),
    onSuccess: () => qc.invalidateQueries({ queryKey: performanceKeys.cycles() }),
  });
}
export function useSetCycleStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: PerformanceCycleStatus }) =>
      performanceApi.setCycleStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: performanceKeys.cycles() }),
  });
}
export function useQuestionnaires(cycleId: string | null | undefined) {
  return useQuery({
    queryKey: performanceKeys.questionnaires(cycleId ?? ""),
    queryFn: () => performanceApi.listQuestionnaires(cycleId!),
    enabled: !!cycleId && enabled(),
  });
}
export function useUpsertQuestionnaire() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: UpsertQuestionnaireRequest) => performanceApi.upsertQuestionnaire(b),
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: performanceKeys.questionnaires(vars.cycleId) }),
  });
}
export function usePerformanceAssessments(params: { cycleId?: string; reviewerId?: string } = {}) {
  return useQuery({
    queryKey: performanceKeys.assessments(params),
    queryFn: () => performanceApi.listAssessments(params),
    enabled: enabled(),
  });
}
export function useCreateAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: CreateAssessmentRequest) => performanceApi.createAssessment(b),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...performanceKeys.all, "assessments"] }),
  });
}
export function useSubmitAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: SubmitAssessmentRequest }) =>
      performanceApi.submitAssessment(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...performanceKeys.all, "assessments"] }),
  });
}
export function useCalibrations(cycleId: string | null | undefined) {
  return useQuery({
    queryKey: performanceKeys.calibrations(cycleId ?? ""),
    queryFn: () => performanceApi.listCalibrations(cycleId!),
    enabled: !!cycleId && enabled(),
  });
}
export function useUpsertCalibration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: UpsertCalibrationRequest) => performanceApi.upsertCalibration(b),
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: performanceKeys.calibrations(vars.cycleId) }),
  });
}
