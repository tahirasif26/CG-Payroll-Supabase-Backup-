import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { loansApi } from "./loans.api";
import { tokenStorage } from "../token-storage";
import type {
  AdjustLoanRequest,
  CreateLoanRequest,
  DecideLoanRequest,
  ListLoansQuery,
  PauseLoanRequest,
  UpdateLoanRequest,
} from "./loans.types";

const enabled = () => !!tokenStorage.getAccessToken();

export const loanKeys = {
  all: ["loans"] as const,
  list: (q: ListLoansQuery) => [...loanKeys.all, "list", q] as const,
  detail: (id: string) => [...loanKeys.all, "detail", id] as const,
};

export function useLoans(query: ListLoansQuery = {}) {
  return useQuery({
    queryKey: loanKeys.list(query),
    queryFn: () => loansApi.list(query),
    enabled: enabled(),
  });
}

export function useLoan(id: string | null | undefined) {
  return useQuery({
    queryKey: loanKeys.detail(id ?? ""),
    queryFn: () => loansApi.findById(id!),
    enabled: !!id && enabled(),
  });
}

export function useCreateLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: CreateLoanRequest) => loansApi.create(b),
    onSuccess: () => qc.invalidateQueries({ queryKey: loanKeys.all }),
  });
}

export function useUpdateLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateLoanRequest }) =>
      loansApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: loanKeys.all }),
  });
}

export function useDecideLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: DecideLoanRequest }) =>
      loansApi.decide(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: loanKeys.all }),
  });
}

export function usePauseLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PauseLoanRequest }) =>
      loansApi.pause(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: loanKeys.all }),
  });
}

export function useResumeLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => loansApi.resume(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: loanKeys.all }),
  });
}

export function useAdjustLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdjustLoanRequest }) =>
      loansApi.adjust(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: loanKeys.all }),
  });
}
