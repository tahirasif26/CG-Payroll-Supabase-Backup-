import { apiDelete, apiGet, apiGetWithMeta, apiPatch, apiPost } from "../client";
import type { ApiResponse } from "../types";
import type {
  CreateHolidayRequest,
  CreateLeaveRequestRequest,
  CreateLeaveTypeRequest,
  DecideLeaveRequestRequest,
  Holiday,
  LeaveBalance,
  LeaveRequest,
  LeaveType,
  ListHolidaysQuery,
  ListLeaveRequestsQuery,
  UpdateHolidayRequest,
  UpdateLeaveTypeRequest,
  UpsertBalanceRequest,
} from "./leave.types";

export const leaveApi = {
  // ─── Leave types ───────────────────────────────────────────────────────────
  listTypes: (): Promise<LeaveType[]> => apiGet<LeaveType[]>("/leave-types"),
  createType: (body: CreateLeaveTypeRequest): Promise<LeaveType> =>
    apiPost<LeaveType>("/leave-types", body),
  updateType: (id: string, body: UpdateLeaveTypeRequest): Promise<LeaveType> =>
    apiPatch<LeaveType>(`/leave-types/${id}`, body),
  deleteType: (id: string): Promise<LeaveType> => apiDelete<LeaveType>(`/leave-types/${id}`),

  // ─── Balances ──────────────────────────────────────────────────────────────
  listBalances: (params: {
    employeeId?: string;
    leaveTypeId?: string;
    year?: number;
  } = {}): Promise<LeaveBalance[]> => apiGet<LeaveBalance[]>("/leave-balances", params),
  upsertBalance: (body: UpsertBalanceRequest): Promise<LeaveBalance> =>
    apiPost<LeaveBalance>("/leave-balances", body),

  // ─── Requests ──────────────────────────────────────────────────────────────
  listRequests: (
    query: ListLeaveRequestsQuery = {},
  ): Promise<ApiResponse<LeaveRequest[]>> =>
    apiGetWithMeta<LeaveRequest[]>("/leave-requests", query as Record<string, unknown>),
  createRequest: (body: CreateLeaveRequestRequest): Promise<LeaveRequest> =>
    apiPost<LeaveRequest>("/leave-requests", body),
  decideRequest: (id: string, body: DecideLeaveRequestRequest): Promise<LeaveRequest> =>
    apiPost<LeaveRequest>(`/leave-requests/${id}/decision`, body),
  cancelRequest: (id: string): Promise<LeaveRequest> =>
    apiPost<LeaveRequest>(`/leave-requests/${id}/cancel`),

  // ─── Holidays ──────────────────────────────────────────────────────────────
  listHolidays: (query: ListHolidaysQuery = {}): Promise<Holiday[]> =>
    apiGet<Holiday[]>("/holidays", query as Record<string, unknown>),
  createHoliday: (body: CreateHolidayRequest): Promise<Holiday> =>
    apiPost<Holiday>("/holidays", body),
  updateHoliday: (id: string, body: UpdateHolidayRequest): Promise<Holiday> =>
    apiPatch<Holiday>(`/holidays/${id}`, body),
  deleteHoliday: (id: string): Promise<Holiday> => apiDelete<Holiday>(`/holidays/${id}`),
};
