import { apiDelete, apiGet, apiGetWithMeta, apiPatch, apiPost } from "../client";
import type { ApiResponse } from "../types";
import type {
  CreateExpenseRequest,
  DecideExpenseRequest,
  Expense,
  ListExpensesQuery,
  UpdateExpenseRequest,
} from "./expenses.types";

export const expensesApi = {
  list: (query: ListExpensesQuery = {}): Promise<ApiResponse<Expense[]>> =>
    apiGetWithMeta<Expense[]>("/expenses", query as Record<string, unknown>),
  findById: (id: string): Promise<Expense> => apiGet<Expense>(`/expenses/${id}`),
  create: (b: CreateExpenseRequest): Promise<Expense> => apiPost<Expense>("/expenses", b),
  update: (id: string, b: UpdateExpenseRequest): Promise<Expense> =>
    apiPatch<Expense>(`/expenses/${id}`, b),
  submit: (id: string): Promise<Expense> => apiPost<Expense>(`/expenses/${id}/submit`),
  decide: (id: string, b: DecideExpenseRequest): Promise<Expense> =>
    apiPost<Expense>(`/expenses/${id}/decision`, b),
  markPaid: (id: string): Promise<Expense> => apiPost<Expense>(`/expenses/${id}/mark-paid`),
  delete: (id: string): Promise<Expense> => apiDelete<Expense>(`/expenses/${id}`),
};
