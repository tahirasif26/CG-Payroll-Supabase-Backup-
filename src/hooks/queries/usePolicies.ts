import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function usePolicies(filters?: { category?: string; status?: string }) {
  return useQuery({
    queryKey: ["company_policies", filters],
    queryFn: async () => {
      let q = (supabase as any).from("company_policies").select("*").order("effective_date", { ascending: false });
      if (filters?.category) q = q.eq("category", filters.category);
      if (filters?.status) q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await (supabase as any).from("company_policies").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company_policies"] });
      toast.success("Policy published");
    },
  });
}

export function useUpdatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Record<string, any>) => {
      const { error } = await (supabase as any).from("company_policies").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company_policies"] }),
  });
}

export function useDeletePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("company_policies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company_policies"] }),
  });
}

export function usePolicyAcknowledgements(policy_id?: string) {
  return useQuery({
    queryKey: ["policy_ack", policy_id],
    enabled: !!policy_id,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("policy_acknowledgements").select("*, employees(first_name, last_name)").eq("policy_id", policy_id);
      if (error) throw error;
      return data;
    },
  });
}

export function useAcknowledgePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ policy_id, employee_id, client_id }: { policy_id: string; employee_id: string; client_id: string }) => {
      const { error } = await (supabase as any).from("policy_acknowledgements").insert({ policy_id, employee_id, client_id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["policy_ack"] });
      toast.success("Policy acknowledged");
    },
  });
}
