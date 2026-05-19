/** Phase 4 shim — delegates to @/api/expenses. */
import {
  useExpenses as useExpensesApi,
  useExpense as useExpenseApi,
  useCreateExpense as useCreateExpenseApi,
  useUpdateExpense as useUpdateExpenseApi,
  useDeleteExpense as useDeleteExpenseApi,
  type Expense as ApiExpense,
} from "@/api";

export interface ExpenseRow {
  id: string;
  client_id: string;
  employee_id: string;
  category: string | null;
  amount: number;
  currency: string;
  expense_date: string;
  description: string | null;
  receipt_url: string | null;
  status: string;
}

function adapt(e: ApiExpense): ExpenseRow {
  return {
    id: e.id,
    client_id: e.clientId,
    employee_id: e.employeeId,
    category: e.category,
    amount: Number(e.amount) || 0,
    currency: e.currency,
    expense_date: e.expenseDate,
    description: e.description,
    receipt_url: e.receiptUrl,
    status: e.status,
  };
}

export function useExpenses(filters?: { status?: string; employee_id?: string }) {
  const q = useExpensesApi({
    pageSize: 500,
    status: filters?.status as never,
    employeeId: filters?.employee_id,
  });
  return { ...q, data: (q.data?.data ?? []).map(adapt) };
}

export function useExpense(id: string | undefined) {
  const q = useExpenseApi(id);
  return { ...q, data: q.data ? adapt(q.data as ApiExpense) : undefined };
}

export function useCreateExpense() {
  const m = useCreateExpenseApi();
  return {
    ...m,
    mutate: (input: Partial<ExpenseRow>) =>
      m.mutate({
        category: input.category,
        amount: input.amount ?? 0,
        currency: input.currency ?? "AED",
        expenseDate: input.expense_date ?? new Date().toISOString().slice(0, 10),
        description: input.description,
        receiptUrl: input.receipt_url,
      }),
  };
}

export function useUpdateExpense() {
  const m = useUpdateExpenseApi();
  return {
    ...m,
    mutate: ({ id, patch }: { id: string; patch: Partial<ExpenseRow> }) =>
      m.mutate({ id, body: { description: patch.description, amount: patch.amount } }),
  };
}

export function useDeleteExpense() {
  return useDeleteExpenseApi();
}

export function useExpenseCategories() { return { data: [], isLoading: false }; }
export function useMileageEntries() { return { data: [], isLoading: false }; }
export function useCreateMileageEntry() {
  return {
    mutate: () => console.warn("[useExpenses] mileage entries not yet on NestJS"),
    mutateAsync: async () => undefined,
    isPending: false,
  };
}
