import type { PaginationQuery } from "../types";

export type LoanStatus = "draft" | "active" | "paused" | "completed" | "cancelled";
export type LoanTxnType =
  | "disbursement"
  | "emi"
  | "prepayment"
  | "writeoff"
  | "pause"
  | "resume"
  | "adjustment";

export interface LoanTransaction {
  id: string;
  loanId: string;
  clientId: string;
  type: LoanTxnType;
  amount: string;
  balanceAfter: string;
  emiAtTime: string | null;
  date: string;
  note: string | null;
  createdAt: string;
}

export interface Loan {
  id: string;
  clientId: string;
  employeeId: string;
  principal: string;
  remainingBalance: string;
  interestRateBps: number;
  monthlyDeduction: string;
  startDate: string;
  endDate: string | null;
  pausedUntil: string | null;
  prePauseEmi: string | null;
  status: LoanStatus;
  reason: string | null;
  approvedById: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: { firstName: string; lastName: string; empId: string };
  transactions?: LoanTransaction[];
}

export interface ListLoansQuery extends PaginationQuery {
  status?: LoanStatus;
  employeeId?: string;
  scope?: "mine" | "all";
}

export interface CreateLoanRequest {
  employeeId: string;
  principal: string | number;
  monthlyDeduction: string | number;
  interestRateBps?: number;
  startDate: string;
  endDate?: string | null;
  reason?: string | null;
}

export type UpdateLoanRequest = Partial<Omit<CreateLoanRequest, "employeeId">>;

export interface DecideLoanRequest {
  decision: "approve" | "reject";
  rejectionReason?: string;
}

export interface PauseLoanRequest {
  until: string;
  reason?: string;
}

export interface AdjustLoanRequest {
  type: "prepayment" | "writeoff" | "adjustment" | "emi";
  amount: string | number;
  date: string;
  note?: string;
}
