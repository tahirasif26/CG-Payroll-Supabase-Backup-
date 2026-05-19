import type { PaginationQuery } from "../types";

export type LeaveAccrualType = "none" | "monthly" | "yearly";
export type LeaveRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface LeaveType {
  id: string;
  clientId: string;
  name: string;
  code: string;
  daysPerYear: string;
  accrualType: LeaveAccrualType;
  maxCarryforward: string;
  requiresApproval: boolean;
  genderSpecific: "male" | "female" | null;
  isPaid: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveBalance {
  id: string;
  clientId: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  allocated: string;
  used: string;
  carriedForward: string;
  leaveType?: LeaveType;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRequest {
  id: string;
  clientId: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  days: string;
  status: LeaveRequestStatus;
  reason: string | null;
  approvedById: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  leaveType?: LeaveType;
  employee?: { firstName: string; lastName: string; empId: string };
}

export interface Holiday {
  id: string;
  clientId: string;
  name: string;
  date: string;
  isOptional: boolean;
  appliesToLocations: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Request shapes ──────────────────────────────────────────────────────────

export interface CreateLeaveTypeRequest {
  name: string;
  code: string;
  daysPerYear?: string | number;
  accrualType?: LeaveAccrualType;
  maxCarryforward?: string | number;
  requiresApproval?: boolean;
  genderSpecific?: "male" | "female" | null;
  isPaid?: boolean;
  isActive?: boolean;
}
export type UpdateLeaveTypeRequest = Partial<CreateLeaveTypeRequest>;

export interface UpsertBalanceRequest {
  employeeId: string;
  leaveTypeId: string;
  year: number;
  allocated?: string | number;
  used?: string | number;
  carriedForward?: string | number;
}

export interface ListLeaveRequestsQuery extends PaginationQuery {
  employeeId?: string;
  status?: LeaveRequestStatus;
  leaveTypeId?: string;
  scope?: "mine" | "all";
}

export interface CreateLeaveRequestRequest {
  employeeId?: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  days: string | number;
  reason?: string;
}

export interface DecideLeaveRequestRequest {
  decision: "approve" | "reject";
  rejectionReason?: string;
}

export interface CreateHolidayRequest {
  name: string;
  date: string;
  isOptional?: boolean;
  appliesToLocations?: string[];
}
export type UpdateHolidayRequest = Partial<CreateHolidayRequest>;
export interface ListHolidaysQuery {
  year?: number;
  from?: string;
  to?: string;
}
