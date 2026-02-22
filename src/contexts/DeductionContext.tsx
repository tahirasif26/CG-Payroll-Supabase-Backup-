import React, { createContext, useContext, useState, ReactNode } from "react";
import { deductions as initialDeductions } from "@/data/mockData";
import type { Deduction } from "@/types/hcm";

interface DeductionContextType {
  deductions: Deduction[];
  setDeductions: React.Dispatch<React.SetStateAction<Deduction[]>>;
  updateDeduction: (id: string, updates: Partial<Deduction>) => void;
  addDeduction: (ded: Deduction) => void;
  removeDeduction: (id: string) => void;
}

const DeductionContext = createContext<DeductionContextType | undefined>(undefined);

export function DeductionProvider({ children }: { children: ReactNode }) {
  const [deductions, setDeductions] = useState<Deduction[]>([...initialDeductions]);

  const updateDeduction = (id: string, updates: Partial<Deduction>) => {
    setDeductions(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const addDeduction = (ded: Deduction) => {
    setDeductions(prev => [...prev, ded]);
  };

  const removeDeduction = (id: string) => {
    setDeductions(prev => prev.filter(d => d.id !== id));
  };

  return (
    <DeductionContext.Provider value={{ deductions, setDeductions, updateDeduction, addDeduction, removeDeduction }}>
      {children}
    </DeductionContext.Provider>
  );
}

export function useDeductions() {
  const ctx = useContext(DeductionContext);
  if (!ctx) throw new Error("useDeductions must be used within DeductionProvider");
  return ctx;
}
