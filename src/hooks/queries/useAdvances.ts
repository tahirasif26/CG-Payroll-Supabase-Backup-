/**
 * Phase 4 shim — delegates to @/api/advances. Legacy snake_case row shape
 * preserved so callers don't break.
 */
import {
  useAdvances as useAdvancesApi,
  useCreateAdvance as useCreateAdvanceApi,
  useUpdateAdvance as useUpdateAdvanceApi,
  type Advance as ApiAdvance,
} from "@/api";

export interface AdvanceRow {
  id: string;
  client_id: string;
  employee_id: string;
  advance_name: string | null;
  purpose: string | null;
  amount: number;
  amount_used: number;
  currency: string;
  status: string;
  request_date: string;
  expected_spend_date: string | null;
  settlement_due_date: string | null;
  notes: string | null;
  payroll_run_id: string | null;
}

function adapt(a: ApiAdvance): AdvanceRow {
  return {
    id: a.id,
    client_id: a.clientId,
    employee_id: a.employeeId,
    advance_name: a.name,
    purpose: a.purpose,
    amount: Number(a.amount) || 0,
    amount_used: Number(a.amountUsed) || 0,
    currency: a.currency,
    status: a.status,
    request_date: a.createdAt,
    expected_spend_date: a.expectedSpendDate,
    settlement_due_date: a.settlementDueDate,
    notes: a.notes,
    payroll_run_id: null,
  };
}

export function useAdvances(filters?: { status?: string; employee_id?: string }) {
  const q = useAdvancesApi({
    pageSize: 500,
    status: filters?.status as never,
    employeeId: filters?.employee_id,
  });
  return { ...q, data: (q.data?.data ?? []).map(adapt) };
}

export function useCreateAdvance() {
  const m = useCreateAdvanceApi();
  return {
    ...m,
    mutate: (input: Partial<AdvanceRow>) =>
      m.mutate({
        employeeId: input.employee_id!,
        name: input.advance_name || "Advance",
        purpose: input.purpose,
        amount: input.amount ?? 0,
        currency: input.currency ?? "AED",
        expectedSpendDate: input.expected_spend_date,
        settlementDueDate: input.settlement_due_date,
        notes: input.notes,
        status: "submitted",
      }),
  };
}

export function useUpdateAdvance() {
  const m = useUpdateAdvanceApi();
  return {
    ...m,
    mutate: ({ id, patch }: { id: string; patch: Partial<AdvanceRow> }) =>
      m.mutate({
        id,
        body: {
          name: patch.advance_name ?? undefined,
          purpose: patch.purpose,
          amount: patch.amount,
          currency: patch.currency,
          notes: patch.notes,
        },
      }),
  };
}
