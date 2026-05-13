import React, { createContext, useContext, useMemo, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import type { Employee } from "@/types/hcm";

interface EmployeeContextType {
  employees: Employee[];
  loading: boolean;
  updateEmployee: (empId: string, updates: Partial<Employee>) => Promise<void>;
  addEmployee: (emp: Employee) => Promise<void>;
  removeEmployee: (empId: string) => Promise<void>;
  refresh: () => void;
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);

// DB row -> legacy UI Employee shape
function adaptEmployee(row: any, comp: any[] = []): Employee {
  const mappedComp = comp
    .filter((c) => c.employee_id === row.id)
    .map((c) => ({
      name: c.component_name,
      type: (c.component_type ?? "other") as Employee["compensation"] extends Array<infer X> ? (X extends { type: infer T } ? T : never) : never,
      amount: Number(c.amount) || 0,
    }));
  const salary = mappedComp.reduce((s, c) => s + (c.amount || 0), 0);
  return {
    id: row.id,
    empId: row.emp_id ?? "",
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    department: row.department ?? "",
    designation: row.designation ?? "",
    joiningDate: row.joining_date ?? "",
    salary,
    status: (row.status ?? "active") as Employee["status"],
    avatar: row.avatar_url ?? "",
    dateOfBirth: row.date_of_birth ?? "",
    category: row.category ?? "direct",
    workLocationCountry: row.work_location_country ?? "",
    payCurrency: row.pay_currency ?? undefined,
    payrollSetupId: row.payroll_setup_id ?? undefined,
    userId: row.user_id ?? undefined,
    roleId: row.role_id ?? undefined,
    reportsTo: row.reports_to ?? undefined,
    compensation: mappedComp.length ? mappedComp : undefined,
  };
}

// legacy UI Employee -> DB columns for update
function toDbUpdates(updates: Partial<Employee>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (updates.empId !== undefined) out.emp_id = updates.empId;
  if (updates.firstName !== undefined) out.first_name = updates.firstName;
  if (updates.lastName !== undefined) out.last_name = updates.lastName;
  if (updates.email !== undefined) out.email = updates.email;
  if (updates.phone !== undefined) out.phone = updates.phone;
  if (updates.department !== undefined) out.department = updates.department;
  if (updates.designation !== undefined) out.designation = updates.designation;
  if (updates.joiningDate !== undefined) out.joining_date = updates.joiningDate || null;
  if (updates.status !== undefined) out.status = updates.status;
  if (updates.avatar !== undefined) out.avatar_url = updates.avatar;
  if (updates.dateOfBirth !== undefined) out.date_of_birth = updates.dateOfBirth || null;
  if (updates.category !== undefined) out.category = updates.category;
  if (updates.workLocationCountry !== undefined) out.work_location_country = updates.workLocationCountry;
  if (updates.payCurrency !== undefined) out.pay_currency = updates.payCurrency;
  // payrollSetupId skipped — mock IDs (e.g. "ps-3") aren't valid UUIDs for the DB.
  return out;
}

export function EmployeeProvider({ children }: { children: ReactNode }) {
  const { clientId, isSuperAdmin } = useRole();
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["employees-ctx", clientId ?? "super"],
    enabled: !!clientId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("employees")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: comp = [] } = useQuery({
    queryKey: ["employee-compensation-ctx", clientId ?? "super"],
    enabled: !!clientId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("employee_compensation")
        .select("employee_id, component_name, component_type, amount, effective_to")
        .is("effective_to", null);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const employees = useMemo<Employee[]>(
    () => rows.map((r: any) => adaptEmployee(r, comp as any[])),
    [rows, comp]
  );

  const updateMutation = useMutation({
    mutationFn: async ({ empId, updates }: { empId: string; updates: Partial<Employee> }) => {
      const dbUpdates = toDbUpdates(updates);
      if (Object.keys(dbUpdates).length === 0) return;
      const { error } = await (supabase as any)
        .from("employees")
        .update(dbUpdates)
        .eq("id", empId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees-ctx"] });
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  const addMutation = useMutation({
    mutationFn: async (emp: Employee) => {
      if (!clientId) throw new Error("No client context");
      const { error } = await (supabase as any).from("employees").insert({
        client_id: clientId,
        emp_id: emp.empId,
        first_name: emp.firstName,
        last_name: emp.lastName,
        email: emp.email,
        phone: emp.phone || null,
        department: emp.department || null,
        designation: emp.designation || null,
        joining_date: emp.joiningDate || null,
        status: emp.status,
        avatar_url: emp.avatar || null,
        date_of_birth: emp.dateOfBirth || null,
        category: emp.category || null,
        work_location_country: emp.workLocationCountry || null,
        pay_currency: emp.payCurrency || null,
        // payroll_setup_id intentionally omitted — local mock IDs (e.g. "ps-3") aren't valid UUIDs.
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees-ctx"] });
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (empId: string) => {
      const { error } = await (supabase as any)
        .from("employees")
        .delete()
        .eq("id", empId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees-ctx"] });
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  const value: EmployeeContextType = {
    employees,
    loading: isLoading,
    updateEmployee: async (empId, updates) => {
      await updateMutation.mutateAsync({ empId, updates });
    },
    addEmployee: async (emp) => {
      await addMutation.mutateAsync(emp);
    },
    removeEmployee: async (empId) => {
      await removeMutation.mutateAsync(empId);
    },
    refresh: () => qc.invalidateQueries({ queryKey: ["employees-ctx"] }),
  };

  return <EmployeeContext.Provider value={value}>{children}</EmployeeContext.Provider>;
}

export function useEmployees() {
  const ctx = useContext(EmployeeContext);
  if (!ctx) throw new Error("useEmployees must be used within EmployeeProvider");
  return ctx;
}
