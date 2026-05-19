import type { PaginationQuery } from "../types";

export type AdvanceStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "settled"
  | "cancelled";

export interface Advance {
  id: string;
  clientId: string;
  employeeId: string;
  name: string;
  purpose: string | null;
  /** BigInt minor units as string. */
  amount: string;
  currency: string;
  amountUsed: string;
  status: AdvanceStatus;
  expectedSpendDate: string | null;
  settlementDueDate: string | null;
  approvedById: string | null;
  approvedAt: string | null;
  settledAt: string | null;
  rejectionReason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: { firstName: string; lastName: string; empId: string };
}

export interface ListAdvancesQuery extends PaginationQuery {
  status?: AdvanceStatus;
  employeeId?: string;
  scope?: "mine" | "all";
}

export interface CreateAdvanceRequest {
  employeeId?: string;
  name: string;
  purpose?: string | null;
  amount: string | number;
  currency?: string;
  expectedSpendDate?: string | null;
  settlementDueDate?: string | null;
  notes?: string | null;
  status?: "draft" | "submitted";
}

export type UpdateAdvanceRequest = Partial<Omit<CreateAdvanceRequest, "employeeId">>;

export interface DecideAdvanceRequest {
  decision: "approve" | "reject";
  rejectionReason?: string;
}

export interface SettleAdvanceRequest {
  amountUsed?: string | number;
}
