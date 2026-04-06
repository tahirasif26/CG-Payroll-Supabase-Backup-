import React, { createContext, useContext, useState, useCallback } from "react";
import { PayrollSetup } from "@/types/payrollSetup";
import { defaultPayrollSetups } from "@/data/payrollSetupData";

interface PayrollSetupContextType {
  setups: PayrollSetup[];
  addSetup: (setup: PayrollSetup) => void;
  updateSetup: (setup: PayrollSetup) => void;
  deleteSetup: (id: string) => void;
  duplicateSetup: (id: string) => void;
  toggleStatus: (id: string) => void;
  getSetupById: (id: string) => PayrollSetup | undefined;
}

const PayrollSetupContext = createContext<PayrollSetupContextType | undefined>(undefined);

export function PayrollSetupProvider({ children }: { children: React.ReactNode }) {
  const [setups, setSetups] = useState<PayrollSetup[]>(defaultPayrollSetups);

  const addSetup = useCallback((setup: PayrollSetup) => {
    setSetups(prev => [...prev, setup]);
  }, []);

  const updateSetup = useCallback((setup: PayrollSetup) => {
    setSetups(prev => prev.map(s => s.id === setup.id ? { ...setup, lastUpdated: new Date().toISOString().split("T")[0] } : s));
  }, []);

  const deleteSetup = useCallback((id: string) => {
    setSetups(prev => prev.filter(s => s.id !== id));
  }, []);

  const duplicateSetup = useCallback((id: string) => {
    setSetups(prev => {
      const original = prev.find(s => s.id === id);
      if (!original) return prev;
      const copy: PayrollSetup = {
        ...JSON.parse(JSON.stringify(original)),
        id: `ps-${Date.now()}`,
        name: `${original.name} (Copy)`,
        lastUpdated: new Date().toISOString().split("T")[0],
      };
      return [...prev, copy];
    });
  }, []);

  const toggleStatus = useCallback((id: string) => {
    setSetups(prev => prev.map(s => s.id === id ? { ...s, status: s.status === "active" ? "inactive" : "active", lastUpdated: new Date().toISOString().split("T")[0] } : s));
  }, []);

  const getSetupById = useCallback((id: string) => {
    return setups.find(s => s.id === id);
  }, [setups]);

  return (
    <PayrollSetupContext.Provider value={{ setups, addSetup, updateSetup, deleteSetup, duplicateSetup, toggleStatus, getSetupById }}>
      {children}
    </PayrollSetupContext.Provider>
  );
}

export function usePayrollSetups() {
  const ctx = useContext(PayrollSetupContext);
  if (!ctx) throw new Error("usePayrollSetups must be used within PayrollSetupProvider");
  return ctx;
}
