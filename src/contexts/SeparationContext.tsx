import { createContext, useContext, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "@/hooks/use-toast";

/**
 * Real DB columns on public.separations (see migration history):
 *   id, client_id, employee_id, last_working_date, reason, type,
 *   notice_period_days, notice_period_served (bool),
 *   unpaid_salary, eosb_amount, eosb_breakdown (jsonb), leave_encashment,
 *   notice_period_pay, loan_deduction, total_settlement,
 *   status, payroll_run_id, approved_by, processed_date,
 *   created_at, updated_at, metadata (jsonb)
 *
 * The legacy frontend uses camelCase field names; we translate both ways here.
 */
const DB_COLUMNS = new Set([
  "id",
  "client_id",
  "employee_id",
  "last_working_date",
  "reason",
  "type",
  "notice_period_days",
  "notice_period_served",
  "unpaid_salary",
  "eosb_amount",
  "eosb_breakdown",
  "leave_encashment",
  "notice_period_pay",
  "loan_deduction",
  "total_settlement",
  "status",
  "payroll_run_id",
  "approved_by",
  "processed_date",
  "created_at",
  "updated_at",
  "metadata",
]);

const VALID_TYPES = new Set([
  "resignation",
  "termination",
  "retirement",
  "end_of_contract",
  "contract_end",
  "death",
  "mutual",
  "other",
]);

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
  // ---- Legacy camelCase aliases (derived) ----
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

// Map an incoming write payload (mix of new + legacy fields) to real DB columns.
function toDbPayload(input: any): Record<string, any> {
  const src: Record<string, any> = { ...input };
  const out: Record<string, any> = {};
  const meta: Record<string, any> = {};

  // Legacy → canonical
  if (src.employeeId && !src.employee_id) src.employee_id = src.employeeId;
  if (src.lastDate && !src.last_working_date) src.last_working_date = src.lastDate;
  if (src.noticePeriodDays != null && src.notice_period_days == null)
    src.notice_period_days = src.noticePeriodDays;
  if (src.noticePeriodServed != null && src.notice_period_served == null)
    src.notice_period_served = !!src.noticePeriodServed;
  if (src.unpaidSalary != null && src.unpaid_salary == null) src.unpaid_salary = src.unpaidSalary;
  if (src.eosAmount != null && src.eosb_amount == null) src.eosb_amount = src.eosAmount;
  if (src.eosBreakdown != null && src.eosb_breakdown == null) src.eosb_breakdown = src.eosBreakdown;
  if (src.leaveEncashment != null && src.leave_encashment == null)
    src.leave_encashment = src.leaveEncashment;
  if (src.noticePeriodPay != null && src.notice_period_pay == null)
    src.notice_period_pay = src.noticePeriodPay;
  if (src.loanDeduction != null && src.loan_deduction == null) src.loan_deduction = src.loanDeduction;
  if (src.totalSettlement != null && src.total_settlement == null)
    src.total_settlement = src.totalSettlement;
  if (src.processedDate && !src.processed_date) src.processed_date = src.processedDate;
  if (src.payrollRunId && !src.payroll_run_id) src.payroll_run_id = src.payrollRunId;

  // The legacy frontend stores the separation kind in `reason` (e.g. "resignation").
  // The real DB has TWO columns: `type` (kind) + `reason` (free-text description).
  // Promote the kind into `type` and keep any free-text in metadata.reasonNotes.
  if (src.reason && !src.type) {
    const r = String(src.reason).toLowerCase();
    if (VALID_TYPES.has(r)) {
      src.type = r === "contract_end" ? "end_of_contract" : r;
      // clear `reason` so we don't double-write the same value
      delete src.reason;
    }
  }

  // bigint columns must be integers
  const intCols = [
    "unpaid_salary",
    "eosb_amount",
    "leave_encashment",
    "notice_period_pay",
    "loan_deduction",
    "total_settlement",
    "notice_period_days",
  ];
  for (const c of intCols) {
    if (src[c] != null) src[c] = Math.round(Number(src[c]) || 0);
  }

  for (const [k, v] of Object.entries(src)) {
    if (k === "id" || k === "created_at" || k === "updated_at" || k === "client_id") continue;
    if (k === "employee") continue;
    if (DB_COLUMNS.has(k)) {
      out[k] = v;
    } else {
      meta[k] = v;
    }
  }

  if (Object.keys(meta).length) out.metadata = { ...(input.metadata ?? {}), ...meta };
  return out;
}

// Add legacy aliases on read so existing consumers keep working.
function withAliases(row: any): SeparationRecord {
  const meta = row.metadata ?? {};
  const emp = row.employee ?? {};
  const fullName = [emp.first_name, emp.last_name].filter(Boolean).join(" ").trim();
  return {
    ...row,
    eosb_breakdown: Array.isArray(row.eosb_breakdown) ? row.eosb_breakdown : [],
    employeeId: row.employee_id,
    employeeName: meta.employeeName ?? (fullName || meta.employeeName),
    empId: emp.emp_id ?? meta.empId,
    department: emp.department ?? meta.department,
    designation: emp.designation ?? meta.designation,
    lastDate: row.last_working_date,
    noticePeriodDays: row.notice_period_days,
    noticePeriodServed: !!row.notice_period_served,
    unpaidSalary: Number(row.unpaid_salary) || 0,
    eosAmount: Number(row.eosb_amount) || 0,
    eosBreakdown: Array.isArray(row.eosb_breakdown) ? row.eosb_breakdown : [],
    leaveEncashment: Number(row.leave_encashment) || 0,
    noticePeriodPay: Number(row.notice_period_pay) || 0,
    noticePeriodRecovery: Number(meta.noticePeriodRecovery) || 0,
    loanDeduction: Number(row.loan_deduction) || 0,
    totalSettlement: Number(row.total_settlement) || 0,
    processedDate: row.processed_date ?? meta.processedDate ?? row.created_at?.split("T")[0],
    payrollMonth: meta.payrollMonth,
    payrollYear: meta.payrollYear,
    payrollRunId: row.payroll_run_id ?? meta.payrollRunId,
    currency: meta.currency,
    // legacy alias for type used by some consumers
    reason: row.reason ?? row.type,
  };
}

export function SeparationProvider({ children }: { children: ReactNode }) {
  const { clientId } = useRole();
  const qc = useQueryClient();
  const KEY = ["separations", clientId];

  const { data: separations = [], isLoading } = useQuery({
    queryKey: KEY,
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("separations")
        .select(`
          *,
          employee:employees!employee_id (
            first_name, last_name, emp_id, department, designation
          )
        `)
        .eq("client_id", clientId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as any[]).map(withAliases);
    },
  });

  const addSeparation = async (data: any) => {
    const payload = toDbPayload(data);
    const { error } = await (supabase as any)
      .from("separations")
      .insert({ ...payload, client_id: clientId });
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      throw error;
    }
    qc.invalidateQueries({ queryKey: KEY });
    toast({ title: "Separation record created" });
  };

  const updateSeparation = async (id: string, patch: any) => {
    const payload = toDbPayload(patch);
    const { error } = await (supabase as any)
      .from("separations")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      throw error;
    }
    qc.invalidateQueries({ queryKey: KEY });
    toast({ title: "Separation record updated" });
  };

  const removeSeparation = async (id: string) => {
    const { error } = await (supabase as any)
      .from("separations")
      .delete()
      .eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      throw error;
    }
    qc.invalidateQueries({ queryKey: KEY });
    toast({ title: "Separation record deleted" });
  };

  return (
    <SeparationContext.Provider value={{ separations, isLoading, addSeparation, updateSeparation, removeSeparation }}>
      {children}
    </SeparationContext.Provider>
  );
}

export const useSeparations = () => useContext(SeparationContext);
