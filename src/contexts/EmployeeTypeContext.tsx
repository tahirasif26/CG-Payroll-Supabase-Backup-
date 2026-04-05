import React, { createContext, useContext, useState, ReactNode } from "react";

export interface EmployeeType {
  id: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
}

const defaultTypes: EmployeeType[] = [
  { id: "direct", name: "Direct Employee", isDefault: true, isActive: true },
  { id: "contractor", name: "Contractor", isDefault: true, isActive: true },
];

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
  const [employeeTypes, setEmployeeTypes] = useState<EmployeeType[]>([...defaultTypes]);

  const addEmployeeType = (name: string) => {
    const newType: EmployeeType = {
      id: String(Date.now()),
      name,
      isDefault: false,
      isActive: true,
    };
    setEmployeeTypes(prev => [...prev, newType]);
  };

  const updateEmployeeType = (id: string, updates: Partial<EmployeeType>) => {
    setEmployeeTypes(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteEmployeeType = (id: string) => {
    setEmployeeTypes(prev => prev.filter(t => t.id !== id || t.isDefault));
  };

  const getTypeName = (id: string) => {
    return employeeTypes.find(t => t.id === id)?.name || id;
  };

  const activeTypes = employeeTypes.filter(t => t.isActive);

  return (
    <EmployeeTypeContext.Provider value={{ employeeTypes, addEmployeeType, updateEmployeeType, deleteEmployeeType, getTypeName, activeTypes }}>
      {children}
    </EmployeeTypeContext.Provider>
  );
}

export function useEmployeeTypes() {
  const ctx = useContext(EmployeeTypeContext);
  if (!ctx) throw new Error("useEmployeeTypes must be used within EmployeeTypeProvider");
  return ctx;
}
