/**
 * Pure payroll calculator. NO React, NO Supabase. Fully unit-testable.
 *
 * All money values are bigint MINOR units (halalas, fils, cents) — see src/lib/money.ts
 * for the rationale.
 */
import {
  addMoney,
  subtractMoney,
  percentOf,
  multiplyMoney,
  divideMoney,
  toMinorUnits,
} from "../money";
import type {
  CalculationContext,
  PayrollComponent,
  PayrollLineResult,
  PayrollTaxRule,
} from "./types";
import { calculateMonthlyEosAccrual } from "./eosAccrual";

/** Resolve a single component to a bigint amount in minor units. */
function resolveComponent(
  c: PayrollComponent,
  gross: bigint,
  currency: string
): bigint {
  switch (c.calculation_type) {
    case "percentage":
      return percentOf(gross, c.value);
    case "fixed":
      return toMinorUnits(c.value, currency);
    case "formula":
      // Formula support is intentionally limited in v1 — treat as fixed amount.
      // Hook in a real formula evaluator later if needed.
      return toMinorUnits(c.value, currency);
    default:
      return 0n;
  }
}

/**
 * Annualize the monthly gross, walk the slab table, and divide by 12 for the
 * monthly tax deduction. Returns 0n when tax is disabled or no rules exist.
 */
export function calculateTax(
  rules: PayrollTaxRule[],
  monthlyGross: bigint,
  enabled: boolean
): bigint {
  if (!enabled || rules.length === 0 || monthlyGross <= 0n) return 0n;

  const annualGross = multiplyMoney(monthlyGross, 12);
  const sortedRules = [...rules].sort((a, b) => a.order_index - b.order_index);

  let totalTax = 0n;
  for (const slab of sortedRules) {
    if (annualGross <= slab.income_from) continue;
    const upper = annualGross < slab.income_to ? annualGross : slab.income_to;
    const taxableInSlab = upper - slab.income_from;
    if (taxableInSlab > 0n) {
      totalTax = addMoney(totalTax, percentOf(taxableInSlab, slab.percentage));
    }
  }

  return divideMoney(totalTax, 12);
}

/**
 * Compute the basic-salary portion of a gross pay. Honours an explicitly
 * configured "Basic" earning component when present; otherwise defaults to 60%
 * of gross — a common Gulf payroll convention.
 */
export function calculateBasic(
  components: PayrollComponent[],
  gross: bigint,
  currency: string
): bigint {
  const basicComponent = components.find(
    (c) =>
      c.type === "earning" &&
      c.status === "active" &&
      c.name.toLowerCase().includes("basic")
  );
  if (!basicComponent) return percentOf(gross, 60);
  return resolveComponent(basicComponent, gross, currency);
}

/** Main entry point — build a complete payroll line for one employee. */
export function calculateEmployeePayroll(
  ctx: CalculationContext
): PayrollLineResult {
  const currency = ctx.employee.pay_currency || ctx.setup.currency;
  const gross = toMinorUnits(ctx.employee.salary, currency);

  const basic = calculateBasic(ctx.components, gross, currency);
  const allowances = subtractMoney(gross, basic);

  // Setup-defined deductions (GOSI, insurance, etc.)
  const statutoryDeduction = ctx.components
    .filter((c) => c.type === "deduction" && c.status === "active")
    .reduce(
      (sum, c) => addMoney(sum, resolveComponent(c, gross, currency)),
      0n
    );

  const taxDeduction = calculateTax(
    ctx.taxRules,
    gross,
    ctx.setup.options.enable_tax_calculation === true
  );

  const loanDeduction = ctx.loans.reduce(
    (sum, l) => addMoney(sum, l.monthly_deduction),
    0n
  );

  const oneOffBenefits = ctx.oneOffAdjustments
    .filter((o) => o.type === "benefit")
    .reduce((s, o) => addMoney(s, o.amount), 0n);

  const oneOffDeductions = ctx.oneOffAdjustments
    .filter((o) => o.type === "deduction")
    .reduce((s, o) => addMoney(s, o.amount), 0n);

  const totalDeductions = addMoney(
    statutoryDeduction,
    taxDeduction,
    loanDeduction,
    oneOffDeductions
  );

  const additions = addMoney(
    ctx.approvedExpenses,
    ctx.approvedAdvances,
    oneOffBenefits,
    ctx.separation?.settlement ?? 0n
  );

  const netPay = addMoney(subtractMoney(gross, totalDeductions), additions);

  const eosAccrual = ctx.eosAccrual
    ? calculateMonthlyEosAccrual({
        country: ctx.eosAccrual.country ?? null,
        gratuityBasis: ctx.eosAccrual.gratuityBasis,
        joiningDate: ctx.eosAccrual.joiningDate,
        periodEndDate: ctx.eosAccrual.periodEndDate,
      })
    : 0n;

  return {
    basic,
    allowances,
    gross,
    loanDeduction,
    taxDeduction,
    statutoryDeduction,
    otherDeductions: 0n,
    totalDeductions,
    expenseReimbursement: ctx.approvedExpenses,
    advanceGiven: ctx.approvedAdvances,
    oneOffBenefits,
    oneOffDeductions,
    separationSettlement: ctx.separation?.settlement ?? 0n,
    eosAccrual,
    netPay,
    payCurrency: currency,
    snapshot: {
      employeeId: ctx.employee.id,
      empCode: ctx.employee.emp_id,
      salary: ctx.employee.salary,
      currency,
      componentCount: ctx.components.length,
      taxRuleCount: ctx.taxRules.length,
      loanCount: ctx.loans.length,
      oneOffCount: ctx.oneOffAdjustments.length,
      hasSeparation: !!ctx.separation,
      eosAccrued: eosAccrual.toString(),
      calculatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Aggregate many lines into the run-level totals stored on payroll_runs.
 * Caller is responsible for FX-converting cross-currency lines if needed.
 */
export function aggregateRunTotals(lines: PayrollLineResult[]): {
  total_gross: bigint;
  total_deductions: bigint;
  total_net: bigint;
  employee_count: number;
} {
  return lines.reduce(
    (acc, l) => ({
      total_gross: addMoney(acc.total_gross, l.gross),
      total_deductions: addMoney(acc.total_deductions, l.totalDeductions),
      total_net: addMoney(acc.total_net, l.netPay),
      employee_count: acc.employee_count + 1,
    }),
    {
      total_gross: 0n,
      total_deductions: 0n,
      total_net: 0n,
      employee_count: 0,
    }
  );
}
