import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useAdvances(filters?: { status?: string; employee_id?: string }) {
  return useQuery({
    queryKey: ["advances", filters],
    queryFn: async () => {
      let q = (supabase as any).from("advances").select("*, employees(first_name, last_name)").order("request_date", { ascending: false });
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.employee_id) q = q.eq("employee_id", filters.employee_id);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await (supabase as any).from("advances").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["advances"] });
      toast.success("Advance requested");
    },
  });
}

export function useUpdateAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Record<string, any>) => {
      const { error } = await (supabase as any).from("advances").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["advances"] }),
  });
}
