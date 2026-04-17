import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function usePerformanceCycles() {
  return useQuery({
    queryKey: ["performance_cycles"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("performance_cycles").select("*").order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreatePerformanceCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await (supabase as any).from("performance_cycles").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["performance_cycles"] });
      toast.success("Cycle created");
    },
  });
}

export function usePerformanceQuestionnaires(cycle_id?: string) {
  return useQuery({
    queryKey: ["performance_q", cycle_id],
    queryFn: async () => {
      let q = (supabase as any).from("performance_questionnaires").select("*");
      if (cycle_id) q = q.eq("cycle_id", cycle_id);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function usePerformanceAssessments(filters?: { cycle_id?: string; employee_id?: string; reviewer_id?: string; type?: string }) {
  return useQuery({
    queryKey: ["performance_assessments", filters],
    queryFn: async () => {
      let q = (supabase as any).from("performance_assessments").select("*, employees(first_name, last_name)");
      if (filters?.cycle_id) q = q.eq("cycle_id", filters.cycle_id);
      if (filters?.employee_id) q = q.eq("employee_id", filters.employee_id);
      if (filters?.reviewer_id) q = q.eq("reviewer_id", filters.reviewer_id);
      if (filters?.type) q = q.eq("type", filters.type);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertPerformanceAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await (supabase as any).from("performance_assessments").upsert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["performance_assessments"] }),
  });
}

export function usePerformanceCalibrations(cycle_id?: string) {
  return useQuery({
    queryKey: ["performance_calibrations", cycle_id],
    queryFn: async () => {
      let q = (supabase as any).from("performance_calibrations").select("*, employees(first_name, last_name)");
      if (cycle_id) q = q.eq("cycle_id", cycle_id);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}
