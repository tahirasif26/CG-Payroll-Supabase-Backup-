import { createContext, useContext, useMemo, ReactNode } from "react";
import {
  usePayrollSetups as usePayrollSetupsApi,
  useCreatePayrollSetup,
  useUpdatePayrollSetup,
  useDeletePayrollSetup,
  type PayrollSetup as ApiPayrollSetup,
  type ComponentInput,
  type TaxRuleInput,
} from "@/api";
import { PayrollSetup, PayslipComponent, TaxSlab } from "@/types/payrollSetup";
import { COUNTRIES } from "@/lib/countries";
import { useConsumerCounter, useLazyContextSubscribe } from "@/lib/lazy-context-query";

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
  getSetupById: (id: string) => PayrollSetup | undefined;
  isLoading: boolean;
  /** Aggregate pending flag for any write op — wizard uses it to disable buttons. */
  isSaving: boolean;
  /** @internal — wired up by `usePayrollSetups()` so the underlying query only fires while a page is consuming this provider. */
  _subscribe: () => () => void;
}

/** ISO-2 (`SA`) or display name (`Saudi Arabia`) → ISO-2. Defaults to `SA`. */
function toIsoCountry(input: string): string {
  if (!input) return "SA";
  const trimmed = input.trim();
  if (trimmed.length === 2) return trimmed.toUpperCase();
  const match = COUNTRIES.find(
    (c) =>
      c.name.toLowerCase() === trimmed.toLowerCase() ||
      c.code.toLowerCase() === trimmed.toLowerCase(),
  );
  return match ? match.code : "SA";
}

/** ISO-2 → display name for the UI (the wizard's <Select> renders names). */
function isoToCountryName(input: string | null | undefined): string {
  if (!input) return "Saudi Arabia";
  const m = COUNTRIES.find((c) => c.code.toLowerCase() === input.toLowerCase());
  return m ? m.name : input;
}

/** UI component → API ComponentInput. */
function componentToInput(c: PayslipComponent, orderIndex: number): ComponentInput {
  // Backend `value` is minor units for fixed, basis points for percentage,
  // ignored for formula. The legacy UI stores raw decimals (e.g. 100 = 100%,
  // 5000 = 5000.00 currency). Persist as-is in minor scale (×100) so the
  // calculator can reason about it uniformly.
  const numeric = typeof c.value === "number" ? c.value : Number(c.value ?? 0);
  const valueMinor =
    c.calculationType === "percentage"
      ? Math.round(numeric * 100) // 12.5% → 1250 bps
      : Math.round(numeric * 100); // 5000.00 SAR → 500000 halalas
  return {
    name: c.name,
    type: c.type,
    calculationType: c.calculationType,
    value: String(valueMinor),
    formula: c.formula ?? null,
    orderIndex,
    isActive: c.status === "active",
  };
}

/** UI tax slab → API TaxRuleInput. */
function taxToInput(t: TaxSlab, orderIndex: number): TaxRuleInput {
  return {
    slabName: t.name,
    incomeFromMinor: Math.round((t.incomeFrom ?? 0) * 100),
    incomeToMinor:
      t.incomeTo == null || Number.isNaN(t.incomeTo)
        ? null
        : Math.round(t.incomeTo * 100),
    rateBps: Math.round((t.percentage ?? 0) * 100), // 15% → 1500 bps
    orderIndex,
  };
}

/** API component → UI PayslipComponent. */
function inputToComponent(
  row: { id: string; name: string; type: string; calculationType: string; value: string; formula: string | null; isActive: boolean },
): PayslipComponent {
  const minor = Number(row.value ?? 0);
  return {
    id: row.id,
    name: row.name,
    type: row.type as PayslipComponent["type"],
    calculationType: row.calculationType as PayslipComponent["calculationType"],
    value: minor / 100,
    formula: row.formula ?? undefined,
    status: row.isActive ? "active" : "inactive",
  };
}

/** API tax rule → UI TaxSlab. */
function inputToTax(row: {
  id: string;
  slabName: string;
  incomeFromMinor: string;
  incomeToMinor: string | null;
  rateBps: number;
}): TaxSlab {
  return {
    id: row.id,
    name: row.slabName,
    incomeFrom: Number(row.incomeFromMinor ?? 0) / 100,
    incomeTo: row.incomeToMinor == null ? 0 : Number(row.incomeToMinor) / 100,
    percentage: (row.rateBps ?? 0) / 100,
  };
}

const PayrollSetupContext = createContext<PayrollSetupContextType | undefined>(undefined);

function rowToSetup(row: ApiPayrollSetup): PayrollSetup {
  const opts = (row.options ?? {}) as Partial<PayrollSetup>;
  // Prefer relational rows when present; fall back to whatever the legacy
  // options blob carried so existing setups don't lose their components.
  const components =
    Array.isArray(row.components) && row.components.length > 0
      ? row.components.map(inputToComponent)
      : opts.payslipComponents ?? [];
  const taxRules =
    Array.isArray(row.taxRules) && row.taxRules.length > 0
      ? row.taxRules.map(inputToTax)
      : opts.taxRules ?? [];
  return {
    id: row.id,
    name: row.name,
    // Backend stores ISO-2; the wizard's country dropdown shows display names.
    country: isoToCountryName(row.country) || opts.country || "",
    currency: row.currency ?? opts.currency ?? "SAR",
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
    payslipComponents: components,
    taxRules,
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
  // Strip the relational fields out of `options` — they're sent as top-level
  // arrays so the backend can persist them in the payroll_setup_components and
  // payroll_setup_tax_rules tables. Leaving them inside `options` too would
  // duplicate state and cause `rowToSetup` to read stale data on next refetch.
  const { id, lastUpdated, payslipComponents, taxRules, country, currency, paySchedule, ...rest } = setup;
  void id;
  void lastUpdated;
  // bi-weekly comes from the UI as "bi-weekly", the backend enum expects "biweekly".
  const frequency: "monthly" | "weekly" | "biweekly" =
    paySchedule.payFrequency === "bi-weekly" ? "biweekly" : paySchedule.payFrequency;
  return {
    name: setup.name,
    country: toIsoCountry(country),
    currency: (currency || "SAR").toUpperCase(),
    payFrequency: frequency,
    // Everything that doesn't have a first-class column lives here.
    options: { ...rest, paySchedule } as Record<string, unknown>,
    components: payslipComponents.map((c, i) => componentToInput(c, i)),
    taxRules: taxRules.map((t, i) => taxToInput(t, i)),
  };
}

export function PayrollSetupProvider({ children }: { children: ReactNode }) {
  // Hold the list query until a page consumes the context via `usePayrollSetups()`.
  const { enabled, subscribe } = useConsumerCounter();
  const listQ = usePayrollSetupsApi({ enabled });
  const createMut = useCreatePayrollSetup();
  const updateMut = useUpdatePayrollSetup();
  const deleteMut = useDeletePayrollSetup();

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
    deleteSetup: async (id) => {
      await deleteMut.mutateAsync(id);
    },
    duplicateSetup: async (id) => {
      const src = setups.find((s) => s.id === id);
      if (!src) return;
      // Drop child ids so the backend mints new ones for components & tax rules.
      const copy: PayrollSetup = {
        ...src,
        id: "",
        name: `${src.name} (Copy)`,
        payslipComponents: src.payslipComponents.map((c) => ({ ...c, id: `${c.id}-copy-${Date.now()}` })),
        taxRules: src.taxRules.map((t) => ({ ...t, id: `${t.id}-copy-${Date.now()}` })),
      };
      await createMut.mutateAsync(setupToCreateBody(copy));
    },
    getSetupById: (id) => setups.find((s) => s.id === id),
    isLoading: listQ.isLoading,
    isSaving: createMut.isPending || updateMut.isPending || deleteMut.isPending,
    _subscribe: subscribe,
  };

  return <PayrollSetupContext.Provider value={value}>{children}</PayrollSetupContext.Provider>;
}

export function usePayrollSetups() {
  const ctx = useContext(PayrollSetupContext);
  if (!ctx) throw new Error("usePayrollSetups must be used within PayrollSetupProvider");
  useLazyContextSubscribe(ctx._subscribe);
  return ctx;
}
