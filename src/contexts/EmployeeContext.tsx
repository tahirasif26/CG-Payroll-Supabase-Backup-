import React, { createContext, useContext, useState, ReactNode } from "react";
import { employees as initialEmployees } from "@/data/mockData";
import type { Employee } from "@/types/hcm";

interface EmployeeContextType {
  employees: Employee[];
  updateEmployee: (empId: string, updates: Partial<Employee>) => void;
  addEmployee: (emp: Employee) => void;
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);

export function EmployeeProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>([...initialEmployees]);

  const updateEmployee = (empId: string, updates: Partial<Employee>) => {
    setEmployees(prev => prev.map(e => e.id === empId ? { ...e, ...updates } : e));
  };

  const addEmployee = (emp: Employee) => {
    setEmployees(prev => [...prev, emp]);
  };

  return (
    <EmployeeContext.Provider value={{ employees, updateEmployee, addEmployee }}>
      {children}
    </EmployeeContext.Provider>
  );
}

export function useEmployees() {
  const ctx = useContext(EmployeeContext);
  if (!ctx) throw new Error("useEmployees must be used within EmployeeProvider");
  return ctx;
}
