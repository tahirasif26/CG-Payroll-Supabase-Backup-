import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useLoans(filters?: { status?: string; employee_id?: string }) {
  return useQuery({
    queryKey: ["loans", filters],
    queryFn: async () => {
      let q = (supabase as any).from("loans").select("*, employees(first_name, last_name)").order("created_at", { ascending: false });
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.employee_id) q = q.eq("employee_id", filters.employee_id);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useLoan(id: string | undefined) {
  return useQuery({
    queryKey: ["loan", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("loans").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await (supabase as any).from("loans").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loans"] });
      toast.success("Loan created");
    },
  });
}

export function useUpdateLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Record<string, any>) => {
      const { error } = await (supabase as any).from("loans").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loans"] });
      qc.invalidateQueries({ queryKey: ["loan"] });
    },
  });
}

export function useLoanTransactions(loan_id?: string) {
  return useQuery({
    queryKey: ["loan_transactions", loan_id],
    enabled: !!loan_id,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("loan_transactions").select("*").eq("loan_id", loan_id).order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
