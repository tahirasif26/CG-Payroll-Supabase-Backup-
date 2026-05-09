import React, { createContext, useContext, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";

export interface EmployeeType {
  id: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
}

interface EmployeeTypeContextType {
  employeeTypes: EmployeeType[];
  addEmployeeType: (name: string) => void;
  updateEmployeeType: (id: string, updates: Partial<EmployeeType>) => void;
  deleteEmployeeType: (id: string) => void;
  getTypeName: (id: string) => string;
  activeTypes: EmployeeType[];
}

const EmployeeTypeContext = createContext<EmployeeTypeContextType | undefined>(undefined);

export function EmployeeTypeProvider({ children }: { children: ReactNode }) {
  const { clientId } = useRole();
  const qc = useQueryClient();

  const { data: rows = [] } = useQuery({
    queryKey: ["employee_types", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_types")
        .select("id, name, is_default, is_active")
        .eq("client_id", clientId!)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const employeeTypes: EmployeeType[] = (rows as any[]).map(r => ({
    id: r.id, name: r.name, isDefault: r.is_default, isActive: r.is_active,
  }));

  const invalidate = () => qc.invalidateQueries({ queryKey: ["employee_types", clientId] });

  const addMut = useMutation({
    mutationFn: async (name: string) => {
      if (!clientId) throw new Error("No client context");
      const { error } = await supabase.from("employee_types").insert({ client_id: clientId, name });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<EmployeeType> }) => {
      const payload: Record<string, unknown> = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.isActive !== undefined) payload.is_active = updates.isActive;
      const { error } = await supabase.from("employee_types").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employee_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const getTypeName = (id: string) => employeeTypes.find(t => t.id === id)?.name || id;
  const activeTypes = employeeTypes.filter(t => t.isActive);

  return (
    <EmployeeTypeContext.Provider value={{
      employeeTypes,
      addEmployeeType: (name) => addMut.mutate(name),
      updateEmployeeType: (id, updates) => updateMut.mutate({ id, updates }),
      deleteEmployeeType: (id) => deleteMut.mutate(id),
      getTypeName,
      activeTypes,
    }}>
      {children}
    </EmployeeTypeContext.Provider>
  );
}

export function useEmployeeTypes() {
  const ctx = useContext(EmployeeTypeContext);
  if (!ctx) throw new Error("useEmployeeTypes must be used within EmployeeTypeProvider");
  return ctx;
}
