import type { PaginationQuery } from "../types";

export type ExpenseStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "paid";

export interface Expense {
  id: string;
  clientId: string;
  employeeId: string;
  category: string | null;
  /** BigInt minor units as string. */
  amount: string;
  currency: string;
  expenseDate: string;
  description: string | null;
  receiptUrl: string | null;
  status: ExpenseStatus;
  projectCode: string | null;
  approvedById: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: { firstName: string; lastName: string; empId: string };
}

export interface ListExpensesQuery extends PaginationQuery {
  status?: ExpenseStatus;
  employeeId?: string;
  category?: string;
  scope?: "mine" | "all";
  from?: string;
  to?: string;
}

export interface CreateExpenseRequest {
  employeeId?: string;
  category?: string | null;
  amount: string | number;
  currency?: string;
  expenseDate: string;
  description?: string | null;
  receiptUrl?: string | null;
  projectCode?: string | null;
  status?: "draft" | "submitted";
}

export type UpdateExpenseRequest = Partial<Omit<CreateExpenseRequest, "employeeId">>;

export interface DecideExpenseRequest {
  decision: "approve" | "reject";
  rejectionReason?: string;
}
