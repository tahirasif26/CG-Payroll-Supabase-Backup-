import { createContext, useContext, useMemo, ReactNode } from "react";
import {
  usePayrollSetups as usePayrollSetupsApi,
  useCreatePayrollSetup,
  useUpdatePayrollSetup,
  useActivatePayrollSetup,
  type PayrollSetup as ApiPayrollSetup,
} from "@/api";
import { PayrollSetup } from "@/types/payrollSetup";

/**
 * Migrated to NestJS via @/api/payroll. The legacy UI shape carries a rich
 * `options` blob (paySchedule, options, overtime, leaves, bonus, gratuity,
 * providentFund, etc.). The backend already stores this verbatim under
 * `PayrollSetup.options` JSON column, so we round-trip it through there.
 */

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

function rowToSetup(row: ApiPayrollSetup): PayrollSetup {
  const opts = (row.options ?? {}) as Partial<PayrollSetup>;
  return {
    id: row.id,
    name: row.name,
    country: row.country ?? opts.country ?? "",
    currency: row.currency ?? opts.currency ?? "SAR",
    status: (row.status === "active" ? "active" : "inactive") as "active" | "inactive",
    lastUpdated: (row.updatedAt ?? row.createdAt ?? new Date().toISOString()).split("T")[0],
    paySchedule: opts.paySchedule ?? {
      payFrequency: (row.payFrequency as PayrollSetup["paySchedule"]["payFrequency"]) ?? "monthly",
      cycleStartDate: "1",
      cycleEndDate: "EOM",
      payDate: "28",
    },
    options: opts.options ?? {
      includeOvertime: false,
      includeUnpaidLeave: false,
      enableTaxCalculation: false,
      allowNegativeSalary: false,
    },
    payslipComponents: opts.payslipComponents ?? [],
    taxRules: opts.taxRules ?? [],
    taxComponentName: (opts as any).taxComponentName,
    taxBasis: (opts as any).taxBasis,
    taxBracketBasis: (opts as any).taxBracketBasis,
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
    finalSettlement: opts.finalSettlement ?? { noticePeriodRecoveryDays: 30 },
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
    bonus: opts.bonus ?? {
      enabled: false,
      method: "percentage",
      value: 0,
      frequency: "annual",
      includeInPayslip: true,
    },
    gratuity: opts.gratuity ?? {
      enabled: true,
      method: "saudi",
      slab1Days: 0,
      slab2Days: 15,
      slab3Days: 21,
      slab4Days: 30,
      maxMonths: 24,
      basis: "basic",
    },
    providentFund: opts.providentFund ?? {
      enabled: false,
      scheme: "gosi_saudi",
      employeeRate: 9.75,
      employerRate: 9.75,
      basis: "basic",
      autoDeduct: true,
    },
    approvalWorkflow: opts.approvalWorkflow ?? { enabled: false, levels: [] },
  };
}

function setupToCreateBody(setup: PayrollSetup) {
  const { id, lastUpdated, ...config } = setup;
  void id;
  void lastUpdated;
  return {
    name: setup.name,
    country: setup.country || "SA",
    currency: setup.currency || "SAR",
    payFrequency: setup.paySchedule.payFrequency,
    options: config as Record<string, unknown>,
  };
}

export function PayrollSetupProvider({ children }: { children: ReactNode }) {
  const listQ = usePayrollSetupsApi();
  const createMut = useCreatePayrollSetup();
  const updateMut = useUpdatePayrollSetup();
  const activateMut = useActivatePayrollSetup();

  const setups = useMemo<PayrollSetup[]>(
    () => (listQ.data ?? []).map(rowToSetup),
    [listQ.data],
  );

  const value: PayrollSetupContextType = {
    setups,
    addSetup: async (setup) => {
      await createMut.mutateAsync(setupToCreateBody(setup));
    },
    updateSetup: async (setup) => {
      await updateMut.mutateAsync({ id: setup.id, body: setupToCreateBody(setup) });
    },
    deleteSetup: async () => {
      // eslint-disable-next-line no-console
      console.warn(
        "[PayrollSetupContext] deleteSetup not exposed on backend. " +
          "Set status to 'archived' via updateSetup instead.",
      );
    },
    duplicateSetup: async (id) => {
      const src = setups.find((s) => s.id === id);
      if (!src) return;
      const copy: PayrollSetup = {
        ...src,
        id: "",
        name: `${src.name} (Copy)`,
        status: "inactive",
      };
      await createMut.mutateAsync(setupToCreateBody(copy));
    },
    toggleStatus: async (id) => {
      const s = setups.find((x) => x.id === id);
      if (!s) return;
      if (s.status === "active") {
        // eslint-disable-next-line no-console
        console.warn(
          "[PayrollSetupContext] deactivation not exposed; backend has draft/active/archived only.",
        );
        return;
      }
      await activateMut.mutateAsync(id);
    },
    getSetupById: (id) => setups.find((s) => s.id === id),
    isLoading: listQ.isLoading,
  };

  return <PayrollSetupContext.Provider value={value}>{children}</PayrollSetupContext.Provider>;
}

export function usePayrollSetups() {
  const ctx = useContext(PayrollSetupContext);
  if (!ctx) throw new Error("usePayrollSetups must be used within PayrollSetupProvider");
  return ctx;
}
