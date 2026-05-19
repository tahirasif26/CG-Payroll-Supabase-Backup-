import { apiGet, apiGetWithMeta, apiPatch, apiPost } from "../client";
import type { ApiResponse } from "../types";
import type {
  AdjustLoanRequest,
  CreateLoanRequest,
  DecideLoanRequest,
  ListLoansQuery,
  Loan,
  PauseLoanRequest,
  UpdateLoanRequest,
} from "./loans.types";

export const loansApi = {
  list: (query: ListLoansQuery = {}): Promise<ApiResponse<Loan[]>> =>
    apiGetWithMeta<Loan[]>("/loans", query as Record<string, unknown>),
  findById: (id: string): Promise<Loan> => apiGet<Loan>(`/loans/${id}`),
  create: (b: CreateLoanRequest): Promise<Loan> => apiPost<Loan>("/loans", b),
  update: (id: string, b: UpdateLoanRequest): Promise<Loan> =>
    apiPatch<Loan>(`/loans/${id}`, b),
  decide: (id: string, b: DecideLoanRequest): Promise<Loan> =>
    apiPost<Loan>(`/loans/${id}/decision`, b),
  pause: (id: string, b: PauseLoanRequest): Promise<Loan> =>
    apiPost<Loan>(`/loans/${id}/pause`, b),
  resume: (id: string): Promise<Loan> => apiPost<Loan>(`/loans/${id}/resume`),
  adjust: (id: string, b: AdjustLoanRequest): Promise<Loan> =>
    apiPost<Loan>(`/loans/${id}/adjust`, b),
};
