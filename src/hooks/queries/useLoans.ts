import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { notifyUser, notifyClientAdmins, getEmployeeUserId } from "@/lib/notify";
import { routeApprovalRequest } from "@/lib/approvalRouting";

export interface DbLoan {
  id: string;
  client_id: string;
  employee_id: string;
  principal: number;
  remaining_balance: number;
  monthly_deduction: number;
  start_date: string;
  end_date: string | null;
  status: string;
  reason: string | null;
  paused_until: string | null;
  pre_pause_emi: number | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
  employees?: { first_name: string | null; last_name: string | null } | null;
}

export interface DbLoanTransaction {
  id: string;
  loan_id: string;
  client_id: string;
  payroll_run_id: string | null;
  type: string;
  amount: number;
  balance_after: number;
  emi_at_time: number;
  date: string;
  note: string | null;
  created_at: string;
}

export function useLoans(filters?: { status?: string; employee_id?: string }) {
  return useQuery({
    queryKey: ["loans", filters],
    queryFn: async () => {
      let q = (supabase as any)
        .from("loans")
        .select("*, employees(first_name, last_name)")
        .order("created_at", { ascending: false });
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.employee_id) q = q.eq("employee_id", filters.employee_id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as DbLoan[];
    },
  });
}

export function useLoan(id: string | undefined) {
  return useQuery({
    queryKey: ["loan", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("loans")
        .select("*, employees(first_name, last_name)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as DbLoan | null;
    },
  });
}

export function useLoanTransactions(loan_id?: string) {
  return useQuery({
    queryKey: ["loan_transactions", loan_id],
    enabled: !!loan_id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("loan_transactions")
        .select("*")
        .eq("loan_id", loan_id)
        .order("date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DbLoanTransaction[];
    },
  });
}

export function useCreateLoan() {
  const qc = useQueryClient();
  const { clientId } = useAuth();
  return useMutation({
    mutationFn: async (payload: {
      employee_id: string;
      principal: number;
      monthly_deduction: number;
      start_date: string;
      end_date: string;
      interest_rate?: number;
      reason?: string;
    }) => {
      if (!clientId) throw new Error("No client context");
      const insert = {
        client_id: clientId,
        employee_id: payload.employee_id,
        principal: payload.principal,
        remaining_balance: payload.principal,
        monthly_deduction: payload.monthly_deduction,
        start_date: payload.start_date,
        end_date: payload.end_date,
        interest_rate: payload.interest_rate ?? 0,
        reason: payload.reason ?? null,
        status: "active",
      };
      const { data, error } = await (supabase as any).from("loans").insert(insert).select().single();
      if (error) throw error;

      // Initial disbursement transaction
      const txn = {
        loan_id: data.id,
        client_id: clientId,
        type: "disbursement",
        amount: payload.principal,
        balance_after: payload.principal,
        emi_at_time: payload.monthly_deduction,
        date: payload.start_date,
        note: "Loan disbursed",
      };
      const { error: txnErr } = await (supabase as any).from("loan_transactions").insert(txn);
      if (txnErr) throw txnErr;

      return data as DbLoan;
    },
    onSuccess: async (data) => {
      qc.invalidateQueries({ queryKey: ["loans"] });
      toast.success("Loan created");
      const recipient = await getEmployeeUserId(data.employee_id);
      if (recipient) {
        await notifyUser(recipient, {
          title: "Loan disbursed",
          body: `A loan of ${(Number(data.principal) / 100).toLocaleString()} has been disbursed. Monthly EMI: ${(Number(data.monthly_deduction) / 100).toLocaleString()}.`,
          category: "loan",
          severity: "success",
          entityType: "loan",
          entityId: data.id,
          actionUrl: "/loans",
          clientId: data.client_id,
        });
      }
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to create loan"),
  });
}

export function useUpdateLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<DbLoan>) => {
      const { error } = await (supabase as any).from("loans").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loans"] });
      qc.invalidateQueries({ queryKey: ["loan"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to update loan"),
  });
}

export function useAddLoanTransaction() {
  const qc = useQueryClient();
  const { clientId } = useAuth();
  return useMutation({
    mutationFn: async (payload: {
      loan_id: string;
      type: "disbursement" | "deduction" | "emi_change" | "emi_pause" | "emi_resume";
      amount: number;
      balance_after: number;
      emi_at_time: number;
      date: string;
      payroll_run_id?: string | null;
      note?: string;
    }) => {
      if (!clientId) throw new Error("No client context");
      const { error } = await (supabase as any).from("loan_transactions").insert({
        ...payload,
        client_id: clientId,
        payroll_run_id: payload.payroll_run_id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["loan_transactions", vars.loan_id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to log transaction"),
  });
}
