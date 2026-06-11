import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { payrollApi } from "./payroll.api";
import { tokenStorage } from "../token-storage";
import type {
  CreatePayrollRunRequest,
  CreatePayrollSetupRequest,
  ListPayrollRunsQuery,
  OneOffAdjustmentRequest,
  UpdatePayrollSetupRequest,
} from "./payroll.types";

const enabled = () => !!tokenStorage.getAccessToken();

export const payrollKeys = {
  all: ["payroll"] as const,
  setups: () => [...payrollKeys.all, "setups"] as const,
  setup: (id: string) => [...payrollKeys.all, "setup", id] as const,
  runs: (q: ListPayrollRunsQuery) => [...payrollKeys.all, "runs", q] as const,
  run: (id: string) => [...payrollKeys.all, "run", id] as const,
  myPayslips: () => [...payrollKeys.all, "payslips", "mine"] as const,
};

// ─── Setups ──────────────────────────────────────────────────────────────────

export function usePayrollSetups(opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: payrollKeys.setups(),
    queryFn: () => payrollApi.listSetups(),
    enabled: enabled() && (opts.enabled ?? true),
  });
}
export function usePayrollSetup(id: string | null | undefined) {
  return useQuery({
    queryKey: payrollKeys.setup(id ?? ""),
    queryFn: () => payrollApi.findSetup(id!),
    enabled: !!id && enabled(),
  });
}
export function useCreatePayrollSetup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: CreatePayrollSetupRequest) => payrollApi.createSetup(b),
    onSuccess: () => qc.invalidateQueries({ queryKey: payrollKeys.setups() }),
  });
}
export function useUpdatePayrollSetup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePayrollSetupRequest }) =>
      payrollApi.updateSetup(id, body),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: payrollKeys.setup(vars.id) });
      qc.invalidateQueries({ queryKey: payrollKeys.setups() });
    },
  });
}
export function useDeletePayrollSetup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payrollApi.deleteSetup(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: payrollKeys.setups() }),
  });
}

// ─── Runs ────────────────────────────────────────────────────────────────────

export function usePayrollRuns(query: ListPayrollRunsQuery = {}) {
  return useQuery({
    queryKey: payrollKeys.runs(query),
    // listRuns() returns the `ApiResponse` envelope (data + meta) because the
    // paginated meta is useful elsewhere. Most callers (PayrollPage included)
    // expect a plain array, so unwrap here.
    queryFn: async () => {
      const res = await payrollApi.listRuns(query);
      return res.data ?? [];
    },
    enabled: enabled(),
  });
}
export function usePayrollRun(id: string | null | undefined) {
  return useQuery({
    queryKey: payrollKeys.run(id ?? ""),
    queryFn: () => payrollApi.findRun(id!),
    enabled: !!id && enabled(),
  });
}
export function useCreatePayrollRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: CreatePayrollRunRequest) => payrollApi.createRun(b),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...payrollKeys.all, "runs"] }),
  });
}
export function useCalculatePayrollRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payrollApi.calculate(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: payrollKeys.run(id) });
      qc.invalidateQueries({ queryKey: [...payrollKeys.all, "runs"] });
    },
  });
}
export function useSubmitPayrollRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payrollApi.submit(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: payrollKeys.run(id) });
      qc.invalidateQueries({ queryKey: [...payrollKeys.all, "runs"] });
    },
  });
}
export function useFinalizeApprovePayrollRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payrollApi.finalizeApprove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: payrollKeys.all }),
  });
}
export function useCompletePayrollRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payrollApi.complete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: payrollKeys.all }),
  });
}

// ─── One-offs ────────────────────────────────────────────────────────────────

export function useAddPayrollOneOff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ runId, body }: { runId: string; body: OneOffAdjustmentRequest }) =>
      payrollApi.addOneOff(runId, body),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: payrollKeys.run(vars.runId) }),
  });
}
export function useRemovePayrollOneOff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ runId, oneOffId }: { runId: string; oneOffId: string }) =>
      payrollApi.removeOneOff(runId, oneOffId),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: payrollKeys.run(vars.runId) }),
  });
}

// ─── Payslips ────────────────────────────────────────────────────────────────

export function useMyPayslips() {
  return useQuery({
    queryKey: payrollKeys.myPayslips(),
    queryFn: () => payrollApi.listMyPayslips(),
    enabled: enabled(),
  });
}
