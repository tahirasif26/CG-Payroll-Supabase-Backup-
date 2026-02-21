import { createContext, useContext, useState, ReactNode } from "react";

export interface SeparationRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  empId: string;
  department: string;
  designation: string;
  lastDate: string;
  reason: string;
  noticePeriodDays: number;
  noticePeriodServed: boolean;
  unpaidSalary: number;
  eosAmount: number;
  eosBreakdown: { name: string; amount: number }[];
  leaveEncashment: number;
  noticePeriodPay: number;
  loanDeduction: number;
  totalSettlement: number;
  processedDate: string;
  payrollMonth: string;
  payrollYear: number;
  payrollRunId?: string;
}

interface SeparationContextType {
  separations: SeparationRecord[];
  addSeparation: (sep: SeparationRecord) => void;
  updateSeparation: (id: string, data: Partial<SeparationRecord>) => void;
  removeSeparation: (id: string) => void;
}

const SeparationContext = createContext<SeparationContextType | undefined>(undefined);

export function SeparationProvider({ children }: { children: ReactNode }) {
  const [separations, setSeparations] = useState<SeparationRecord[]>([]);

  const addSeparation = (sep: SeparationRecord) => {
    setSeparations(prev => [...prev, sep]);
  };

  const updateSeparation = (id: string, data: Partial<SeparationRecord>) => {
    setSeparations(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  };

  const removeSeparation = (id: string) => {
    setSeparations(prev => prev.filter(s => s.id !== id));
  };

  return (
    <SeparationContext.Provider value={{ separations, addSeparation, updateSeparation, removeSeparation }}>
      {children}
    </SeparationContext.Provider>
  );
}

export function useSeparations() {
  const ctx = useContext(SeparationContext);
  if (!ctx) throw new Error("useSeparations must be used within SeparationProvider");
  return ctx;
}
