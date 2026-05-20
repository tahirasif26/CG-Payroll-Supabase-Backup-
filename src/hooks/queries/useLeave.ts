/** Phase 4 shim — delegates to @/api/leave. */
import {
  useLeaveTypes as useLeaveTypesApi,
  useCreateLeaveType as useCreateLeaveTypeApi,
  useUpdateLeaveType as useUpdateLeaveTypeApi,
  useLeaveBalances as useLeaveBalancesApi,
  useLeaveRequests as useLeaveRequestsApi,
  useCreateLeaveRequest as useCreateLeaveRequestApi,
  useDecideLeaveRequest as useDecideLeaveRequestApi,
  useHolidays as useHolidaysApi,
} from "@/api";

export function useLeaveTypes() { return useLeaveTypesApi(); }
export function useCreateLeaveType() { return useCreateLeaveTypeApi(); }
export function useUpdateLeaveType() { return useUpdateLeaveTypeApi(); }
export function useLeaveBalances(employee_id?: string, year?: number) {
  return useLeaveBalancesApi({ employeeId: employee_id, year });
}
export function useLeaveRequests(filters?: { status?: string; employee_id?: string }) {
  return useLeaveRequestsApi({
    status: filters?.status as never,
    employeeId: filters?.employee_id,
  });
}
export function useCreateLeaveRequest() { return useCreateLeaveRequestApi(); }
export function useUpdateLeaveRequest() {
  const m = useDecideLeaveRequestApi();
  const buildBody = (patch: { status?: string; rejection_reason?: string }) => {
    if (patch.status === "approved") return { decision: "approve" as const };
    if (patch.status === "rejected")
      return { decision: "reject" as const, rejectionReason: patch.rejection_reason };
    return null;
  };
  return {
    ...m,
    mutate: ({ id, patch }: { id: string; patch: { status?: string; rejection_reason?: string } }) => {
      const body = buildBody(patch);
      if (body) m.mutate({ id, body });
    },
    mutateAsync: async ({ id, patch }: { id: string; patch: { status?: string; rejection_reason?: string } }) => {
      const body = buildBody(patch);
      if (body) return m.mutateAsync({ id, body });
      return undefined as never;
    },
  };
}
export function useHolidays() { return useHolidaysApi(); }
