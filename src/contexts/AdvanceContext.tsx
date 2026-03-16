import React, { createContext, useContext, useState, useCallback } from "react";

export interface Advance {
  id: string;
  advanceName: string;
  employeeId: string;
  employeeName: string;
  purpose: string;
  amount: number;
  amountUsed: number;
  currency: string;
  status: "pending" | "approved" | "rejected";
  requestDate: string;
  expectedSpendDate: string;
  settlementDueDate: string;
  attachments: string[];
  notes: string;
  payrollRunId?: string;
  lastReminderSent?: string;
}

const initialAdvances: Advance[] = [
  {
    id: "ADV-001", advanceName: "Client Visit - Riyadh", employeeId: "1", employeeName: "Aisha Rahman",
    purpose: "Travel and accommodation for client site visit", amount: 5000, amountUsed: 3200, currency: "SAR",
    status: "approved", requestDate: "2025-03-01", expectedSpendDate: "2025-03-15", settlementDueDate: "2025-04-01",
    attachments: [], notes: "3-day client engagement trip",
  },
  {
    id: "ADV-002", advanceName: "Conference Registration", employeeId: "2", employeeName: "Omar Al-Faisal",
    purpose: "Annual tax conference fees and travel", amount: 8000, amountUsed: 0, currency: "SAR",
    status: "pending", requestDate: "2025-03-05", expectedSpendDate: "2025-04-10", settlementDueDate: "2025-04-30",
    attachments: [], notes: "",
  },
  {
    id: "ADV-003", advanceName: "Equipment Purchase", employeeId: "4", employeeName: "Khalid Nasser",
    purpose: "Purchase portable projector for client presentations", amount: 3500, amountUsed: 3500, currency: "SAR",
    status: "approved", requestDate: "2025-02-20", expectedSpendDate: "2025-02-28", settlementDueDate: "2025-03-15",
    attachments: [], notes: "Fully utilized",
  },
  {
    id: "ADV-004", advanceName: "Training Materials", employeeId: "3", employeeName: "Fatima Hassan",
    purpose: "Books and online course subscriptions", amount: 1200, amountUsed: 0, currency: "SAR",
    status: "rejected", requestDate: "2025-03-02", expectedSpendDate: "2025-03-20", settlementDueDate: "2025-04-15",
    attachments: [], notes: "Rejected: covered by L&D budget",
  },
];

interface AdvanceContextType {
  advances: Advance[];
  addAdvance: (adv: Advance) => void;
  approveAdvance: (id: string, payrollRunId?: string) => void;
  rejectAdvance: (id: string) => void;
  useAdvanceAmount: (id: string, amount: number) => void;
  getEmployeeAdvances: (employeeId: string) => Advance[];
}

const AdvanceContext = createContext<AdvanceContextType | undefined>(undefined);

export function AdvanceProvider({ children }: { children: React.ReactNode }) {
  const [advances, setAdvances] = useState<Advance[]>(initialAdvances);

  const addAdvance = useCallback((adv: Advance) => {
    setAdvances(prev => [adv, ...prev]);
  }, []);

  const approveAdvance = useCallback((id: string, payrollRunId?: string) => {
    setAdvances(prev => prev.map(a => a.id === id ? { ...a, status: "approved" as const, payrollRunId } : a));
  }, []);

  const rejectAdvance = useCallback((id: string) => {
    setAdvances(prev => prev.map(a => a.id === id ? { ...a, status: "rejected" as const } : a));
  }, []);

  const useAdvanceAmount = useCallback((id: string, amount: number) => {
    setAdvances(prev => prev.map(a => a.id === id ? { ...a, amountUsed: a.amountUsed + amount } : a));
  }, []);

  const getEmployeeAdvances = useCallback((employeeId: string) => {
    return advances.filter(a => a.employeeId === employeeId && a.status === "approved" && (a.amount - a.amountUsed) > 0);
  }, [advances]);

  return (
    <AdvanceContext.Provider value={{ advances, addAdvance, approveAdvance, rejectAdvance, useAdvanceAmount, getEmployeeAdvances }}>
      {children}
    </AdvanceContext.Provider>
  );
}

export function useAdvances() {
  const ctx = useContext(AdvanceContext);
  if (!ctx) throw new Error("useAdvances must be used within AdvanceProvider");
  return ctx;
}
