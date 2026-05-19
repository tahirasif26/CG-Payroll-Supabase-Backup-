import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { expensesApi } from "./expenses.api";
import { tokenStorage } from "../token-storage";
import type {
  CreateExpenseRequest,
  DecideExpenseRequest,
  ListExpensesQuery,
  UpdateExpenseRequest,
} from "./expenses.types";

const enabled = () => !!tokenStorage.getAccessToken();

export const expenseKeys = {
  all: ["expenses"] as const,
  list: (q: ListExpensesQuery) => [...expenseKeys.all, "list", q] as const,
  detail: (id: string) => [...expenseKeys.all, "detail", id] as const,
};

export function useExpenses(query: ListExpensesQuery = {}) {
  return useQuery({
    queryKey: expenseKeys.list(query),
    queryFn: () => expensesApi.list(query),
    enabled: enabled(),
  });
}

export function useExpense(id: string | null | undefined) {
  return useQuery({
    queryKey: expenseKeys.detail(id ?? ""),
    queryFn: () => expensesApi.findById(id!),
    enabled: !!id && enabled(),
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: CreateExpenseRequest) => expensesApi.create(b),
    onSuccess: () => qc.invalidateQueries({ queryKey: expenseKeys.all }),
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateExpenseRequest }) =>
      expensesApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: expenseKeys.all }),
  });
}

export function useSubmitExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => expensesApi.submit(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: expenseKeys.all }),
  });
}

export function useDecideExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: DecideExpenseRequest }) =>
      expensesApi.decide(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: expenseKeys.all }),
  });
}

export function useMarkExpensePaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => expensesApi.markPaid(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: expenseKeys.all }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => expensesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: expenseKeys.all }),
  });
}
