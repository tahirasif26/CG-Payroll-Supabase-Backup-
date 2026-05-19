import { createContext, useContext, ReactNode, useState } from "react";

/**
 * Stubbed during NestJS migration. The `employee_types` table is not yet
 * modeled in Prisma (it's a small lookup table for HR classifications).
 * Restore by:
 *   1. Adding `EmployeeType` model to `api/prisma/schema.prisma`
 *   2. Building an `EmployeeTypesModule` + FE service layer
 *   3. Replacing the in-memory state below with `useEmployeeTypes()` from @/api
 *
 * Pages that consume this context show empty type lists in the meantime —
 * mutations are kept in component-local state so existing wizards still work
 * within a session.
 */

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

const DEFAULTS: EmployeeType[] = [
  { id: "full_time", name: "Full Time", isDefault: true, isActive: true },
  { id: "part_time", name: "Part Time", isDefault: false, isActive: true },
  { id: "contractor", name: "Contractor", isDefault: false, isActive: true },
  { id: "intern", name: "Intern", isDefault: false, isActive: true },
];

export function EmployeeTypeProvider({ children }: { children: ReactNode }) {
  const [employeeTypes, setEmployeeTypes] = useState<EmployeeType[]>(DEFAULTS);

  const value: EmployeeTypeContextType = {
    employeeTypes,
    activeTypes: employeeTypes.filter((t) => t.isActive),
    addEmployeeType: (name) =>
      setEmployeeTypes((prev) => [
        ...prev,
        {
          id: name.toLowerCase().replace(/\s+/g, "_"),
          name,
          isDefault: false,
          isActive: true,
        },
      ]),
    updateEmployeeType: (id, updates) =>
      setEmployeeTypes((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      ),
    deleteEmployeeType: (id) =>
      setEmployeeTypes((prev) => prev.filter((t) => t.id !== id)),
    getTypeName: (id) => employeeTypes.find((t) => t.id === id)?.name ?? id,
  };

  return (
    <EmployeeTypeContext.Provider value={value}>{children}</EmployeeTypeContext.Provider>
  );
}

export function useEmployeeTypes() {
  const ctx = useContext(EmployeeTypeContext);
  if (!ctx) throw new Error("useEmployeeTypes must be used within EmployeeTypeProvider");
  return ctx;
}
