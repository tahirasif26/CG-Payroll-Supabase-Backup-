import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useProjects(filters?: { status?: string }) {
  return useQuery({
    queryKey: ["projects", filters],
    queryFn: async () => {
      let q = (supabase as any).from("projects").select("*").order("start_date", { ascending: false });
      if (filters?.status) q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ["project", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("projects").select("*, project_team_members(*, employees(first_name, last_name))").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await (supabase as any).from("projects").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project created");
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Record<string, any>) => {
      const { error } = await (supabase as any).from("projects").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["project"] });
    },
  });
}

export function useCostAllocations(filters?: { employee_id?: string; month?: string; year?: number }) {
  return useQuery({
    queryKey: ["cost_allocations", filters],
    queryFn: async () => {
      let q = (supabase as any).from("cost_allocations").select("*, projects(name, code), employees(first_name, last_name)");
      if (filters?.employee_id) q = q.eq("employee_id", filters.employee_id);
      if (filters?.month) q = q.eq("month", filters.month);
      if (filters?.year) q = q.eq("year", filters.year);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}
