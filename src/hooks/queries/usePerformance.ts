import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useRole } from "@/contexts/RoleContext";

// ============ Types ============
export interface DBPerformanceCycle {
  id: string;
  client_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

export interface DBAssessmentRating {
  id: string;
  client_id: string;
  name: string;
  value: number;
  description: string | null;
  color: string;
}

export interface DBPerformanceQuestionnaire {
  id: string;
  client_id: string;
  cycle_id: string | null;
  name: string;
  audience: string;
  questions: any[];
}

export interface DBPerformanceAssessment {
  id: string;
  client_id: string;
  cycle_id: string | null;
  employee_id: string;
  reviewer_id: string | null;
  type: string; // 'self' | 'peer' | 'manager'
  responses: any;
  rating: number | null;
  status: string; // 'pending' | 'in-progress' | 'submitted' | 'acknowledged' | 'completed'
  created_at: string;
  updated_at: string;
  employees?: { first_name: string | null; last_name: string | null } | null;
}

export interface DBPerformanceCalibration {
  id: string;
  client_id: string;
  cycle_id: string | null;
  employee_id: string;
  original_rating: number | null;
  calibrated_rating: number | null;
  notes: string | null;
  calibrated_by: string | null;
  status?: string;
}

// ============ Cycles ============
export function usePerformanceCycles() {
  return useQuery({
    queryKey: ["performance_cycles"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("performance_cycles")
        .select("*")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data as DBPerformanceCycle[];
    },
  });
}

export function useCreatePerformanceCycle() {
  const qc = useQueryClient();
  const { clientId } = useRole();
  return useMutation({
    mutationFn: async (payload: { name: string; start_date: string; end_date: string; status?: string }) => {
      if (!clientId) throw new Error("No client");
      const { data, error } = await (supabase as any)
        .from("performance_cycles")
        .insert({ ...payload, client_id: clientId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["performance_cycles"] });
      toast.success("Cycle created");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdatePerformanceCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<DBPerformanceCycle>) => {
      const { data, error } = await (supabase as any)
        .from("performance_cycles")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["performance_cycles"] });
      toast.success("Cycle updated");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeletePerformanceCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("performance_cycles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["performance_cycles"] });
      toast.success("Cycle deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ============ Assessment Ratings ============
const DEFAULT_RATINGS = [
  { name: "Outstanding", value: 5, description: "Consistently exceeds all expectations", color: "bg-success/10 text-success" },
  { name: "Exceeds Expectations", value: 4, description: "Frequently exceeds expectations", color: "bg-info/10 text-info" },
  { name: "Meets Expectations", value: 3, description: "Consistently meets expectations", color: "bg-primary/10 text-primary" },
  { name: "Below Expectations", value: 2, description: "Partially meets expectations", color: "bg-warning/10 text-warning" },
  { name: "Unsatisfactory", value: 1, description: "Does not meet expectations", color: "bg-destructive/10 text-destructive" },
];

export function useAssessmentRatings() {
  const { clientId } = useRole();
  const qc = useQueryClient();
  return useQuery({
    queryKey: ["assessment_ratings", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("assessment_ratings")
        .select("*")
        .order("value", { ascending: false });
      if (error) throw error;
      // Auto-seed defaults if empty
      if ((data?.length ?? 0) === 0 && clientId) {
        const seed = DEFAULT_RATINGS.map(r => ({ ...r, client_id: clientId }));
        const { data: inserted, error: insErr } = await (supabase as any)
          .from("assessment_ratings")
          .insert(seed)
          .select();
        if (!insErr && inserted) {
          qc.invalidateQueries({ queryKey: ["assessment_ratings"] });
          return (inserted as DBAssessmentRating[]).sort((a, b) => b.value - a.value);
        }
      }
      return data as DBAssessmentRating[];
    },
  });
}

export function useUpsertAssessmentRating() {
  const qc = useQueryClient();
  const { clientId } = useRole();
  return useMutation({
    mutationFn: async (payload: Partial<DBAssessmentRating> & { id?: string }) => {
      if (!clientId) throw new Error("No client");
      const row = { ...payload, client_id: clientId };
      const { data, error } = await (supabase as any)
        .from("assessment_ratings")
        .upsert(row)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assessment_ratings"] });
      toast.success("Rating saved");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteAssessmentRating() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("assessment_ratings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assessment_ratings"] });
      toast.success("Rating deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ============ Questionnaires ============
export function usePerformanceQuestionnaires(cycle_id?: string) {
  return useQuery({
    queryKey: ["performance_questionnaires", cycle_id],
    queryFn: async () => {
      let q = (supabase as any).from("performance_questionnaires").select("*").order("created_at", { ascending: false });
      if (cycle_id) q = q.eq("cycle_id", cycle_id);
      const { data, error } = await q;
      if (error) throw error;
      return data as DBPerformanceQuestionnaire[];
    },
  });
}

export function useUpsertQuestionnaire() {
  const qc = useQueryClient();
  const { clientId } = useRole();
  return useMutation({
    mutationFn: async (payload: Partial<DBPerformanceQuestionnaire> & { id?: string }) => {
      if (!clientId) throw new Error("No client");
      const row = { ...payload, client_id: clientId };
      const { data, error } = await (supabase as any)
        .from("performance_questionnaires")
        .upsert(row)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["performance_questionnaires"] });
      toast.success("Saved");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteQuestionnaire() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("performance_questionnaires").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["performance_questionnaires"] });
      toast.success("Deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ============ Assessments ============
export function usePerformanceAssessments(filters?: { cycle_id?: string; employee_id?: string; reviewer_id?: string; type?: string }) {
  return useQuery({
    queryKey: ["performance_assessments", filters],
    queryFn: async () => {
      let q = (supabase as any)
        .from("performance_assessments")
        .select("*, employees:employee_id(first_name, last_name), reviewer:reviewer_id(first_name, last_name)");
      if (filters?.cycle_id) q = q.eq("cycle_id", filters.cycle_id);
      if (filters?.employee_id) q = q.eq("employee_id", filters.employee_id);
      if (filters?.reviewer_id) q = q.eq("reviewer_id", filters.reviewer_id);
      if (filters?.type) q = q.eq("type", filters.type);
      const { data, error } = await q;
      if (error) throw error;
      return data as DBPerformanceAssessment[];
    },
  });
}

export function useUpsertPerformanceAssessment() {
  const qc = useQueryClient();
  const { clientId } = useRole();
  return useMutation({
    mutationFn: async (payload: Partial<DBPerformanceAssessment> & { id?: string }) => {
      if (!clientId) throw new Error("No client");
      const row = { ...payload, client_id: clientId };
      const { data, error } = await (supabase as any)
        .from("performance_assessments")
        .upsert(row)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["performance_assessments"] });
      toast.success("Assessment saved");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeletePerformanceAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("performance_assessments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["performance_assessments"] }),
    onError: (e: any) => toast.error(e.message),
  });
}

// ============ Calibrations ============
export function usePerformanceCalibrations(cycle_id?: string) {
  return useQuery({
    queryKey: ["performance_calibrations", cycle_id],
    queryFn: async () => {
      let q = (supabase as any)
        .from("performance_calibrations")
        .select("*, employees:employee_id(first_name, last_name, department, designation)");
      if (cycle_id) q = q.eq("cycle_id", cycle_id);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertCalibration() {
  const qc = useQueryClient();
  const { clientId } = useRole();
  return useMutation({
    mutationFn: async (payload: Partial<DBPerformanceCalibration> & { id?: string }) => {
      if (!clientId) throw new Error("No client");
      const row = { ...payload, client_id: clientId };
      const { data, error } = await (supabase as any)
        .from("performance_calibrations")
        .upsert(row)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["performance_calibrations"] });
      toast.success("Calibration saved");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
