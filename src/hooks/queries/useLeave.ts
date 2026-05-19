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
  return {
    ...m,
    mutate: ({ id, patch }: { id: string; patch: { status?: string; rejection_reason?: string } }) => {
      if (patch.status === "approved") m.mutate({ id, body: { decision: "approve" } });
      else if (patch.status === "rejected") m.mutate({ id, body: { decision: "reject", rejectionReason: patch.rejection_reason } });
    },
  };
}
export function useHolidays() { return useHolidaysApi(); }
