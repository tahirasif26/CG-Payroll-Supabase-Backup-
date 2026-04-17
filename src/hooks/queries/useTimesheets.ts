import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useTimesheets(filters?: { employee_id?: string; status?: string; week_starting?: string }) {
  return useQuery({
    queryKey: ["timesheets", filters],
    queryFn: async () => {
      let q = (supabase as any).from("timesheets").select("*, projects(name, code), employees(first_name, last_name)").order("week_starting", { ascending: false });
      if (filters?.employee_id) q = q.eq("employee_id", filters.employee_id);
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.week_starting) q = q.eq("week_starting", filters.week_starting);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTimesheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await (supabase as any).from("timesheets").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timesheets"] });
      toast.success("Timesheet saved");
    },
  });
}

export function useUpdateTimesheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Record<string, any>) => {
      const { error } = await (supabase as any).from("timesheets").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["timesheets"] }),
  });
}
