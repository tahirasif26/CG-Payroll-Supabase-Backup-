/** Phase 4 shim — delegates to @/api/loans. */
import {
  useLoans as useLoansApi,
  useLoan as useLoanApi,
  useCreateLoan as useCreateLoanApi,
  useUpdateLoan as useUpdateLoanApi,
  useAdjustLoan,
  type Loan as ApiLoan,
} from "@/api";

export interface DbLoan {
  id: string;
  client_id: string;
  employee_id: string;
  principal: number;
  remaining_balance: number;
  monthly_deduction: number;
  status: string;
  start_date: string;
}
export interface DbLoanTransaction {
  id: string;
  loan_id: string;
  type: string;
  amount: number;
  balance_after: number;
  date: string;
  note: string | null;
}

function adapt(l: ApiLoan): DbLoan {
  return {
    id: l.id,
    client_id: l.clientId,
    employee_id: l.employeeId,
    principal: Number(l.principal) || 0,
    remaining_balance: Number(l.remainingBalance) || 0,
    monthly_deduction: Number(l.monthlyDeduction) || 0,
    status: l.status,
    start_date: l.startDate,
  };
}

export function useLoans(filters?: { status?: string; employee_id?: string }) {
  const q = useLoansApi({
    pageSize: 500,
    status: filters?.status as never,
    employeeId: filters?.employee_id,
  });
  return { ...q, data: (q.data?.data ?? []).map(adapt) };
}

export function useLoan(id: string | undefined) {
  const q = useLoanApi(id);
  return { ...q, data: q.data ? adapt(q.data as ApiLoan) : undefined };
}

export function useLoanTransactions(loan_id?: string) {
  const q = useLoanApi(loan_id);
  const txns: DbLoanTransaction[] = (q.data?.transactions ?? []).map((t) => ({
    id: t.id,
    loan_id: t.loanId,
    type: t.type,
    amount: Number(t.amount) || 0,
    balance_after: Number(t.balanceAfter) || 0,
    date: t.date,
    note: t.note,
  }));
  return { ...q, data: txns };
}

export function useCreateLoan() {
  const m = useCreateLoanApi();
  return {
    ...m,
    mutate: (input: Partial<DbLoan>) =>
      m.mutate({
        employeeId: input.employee_id!,
        principal: input.principal ?? 0,
        monthlyDeduction: input.monthly_deduction ?? 0,
        startDate: input.start_date ?? new Date().toISOString().slice(0, 10),
      }),
  };
}

export function useUpdateLoan() {
  const m = useUpdateLoanApi();
  return {
    ...m,
    mutate: ({ id, patch }: { id: string; patch: Partial<DbLoan> }) =>
      m.mutate({
        id,
        body: {
          principal: patch.principal,
          monthlyDeduction: patch.monthly_deduction,
        },
      }),
  };
}

export function useAddLoanTransaction() {
  const m = useAdjustLoan();
  return {
    ...m,
    mutate: ({ loan_id, type, amount, date, note }: { loan_id: string; type: string; amount: number; date: string; note?: string }) =>
      m.mutate({
        id: loan_id,
        body: { type: type as never, amount, date, note },
      }),
  };
}
