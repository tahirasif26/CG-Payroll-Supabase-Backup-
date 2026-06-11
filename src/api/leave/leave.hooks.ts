import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { leaveApi } from "./leave.api";
import { tokenStorage } from "../token-storage";
import type {
  CreateHolidayRequest,
  CreateLeaveRequestRequest,
  CreateLeaveTypeRequest,
  DecideLeaveRequestRequest,
  ListHolidaysQuery,
  ListLeaveRequestsQuery,
  UpdateHolidayRequest,
  UpdateLeaveTypeRequest,
  UpsertBalanceRequest,
} from "./leave.types";

const enabled = () => !!tokenStorage.getAccessToken();

export const leaveKeys = {
  all: ["leave"] as const,
  types: () => [...leaveKeys.all, "types"] as const,
  balances: (q: object) => [...leaveKeys.all, "balances", q] as const,
  requests: (q: ListLeaveRequestsQuery) => [...leaveKeys.all, "requests", q] as const,
  holidays: (q: ListHolidaysQuery) => [...leaveKeys.all, "holidays", q] as const,
};

// ─── Leave types ─────────────────────────────────────────────────────────────

export function useLeaveTypes(opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: leaveKeys.types(),
    queryFn: () => leaveApi.listTypes(),
    enabled: enabled() && (opts.enabled ?? true),
  });
}

export function useCreateLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: CreateLeaveTypeRequest) => leaveApi.createType(b),
    onSuccess: () => qc.invalidateQueries({ queryKey: leaveKeys.types() }),
  });
}

export function useUpdateLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateLeaveTypeRequest }) =>
      leaveApi.updateType(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: leaveKeys.types() }),
  });
}

export function useDeleteLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leaveApi.deleteType(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: leaveKeys.types() }),
  });
}

// ─── Balances ────────────────────────────────────────────────────────────────

export function useLeaveBalances(
  params: {
    employeeId?: string;
    leaveTypeId?: string;
    year?: number;
  } = {},
  opts: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: leaveKeys.balances(params),
    queryFn: () => leaveApi.listBalances(params),
    enabled: enabled() && (opts.enabled ?? true),
  });
}

export function useUpsertLeaveBalance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: UpsertBalanceRequest) => leaveApi.upsertBalance(b),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...leaveKeys.all, "balances"] }),
  });
}

// ─── Requests ────────────────────────────────────────────────────────────────

export function useLeaveRequests(query: ListLeaveRequestsQuery = {}) {
  return useQuery({
    queryKey: leaveKeys.requests(query),
    queryFn: () => leaveApi.listRequests(query),
    enabled: enabled(),
  });
}

export function useCreateLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: CreateLeaveRequestRequest) => leaveApi.createRequest(b),
    onSuccess: () => qc.invalidateQueries({ queryKey: leaveKeys.all }),
  });
}

export function useDecideLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: DecideLeaveRequestRequest }) =>
      leaveApi.decideRequest(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: leaveKeys.all }),
  });
}

export function useCancelLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leaveApi.cancelRequest(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: leaveKeys.all }),
  });
}

// ─── Holidays ────────────────────────────────────────────────────────────────

export function useHolidays(query: ListHolidaysQuery = {}) {
  return useQuery({
    queryKey: leaveKeys.holidays(query),
    queryFn: () => leaveApi.listHolidays(query),
    enabled: enabled(),
  });
}

export function useCreateHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: CreateHolidayRequest) => leaveApi.createHoliday(b),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...leaveKeys.all, "holidays"] }),
  });
}

export function useUpdateHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateHolidayRequest }) =>
      leaveApi.updateHoliday(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...leaveKeys.all, "holidays"] }),
  });
}

export function useDeleteHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leaveApi.deleteHoliday(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...leaveKeys.all, "holidays"] }),
  });
}
