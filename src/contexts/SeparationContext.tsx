import { createContext, useContext, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "@/hooks/use-toast";

export interface SeparationRecord {
  id: string;
  client_id: string;
  employee_id: string;
  separation_type: "resignation" | "termination" | "retirement" | "contract_end" | "death" | "other";
  last_working_day: string;
  notice_period_days: number;
  notice_served_days: number;
  reason?: string;
  status: "pending" | "processing" | "completed" | "cancelled";
  final_settlement_amount?: number;
  settlement_paid_on?: string;
  assets_returned: boolean;
  clearance_done: boolean;
  exit_interview_done: boolean;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  employee?: {
    first_name: string;
    last_name: string;
    emp_id: string;
    department: string;
    designation: string;
  };
}

interface SeparationContextValue {
  separations: SeparationRecord[];
  isLoading: boolean;
  addSeparation: (data: Omit<SeparationRecord, "id" | "client_id" | "created_at" | "updated_at">) => Promise<void>;
  updateSeparation: (id: string, patch: Partial<SeparationRecord>) => Promise<void>;
  removeSeparation: (id: string) => Promise<void>;
}

const SeparationContext = createContext<SeparationContextValue>({
  separations: [],
  isLoading: false,
  addSeparation: async () => {},
  updateSeparation: async () => {},
  removeSeparation: async () => {},
});

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
      return (data ?? []) as SeparationRecord[];
    },
  });

  const addSeparation = async (data: any) => {
    const { error } = await (supabase as any)
      .from("separations")
      .insert({ ...data, client_id: clientId });
    if (error) throw error;
    qc.invalidateQueries({ queryKey: KEY });
    toast({ title: "Separation record created" });
  };

  const updateSeparation = async (id: string, patch: Partial<SeparationRecord>) => {
    const { error } = await (supabase as any)
      .from("separations")
      .update({ ...patch, updated_at: new Date().toISOString() })
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
