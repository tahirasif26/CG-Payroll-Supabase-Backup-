import { createContext, useContext, useMemo, ReactNode } from "react";
import {
  useSeparations as useSeparationsApi,
  useCreateSeparation,
  useApproveSeparation,
  type Separation as ApiSeparation,
  type SeparationStatus,
} from "@/api";

/**
 * Migrated to NestJS via @/api/separations. The legacy SeparationRecord shape
 * had both snake_case and camelCase versions of every field — both are
 * populated here so existing pages don't have to change.
 */

export interface SeparationRecord {
  id: string;
  client_id: string;
  employee_id: string;
  last_working_date: string;
  reason?: string;
  type: string;
  notice_period_days: number;
  notice_period_served: boolean;
  unpaid_salary: number;
  eosb_amount: number;
  eosb_breakdown: { name: string; amount: number }[];
  leave_encashment: number;
  notice_period_pay: number;
  loan_deduction: number;
  total_settlement: number;
  status: "pending" | "approved" | "processing" | "completed" | "cancelled";
  payroll_run_id?: string | null;
  approved_by?: string | null;
  processed_date?: string | null;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
  employee?: {
    first_name: string;
    last_name: string;
    emp_id: string;
    department: string;
    designation: string;
  };
  employeeId?: string;
  employeeName?: string;
  empId?: string;
  department?: string;
  designation?: string;
  lastDate?: string;
  noticePeriodDays?: number;
  noticePeriodServed?: boolean;
  unpaidSalary?: number;
  eosAmount?: number;
  eosBreakdown?: { name: string; amount: number }[];
  leaveEncashment?: number;
  noticePeriodPay?: number;
  noticePeriodRecovery?: number;
  loanDeduction?: number;
  totalSettlement?: number;
  processedDate?: string;
  payrollMonth?: string;
  payrollYear?: number;
  payrollRunId?: string;
  currency?: string;
}

interface SeparationContextValue {
  separations: SeparationRecord[];
  isLoading: boolean;
  addSeparation: (data: any) => Promise<void>;
  updateSeparation: (id: string, patch: any) => Promise<void>;
  removeSeparation: (id: string) => Promise<void>;
}

const SeparationContext = createContext<SeparationContextValue>({
  separations: [],
  isLoading: false,
  addSeparation: async () => {},
  updateSeparation: async () => {},
  removeSeparation: async () => {},
});

function statusFromApi(s: SeparationStatus): SeparationRecord["status"] {
  if (s === "processed") return "completed";
  return s as SeparationRecord["status"];
}

function adapt(a: ApiSeparation): SeparationRecord {
  const eosbBreakdown =
    Array.isArray((a.eosbBreakdown as any)?.components)
      ? ((a.eosbBreakdown as any).components as Array<{ label?: string; amountMinor?: string }>).map(
          (c) => ({ name: c.label ?? "", amount: Number(c.amountMinor ?? 0) }),
        )
      : [];

  return {
    id: a.id,
    client_id: a.clientId,
    employee_id: a.employeeId,
    last_working_date: a.lastWorkingDate,
    reason: a.reason ?? undefined,
    type: a.type,
    notice_period_days: a.noticePeriodDays,
    notice_period_served: a.noticePeriodServed,
    unpaid_salary: Number(a.unpaidSalaryMinor) || 0,
    eosb_amount: Number(a.eosbAmountMinor) || 0,
    eosb_breakdown: eosbBreakdown,
    leave_encashment: Number(a.leaveEncashmentMinor) || 0,
    notice_period_pay: Number(a.noticePeriodPayMinor) || 0,
    loan_deduction: Number(a.loanDeductionMinor) || 0,
    total_settlement: Number(a.totalSettlementMinor) || 0,
    status: statusFromApi(a.status),
    payroll_run_id: a.payrollRunId,
    processed_date: a.processedDate,
    created_at: "",
    updated_at: "",
    employee: a.employee
      ? {
          first_name: a.employee.firstName,
          last_name: a.employee.lastName,
          emp_id: a.employee.empId,
          department: "",
          designation: "",
        }
      : undefined,
    // Legacy camelCase mirrors:
    employeeId: a.employeeId,
    employeeName: a.employee ? `${a.employee.firstName} ${a.employee.lastName}`.trim() : undefined,
    empId: a.employee?.empId,
    lastDate: a.lastWorkingDate,
    noticePeriodDays: a.noticePeriodDays,
    noticePeriodServed: a.noticePeriodServed,
    unpaidSalary: Number(a.unpaidSalaryMinor) || 0,
    eosAmount: Number(a.eosbAmountMinor) || 0,
    eosBreakdown: eosbBreakdown,
    leaveEncashment: Number(a.leaveEncashmentMinor) || 0,
    noticePeriodPay: Number(a.noticePeriodPayMinor) || 0,
    loanDeduction: Number(a.loanDeductionMinor) || 0,
    totalSettlement: Number(a.totalSettlementMinor) || 0,
    processedDate: a.processedDate ?? undefined,
    payrollRunId: a.payrollRunId ?? undefined,
  };
}

export function SeparationProvider({ children }: { children: ReactNode }) {
  const listQ = useSeparationsApi({ pageSize: 500 });
  const createMut = useCreateSeparation();
  const approveMut = useApproveSeparation();

  const separations = useMemo<SeparationRecord[]>(
    () => (listQ.data?.data ?? []).map(adapt),
    [listQ.data],
  );

  const value: SeparationContextValue = {
    separations,
    isLoading: listQ.isLoading,
    addSeparation: async (data) => {
      await createMut.mutateAsync({
        employeeId: data.employee_id ?? data.employeeId,
        lastWorkingDate: data.last_working_date ?? data.lastDate ?? data.lastWorkingDate,
        reason: data.reason ?? null,
        type: data.type,
        noticePeriodDays: data.notice_period_days ?? data.noticePeriodDays ?? 0,
        noticePeriodServed: data.notice_period_served ?? data.noticePeriodServed ?? true,
        unpaidSalaryMinor: data.unpaid_salary ?? data.unpaidSalary ?? 0,
        leaveEncashmentMinor: data.leave_encashment ?? data.leaveEncashment ?? 0,
        noticePeriodPayMinor: data.notice_period_pay ?? data.noticePeriodPay ?? 0,
        loanDeductionMinor: data.loan_deduction ?? data.loanDeduction ?? 0,
      });
    },
    updateSeparation: async (id, patch) => {
      // Phase 7 only exposes approve/process — not arbitrary edits. Approve
      // transitions if the patch sets status=approved; ignore other fields.
      if (patch?.status === "approved") {
        await approveMut.mutateAsync(id);
      } else {
        // eslint-disable-next-line no-console
        console.warn(
          "[SeparationContext] Arbitrary separation updates not yet exposed by the backend.",
        );
      }
    },
    removeSeparation: async () => {
      // eslint-disable-next-line no-console
      console.warn("[SeparationContext] removeSeparation not implemented on backend (separations are immutable post-process).");
    },
  };

  return <SeparationContext.Provider value={value}>{children}</SeparationContext.Provider>;
}

export const useSeparations = () => useContext(SeparationContext);
