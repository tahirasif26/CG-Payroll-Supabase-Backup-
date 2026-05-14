import { createContext, useContext, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "@/hooks/use-toast";

// ---- Schema columns (real DB) ----
const DB_COLUMNS = new Set([
  "id",
  "client_id",
  "employee_id",
  "separation_type",
  "last_working_day",
  "notice_period_days",
  "notice_served_days",
  "reason",
  "status",
  "final_settlement_amount",
  "settlement_paid_on",
  "assets_returned",
  "clearance_done",
  "exit_interview_done",
  "notes",
  "created_by",
  "created_at",
  "updated_at",
  "metadata",
]);

export interface SeparationRecord {
  id: string;
  client_id: string;
  employee_id: string;
  separation_type: "resignation" | "termination" | "retirement" | "contract_end" | "death" | "other";
  last_working_day: string;
  notice_period_days: number;
  notice_served_days: number;
  reason?: string;
  status: "pending" | "processing" | "completed" | "cancelled" | "approved";
  final_settlement_amount?: number;
  settlement_paid_on?: string;
  assets_returned: boolean;
  clearance_done: boolean;
  exit_interview_done: boolean;
  notes?: string;
  created_by?: string;
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
  // ---- Legacy aliases (derived; kept for backwards compatibility) ----
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

// Map an incoming write payload (mix of new+legacy fields) into DB columns + metadata.
function toDbPayload(input: any): Record<string, any> {
  const out: Record<string, any> = {};
  const meta: Record<string, any> = {};

  // Legacy → canonical mapping
  if (input.employeeId && !input.employee_id) input.employee_id = input.employeeId;
  if (input.lastDate && !input.last_working_day) input.last_working_day = input.lastDate;
  if (input.noticePeriodDays != null && input.notice_period_days == null)
    input.notice_period_days = input.noticePeriodDays;
  if (input.noticePeriodServed != null && input.notice_served_days == null)
    input.notice_served_days = input.noticePeriodServed
      ? input.notice_period_days ?? input.noticePeriodDays ?? 0
      : 0;
  if (input.totalSettlement != null && input.final_settlement_amount == null)
    input.final_settlement_amount = input.totalSettlement;
  // legacy reason was a separation type sometimes ("resignation", "termination")
  if (input.reason && !input.separation_type) {
    const r = String(input.reason).toLowerCase();
    if (["resignation", "termination", "retirement", "contract_end", "death", "other"].includes(r)) {
      input.separation_type = r;
    }
  }

  for (const [k, v] of Object.entries(input)) {
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

// Add legacy aliases on read so old consumers keep working.
function withAliases(row: any): SeparationRecord {
  const meta = row.metadata ?? {};
  const emp = row.employee ?? {};
  const fullName = [emp.first_name, emp.last_name].filter(Boolean).join(" ").trim();
  return {
    ...row,
    employeeId: row.employee_id,
    employeeName: meta.employeeName ?? (fullName || meta.employeeName),
    empId: emp.emp_id ?? meta.empId,
    department: emp.department ?? meta.department,
    designation: emp.designation ?? meta.designation,
    lastDate: row.last_working_day,
    noticePeriodDays: row.notice_period_days,
    noticePeriodServed: row.notice_served_days >= row.notice_period_days,
    unpaidSalary: meta.unpaidSalary ?? 0,
    eosAmount: meta.eosAmount ?? 0,
    eosBreakdown: meta.eosBreakdown ?? [],
    leaveEncashment: meta.leaveEncashment ?? 0,
    noticePeriodPay: meta.noticePeriodPay ?? 0,
    loanDeduction: meta.loanDeduction ?? 0,
    totalSettlement: row.final_settlement_amount ?? meta.totalSettlement ?? 0,
    processedDate: meta.processedDate ?? row.created_at?.split("T")[0],
    payrollMonth: meta.payrollMonth,
    payrollYear: meta.payrollYear,
    payrollRunId: meta.payrollRunId,
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
    if (error) throw error;
    qc.invalidateQueries({ queryKey: KEY });
    toast({ title: "Separation record created" });
  };

  const updateSeparation = async (id: string, patch: any) => {
    const payload = toDbPayload(patch);
    const { error } = await (supabase as any)
      .from("separations")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    qc.invalidateQueries({ queryKey: KEY });
    toast({ title: "Separation record updated" });
  };

  const removeSeparation = async (id: string) => {
    const { error } = await (supabase as any)
      .from("separations")
      .delete()
      .eq("id", id);
    if (error) throw error;
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
