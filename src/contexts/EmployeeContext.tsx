import { createContext, useContext, useMemo, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useEmployees as useEmployeesApi,
  useCreateEmployee,
  useUpdateEmployee,
  useArchiveEmployee,
  employeeKeys,
  type EmployeeDirectoryItem,
} from "@/api";
import type { Employee } from "@/types/hcm";

/**
 * Migrated from Supabase to NestJS via @/api. External API preserved so the
 * 20+ pages consuming `useEmployees()` (the context hook, not the @/api one)
 * don't have to change.
 *
 * Note: `salary` used to be computed from `employee_compensation` rows.
 * The new directory endpoint omits compensation for performance — set to 0
 * here. Pages that need real salary should use `useEmployeeProfile` from
 * @/api which loads the full record with compensation.
 */
interface EmployeeContextType {
  employees: Employee[];
  loading: boolean;
  updateEmployee: (empId: string, updates: Partial<Employee>) => Promise<void>;
  addEmployee: (emp: Employee) => Promise<void>;
  removeEmployee: (empId: string) => Promise<void>;
  refresh: () => void;
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);

function adaptEmployee(row: EmployeeDirectoryItem): Employee {
  return {
    id: row.id,
    empId: row.empId ?? "",
    firstName: row.firstName ?? "",
    lastName: row.lastName ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    department: row.department ?? "",
    designation: row.designation ?? "",
    joiningDate: row.joiningDate ?? "",
    salary: 0,
    status: (row.status ?? "active") as Employee["status"],
    avatar: row.avatarUrl ?? "",
    dateOfBirth: "",
    category: (row.category ?? "direct") as Employee["category"],
    workLocationCountry: row.workLocationCountry ?? "",
    payCurrency: row.payCurrency ?? undefined,
    reportsTo: row.reportsToId ?? undefined,
  };
}

export function EmployeeProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const list = useEmployeesApi({ pageSize: 500 });
  const createMut = useCreateEmployee();
  const updateMut = useUpdateEmployee();
  const archiveMut = useArchiveEmployee();

  const rows = list.data?.data ?? [];
  const employees = useMemo<Employee[]>(() => rows.map(adaptEmployee), [rows]);

  const value: EmployeeContextType = {
    employees,
    loading: list.isLoading,
    updateEmployee: async (empId, updates) => {
      const body: Record<string, unknown> = {};
      if (updates.empId !== undefined) body.empId = updates.empId;
      if (updates.firstName !== undefined) body.firstName = updates.firstName;
      if (updates.lastName !== undefined) body.lastName = updates.lastName;
      if (updates.email !== undefined) body.email = updates.email;
      if (updates.phone !== undefined) body.phone = updates.phone || null;
      if (updates.department !== undefined) body.department = updates.department || null;
      if (updates.designation !== undefined) body.designation = updates.designation || null;
      if (updates.joiningDate !== undefined) body.joiningDate = updates.joiningDate || null;
      if (updates.status !== undefined) body.status = updates.status;
      if (updates.avatar !== undefined) body.avatarUrl = updates.avatar || null;
      if (updates.dateOfBirth !== undefined) body.dateOfBirth = updates.dateOfBirth || null;
      if (updates.category !== undefined) body.category = updates.category || null;
      if (updates.workLocationCountry !== undefined) body.workLocationCountry = updates.workLocationCountry || null;
      if (updates.payCurrency !== undefined) body.payCurrency = updates.payCurrency || null;
      if (Object.keys(body).length === 0) return;
      await updateMut.mutateAsync({ id: empId, body });
    },
    addEmployee: async (emp) => {
      await createMut.mutateAsync({
        empId: emp.empId,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        phone: emp.phone || null,
        department: emp.department || null,
        designation: emp.designation || null,
        joiningDate: emp.joiningDate || null,
        status: (emp.status ?? "active") as never,
        avatarUrl: emp.avatar || null,
        dateOfBirth: emp.dateOfBirth || null,
        category: emp.category || null,
        workLocationCountry: emp.workLocationCountry || null,
        payCurrency: emp.payCurrency || null,
      });
    },
    removeEmployee: async (empId) => {
      await archiveMut.mutateAsync({ id: empId });
    },
    refresh: () => qc.invalidateQueries({ queryKey: employeeKeys.all }),
  };

  return <EmployeeContext.Provider value={value}>{children}</EmployeeContext.Provider>;
}

/**
 * Context hook — **named the same as `@/api`'s `useEmployees`** for historical
 * reasons (changing it would touch 20+ pages). Import this from
 * `@/contexts/EmployeeContext`; import the typed React Query hook from `@/api`.
 */
export function useEmployees() {
  const ctx = useContext(EmployeeContext);
  if (!ctx) throw new Error("useEmployees must be used within EmployeeProvider");
  return ctx;
}
