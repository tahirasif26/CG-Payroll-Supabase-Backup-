/** Phase 6 shim — delegates to @/api/payroll. */
import {
  usePayrollSetups as usePayrollSetupsApi,
  usePayrollRuns as usePayrollRunsApi,
  usePayrollRun as usePayrollRunApi,
  useCreatePayrollRun as useCreatePayrollRunApi,
  useCalculatePayrollRun,
  useFinalizeApprovePayrollRun,
  useMyPayslips as useMyPayslipsApi,
} from "@/api";

export function usePayrollSetups() { return usePayrollSetupsApi(); }
export function usePayrollRuns(filters?: { setup_id?: string; year?: number; status?: string }) {
  return usePayrollRunsApi({
    setupId: filters?.setup_id,
    year: filters?.year,
    status: filters?.status as never,
  });
}
export function usePayrollRun(id: string | undefined) { return usePayrollRunApi(id); }
export function useCreatePayrollRun() { return useCreatePayrollRunApi(); }
export function useCalculatePayroll() { return useCalculatePayrollRun(); }
export function useApprovePayrollRun() { return useFinalizeApprovePayrollRun(); }
export function useMyPayslips() { return useMyPayslipsApi(); }
