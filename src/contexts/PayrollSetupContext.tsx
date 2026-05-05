import React, { createContext, useContext, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { useModuleEnabled } from "@/hooks/useModuleEnabled";
import { PayrollSetup } from "@/types/payrollSetup";

interface PayrollSetupContextType {
  setups: PayrollSetup[];
  addSetup: (setup: PayrollSetup) => Promise<void>;
  updateSetup: (setup: PayrollSetup) => Promise<void>;
  deleteSetup: (id: string) => Promise<void>;
  duplicateSetup: (id: string) => Promise<void>;
  toggleStatus: (id: string) => Promise<void>;
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
    finalSettlement: opts.finalSettlement ?? {
      noticePeriodRecoveryDays: 30,
    },
    retirement: opts.retirement ?? {
      enablePF: false,
      employeeContributionPct: 0,
      employerContributionPct: 0,
      enableVPS: false,
      vpsContributionRules: "",
    },
    leaves: opts.leaves ?? {
      includeUnpaidLeave: false,
      leaveTypes: {
        annual: { enabled: true, days: 21 },
        sick: { enabled: true, days: 10 },
        emergency: { enabled: true, days: 3 },
        maternity: { enabled: true, days: 60 },
        paternity: { enabled: true, days: 3 },
        hajj: { enabled: true, days: 14 },
        unpaid: { enabled: true, days: 0 },
      },
      allowCarryForward: false,
      maxCarryForwardDays: 10,
    },
    bonus: opts.bonus ?? { enabled: false, method: "percentage", value: 0, frequency: "annual", includeInPayslip: true },
    gratuity: opts.gratuity ?? { enabled: true, method: "saudi", slab1Days: 15, slab2Days: 30, maxMonths: 24, basis: "basic" },
    providentFund: opts.providentFund ?? { enabled: false, scheme: "gosi_saudi", employeeRate: 9.75, employerRate: 9.75, basis: "basic", autoDeduct: true },
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
  const { clientId } = useRole();
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

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["payroll_setups"] });
    qc.refetchQueries({ queryKey: ["payroll_setups"], type: "active" });
  };

  const addMut = useMutation({
    mutationFn: async (setup: PayrollSetup) => {
      if (!clientId) throw new Error("No client");
      const { data: inserted, error } = await supabase
        .from("payroll_setups")
        .insert(setupToRow(setup, clientId))
        .select("id")
        .single();
      if (error) throw error;

      // Auto-create the first open payroll run for this setup so it shows up
      // immediately on the Payroll page Live cards.
      try {
        const now = new Date();
        const payDate = parseInt(setup.paySchedule?.payDate ?? "25", 10) || 25;
        const monthIdx = now.getMonth(); // 0-11
        const advance = now.getDate() > payDate;
        const targetIdx = advance ? (monthIdx + 1) % 12 : monthIdx;
        const targetYear = advance && monthIdx === 11 ? now.getFullYear() + 1 : now.getFullYear();
        const monthNames = [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December",
        ];
        const { data: { user } } = await supabase.auth.getUser();
        if (inserted?.id && user?.id) {
          await supabase.from("payroll_runs").insert({
            client_id: clientId,
            payroll_setup_id: inserted.id,
            month: monthNames[targetIdx],
            year: targetYear,
            run_date: `${targetYear}-${String(targetIdx + 1).padStart(2, "0")}-${String(payDate).padStart(2, "0")}`,
            status: "draft",
            created_by: user.id,
          });
          qc.invalidateQueries({ queryKey: ["payroll_runs"] });
        }
      } catch {
        // Non-fatal: setup was created, run can be added manually if this fails.
      }
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
        addSetup: (s) => addMut.mutateAsync(s),
        updateSetup: (s) => updateMut.mutateAsync(s),
        deleteSetup: (id) => deleteMut.mutateAsync(id),
        duplicateSetup: (id) => duplicateMut.mutateAsync(id),
        toggleStatus: (id) => toggleMut.mutateAsync(id),
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
