import { apiClient, apiDelete, apiGet, apiGetWithMeta, apiPatch, apiPost } from "../client";
import { ApiClientError } from "../errors";
import type { ApiResponse } from "../types";
import type {
  CreatePayrollRunRequest,
  CreatePayrollSetupRequest,
  ListPayrollRunsQuery,
  OneOffAdjustmentRequest,
  PayrollOneOff,
  PayrollRun,
  PayrollSetup,
  Payslip,
  UpdatePayrollSetupRequest,
} from "./payroll.types";

export const payrollApi = {
  // setups
  listSetups: (): Promise<PayrollSetup[]> => apiGet<PayrollSetup[]>("/payroll-setups"),
  findSetup: (id: string): Promise<PayrollSetup> => apiGet<PayrollSetup>(`/payroll-setups/${id}`),
  createSetup: (b: CreatePayrollSetupRequest): Promise<PayrollSetup> =>
    apiPost<PayrollSetup>("/payroll-setups", b),
  updateSetup: (id: string, b: UpdatePayrollSetupRequest): Promise<PayrollSetup> =>
    apiPatch<PayrollSetup>(`/payroll-setups/${id}`, b),
  deleteSetup: (id: string): Promise<{ id: string; deleted: boolean }> =>
    apiDelete<{ id: string; deleted: boolean }>(`/payroll-setups/${id}`),

  // runs
  listRuns: (q: ListPayrollRunsQuery = {}): Promise<ApiResponse<PayrollRun[]>> =>
    apiGetWithMeta<PayrollRun[]>("/payroll-runs", q as Record<string, unknown>),
  findRun: (id: string): Promise<PayrollRun> => apiGet<PayrollRun>(`/payroll-runs/${id}`),
  createRun: (b: CreatePayrollRunRequest): Promise<PayrollRun> =>
    apiPost<PayrollRun>("/payroll-runs", b),
  calculate: (id: string): Promise<PayrollRun> =>
    apiPost<PayrollRun>(`/payroll-runs/${id}/calculate`),
  submit: (id: string): Promise<PayrollRun> => apiPost<PayrollRun>(`/payroll-runs/${id}/submit`),
  finalizeApprove: (id: string): Promise<PayrollRun> =>
    apiPost<PayrollRun>(`/payroll-runs/${id}/finalize-approve`),
  complete: (id: string): Promise<PayrollRun> =>
    apiPost<PayrollRun>(`/payroll-runs/${id}/complete`),

  // one-offs
  addOneOff: (runId: string, b: OneOffAdjustmentRequest): Promise<PayrollOneOff> =>
    apiPost<PayrollOneOff>(`/payroll-runs/${runId}/one-offs`, b),
  async removeOneOff(runId: string, oneOffId: string): Promise<{ count: number }> {
    const res = await apiClient.delete<ApiResponse<{ count: number }>>(
      `/payroll-runs/${runId}/one-offs/${oneOffId}`,
    );
    if (!res.data?.success) {
      throw new ApiClientError(res.status, res.data?.error ?? {
        code: "UNEXPECTED_RESPONSE",
        message: "Failed to delete one-off",
      });
    }
    return res.data.data as { count: number };
  },

  // payslips
  listMyPayslips: (): Promise<Payslip[]> => apiGet<Payslip[]>("/payslips/mine"),
};
