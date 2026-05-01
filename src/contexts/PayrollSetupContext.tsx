import React, { createContext, useContext, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useModuleEnabled } from "@/hooks/useModuleEnabled";
import { PayrollSetup } from "@/types/payrollSetup";

interface PayrollSetupContextType {
  setups: PayrollSetup[];
  addSetup: (setup: PayrollSetup) => void;
  updateSetup: (setup: PayrollSetup) => void;
  deleteSetup: (id: string) => void;
  duplicateSetup: (id: string) => void;
  toggleStatus: (id: string) => void;
  getSetupById: (id: string) => PayrollSetup | undefined;
  isLoading: boolean;
}

const PayrollSetupContext = createContext<PayrollSetupContextType | undefined>(undefined);

// Build the rich UI PayrollSetup from the DB row.
// Top-level columns hold name/country/currency/status; the entire structured
// config is round-tripped through the `options` jsonb column.
function rowToSetup(row: any): PayrollSetup {
  const opts = (row.options ?? {}) as Partial<PayrollSetup>;
  return {
    id: row.id,
    name: row.name,
    country: row.country ?? opts.country ?? "",
    currency: row.currency ?? opts.currency ?? "SAR",
    status: (row.status === "active" ? "active" : "inactive") as "active" | "inactive",
    lastUpdated: (row.updated_at ?? row.created_at ?? new Date().toISOString()).split("T")[0],
    paySchedule: opts.paySchedule ?? {
      payFrequency: (row.pay_frequency as any) ?? "monthly",
      cycleStartDate: "1",
      cycleEndDate: "30",
      payDate: "28",
      cutoffDate: "25",
    },
    options: opts.options ?? {
      includeOvertime: false,
      includeUnpaidLeave: false,
      enableTaxCalculation: false,
      allowNegativeSalary: false,
    },
    payslipComponents: opts.payslipComponents ?? [],
    taxRules: opts.taxRules ?? [],
    salaryRules: opts.salaryRules ?? {
      salaryType: "fixed",
      prorationRule: "calendar-days",
      workingDaysPerMonth: 30,
    },
    overtime: opts.overtime ?? { enabled: false, rateMultiplier: 1.5, maxOvertimeHours: 40 },
    autoDeductions: opts.autoDeductions ?? {
      latePenaltyEnabled: false,
      latePenaltyAmount: 0,
      absenceDeductionEnabled: false,
      absenceDeductionPerDay: 0,
      customRules: [],
    },
    loanAdvance: opts.loanAdvance ?? {
      enableAdvanceDeduction: false,
      maxDeductionPercentage: 0,
      autoDeductRemaining: false,
    },
    leaveEncashment: opts.leaveEncashment ?? { enabled: false, formula: "", leaveAllocations: [] },
    finalSettlement: opts.finalSettlement ?? {
      includeLeaveEncashment: false,
      includePendingSalary: true,
      includeDeductions: true,
      noticePeriodRecoveryDays: 30,
    },
    retirement: opts.retirement ?? {
      enablePF: false,
      employeeContributionPct: 0,
      employerContributionPct: 0,
      enableVPS: false,
      vpsContributionRules: "",
    },
    approvalWorkflow: opts.approvalWorkflow ?? { enabled: false, levels: [] },
  };
}

function setupToRow(setup: PayrollSetup, clientId: string) {
  // Strip top-level identity from the jsonb blob to avoid duplication noise.
  const { id, lastUpdated, ...config } = setup;
  return {
    client_id: clientId,
    name: setup.name,
    country: setup.country,
    currency: setup.currency,
    pay_frequency: setup.paySchedule.payFrequency,
    status: setup.status,
    options: config as any,
  };
}

export function PayrollSetupProvider({ children }: { children: React.ReactNode }) {
  const { clientId } = useAuth();
  const payrollEnabled = useModuleEnabled("payroll");
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["payroll_setups", clientId],
    enabled: !!clientId && payrollEnabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_setups")
        .select("*")
        .eq("client_id", clientId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const setups: PayrollSetup[] = useMemo(() => rows.map(rowToSetup), [rows]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["payroll_setups"] });

  const addMut = useMutation({
    mutationFn: async (setup: PayrollSetup) => {
      if (!clientId) throw new Error("No client");
      const { error } = await supabase.from("payroll_setups").insert(setupToRow(setup, clientId));
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateMut = useMutation({
    mutationFn: async (setup: PayrollSetup) => {
      if (!clientId) throw new Error("No client");
      const row = setupToRow(setup, clientId);
      const { error } = await supabase.from("payroll_setups").update(row).eq("id", setup.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payroll_setups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const duplicateMut = useMutation({
    mutationFn: async (id: string) => {
      if (!clientId) throw new Error("No client");
      const original = setups.find((s) => s.id === id);
      if (!original) return;
      const copy: PayrollSetup = {
        ...JSON.parse(JSON.stringify(original)),
        id: "",
        name: `${original.name} (Copy)`,
      };
      const { error } = await supabase.from("payroll_setups").insert(setupToRow(copy, clientId));
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const toggleMut = useMutation({
    mutationFn: async (id: string) => {
      const target = setups.find((s) => s.id === id);
      if (!target) return;
      const newStatus = target.status === "active" ? "inactive" : "active";
      const { error } = await supabase
        .from("payroll_setups")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const getSetupById = useCallback((id: string) => setups.find((s) => s.id === id), [setups]);

  return (
    <PayrollSetupContext.Provider
      value={{
        setups,
        addSetup: (s) => addMut.mutate(s),
        updateSetup: (s) => updateMut.mutate(s),
        deleteSetup: (id) => deleteMut.mutate(id),
        duplicateSetup: (id) => duplicateMut.mutate(id),
        toggleStatus: (id) => toggleMut.mutate(id),
        getSetupById,
        isLoading,
      }}
    >
      {children}
    </PayrollSetupContext.Provider>
  );
}

export function usePayrollSetups() {
  const ctx = useContext(PayrollSetupContext);
  if (!ctx) throw new Error("usePayrollSetups must be used within PayrollSetupProvider");
  return ctx;
}
