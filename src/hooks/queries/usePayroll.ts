import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { useToast } from "@/hooks/use-toast";
import { notifyUser } from "@/lib/notify";

/* ---------------- TYPES ---------------- */

export interface PayrollSetupRow {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  country: string | null;
  currency: string;
  pay_frequency: string;
  year_end_date: string | null;
  status: string;
  options: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayrollRunRow {
  id: string;
  client_id: string;
  payroll_setup_id: string | null;
  month: string;
  year: number;
  status: string;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  employee_count: number;
  run_date: string;
  approved_by: string | null;
  approved_at: string | null;
  completed_at: string | null;
  locked: boolean;
  locked_by: string | null;
  locked_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PayrollLineRow {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  client_id: string;
  basic: number;
  allowances: number;
  gross: number;
  loan_deduction: number;
  tax_deduction: number;
  statutory_deduction: number;
  other_deductions: number;
  total_deductions: number;
  expense_reimbursement: number;
  advance_given: number;
  one_off_benefits: number;
  one_off_deductions: number;
  separation_settlement: number;
  net_pay: number;
  pay_currency: string;
  exchange_rate: number;
  net_in_reporting_currency: number;
  snapshot_data: Record<string, unknown>;
  created_at: string;
}

/* ---------------- PAYROLL SETUPS ---------------- */

export function usePayrollSetups() {
  const { clientId, isSuperAdmin } = useRole();
  return useQuery({
    queryKey: ["payroll_setups_list", clientId ?? "super"],
    queryFn: async () => {
      // List view only — heavy `options` json is fetched per-setup on the editor page.
      const { data, error } = await supabase
        .from("payroll_setups")
        .select("id,client_id,name,description,country,currency,pay_frequency,year_end_date,status,created_by,created_at,updated_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PayrollSetupRow[];
    },
    enabled: !!clientId || isSuperAdmin,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
}

export function useCreatePayrollSetup() {
  const qc = useQueryClient();
  const { clientId } = useRole();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      country?: string;
      currency: string;
      pay_frequency?: string;
      options?: Record<string, unknown>;
    }) => {
      if (!clientId) throw new Error("No client context");
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase
        .from("payroll_setups") as any)
        .insert({
          client_id: clientId,
          name: input.name,
          description: input.description ?? null,
          country: input.country ?? null,
          currency: input.currency,
          pay_frequency: input.pay_frequency ?? "monthly",
          options: input.options ?? {},
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payroll_setups"] });
      toast({ title: "Payroll setup created" });
    },
    onError: (err: Error) =>
      toast({ title: "Create failed", description: err.message, variant: "destructive" }),
  });
}

/* ---------------- PAYROLL RUNS ---------------- */

export function usePayrollRuns(filters?: { year?: number; status?: string }) {
  const { clientId, isSuperAdmin } = useRole();
  return useQuery({
    queryKey: ["payroll_runs", clientId ?? "super", filters],
    queryFn: async () => {
      let q = supabase.from("payroll_runs").select("*");
      if (filters?.year) q = q.eq("year", filters.year);
      if (filters?.status) q = q.eq("status", filters.status);
      const { data, error } = await q.order("year", { ascending: false }).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PayrollRunRow[];
    },
    enabled: !!clientId || isSuperAdmin,
    staleTime: 15_000,
  });
}

export function usePayrollRun(id: string | undefined) {
  return useQuery({
    queryKey: ["payroll_run", id],
    queryFn: async () => {
      if (!id) throw new Error("No run id");
      const [runRes, linesRes] = await Promise.all([
        supabase.from("payroll_runs").select("*").eq("id", id).maybeSingle(),
        supabase.from("payroll_lines").select("*").eq("payroll_run_id", id),
      ]);
      if (runRes.error) throw runRes.error;
      if (linesRes.error) throw linesRes.error;
      return {
        run: runRes.data as PayrollRunRow | null,
        lines: (linesRes.data ?? []) as PayrollLineRow[],
      };
    },
    enabled: !!id,
  });
}

export function useCreatePayrollRun() {
  const qc = useQueryClient();
  const { clientId } = useRole();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: {
      payroll_setup_id: string | null;
      month: string;
      year: number;
      run_date?: string;
    }) => {
      if (!clientId) throw new Error("No client context");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("payroll_runs")
        .insert({
          client_id: clientId,
          payroll_setup_id: input.payroll_setup_id,
          month: input.month,
          year: input.year,
          run_date: input.run_date ?? new Date().toISOString().slice(0, 10),
          status: "draft",
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payroll_runs"] });
      toast({ title: "Payroll run created" });
    },
    onError: (err: Error) =>
      toast({ title: "Create failed", description: err.message, variant: "destructive" }),
  });
}

export function useDeletePayrollRun() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      // Only draft runs can be deleted client-side. Approved runs require an unlock flow.
      const { error } = await supabase.from("payroll_runs").delete().eq("id", id).eq("status", "draft");
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payroll_runs"] });
      toast({ title: "Draft payroll deleted" });
    },
    onError: (err: Error) =>
      toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
  });
}

export function useApprovePayrollRun() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (runId: string) => {
      const { data, error } = await supabase.functions.invoke("approve-payroll-run", {
        body: { payroll_run_id: runId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payroll_runs"] });
      qc.invalidateQueries({ queryKey: ["payroll_run"] });
      toast({ title: "Payroll approved" });
    },
    onError: (err: Error) =>
      toast({
        title: "Approval failed",
        description: err.message,
        variant: "destructive",
      }),
  });
}

/* ---------------- PAYROLL LINES ---------------- */

export function usePayrollLines(filters: {
  employee_id?: string;
  payroll_run_id?: string;
}) {
  const { clientId, isSuperAdmin } = useRole();
  return useQuery({
    queryKey: ["payroll_lines", clientId ?? "super", filters],
    queryFn: async () => {
      let q = supabase.from("payroll_lines").select("*");
      if (filters.employee_id) q = q.eq("employee_id", filters.employee_id);
      if (filters.payroll_run_id) q = q.eq("payroll_run_id", filters.payroll_run_id);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PayrollLineRow[];
    },
    enabled: !!clientId || isSuperAdmin || !!filters.employee_id,
  });
}
