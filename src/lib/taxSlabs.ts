import type { PayrollSetup, TaxSlab } from "@/types/payrollSetup";

export interface MatchedTax {
  slabId: string;
  slabName: string;
  percentage: number;
  /** Monthly tax, rounded to 2 dp. */
  amount: number;
}

/**
 * Find the single tax slab whose [incomeFrom, incomeTo] range contains the
 * employee's monthly base salary, and apply its percentage to the FULL base.
 *
 * Returns null when:
 *  - tax calculation is disabled on the setup,
 *  - no slabs are configured,
 *  - the salary is non-positive,
 *  - or the salary falls outside every defined slab.
 */
export function matchTaxSlab(setup: PayrollSetup, monthlyBase: number): MatchedTax | null {
  if (!setup?.options?.enableTaxCalculation) return null;
  const slabs: TaxSlab[] = setup.taxRules ?? [];
  if (slabs.length === 0 || monthlyBase <= 0) return null;

  const slab = slabs.find(
    s => monthlyBase >= s.incomeFrom && monthlyBase <= s.incomeTo
  );
  if (!slab) return null;

  const pct = slab.percentage || 0;
  const amount = Math.round(monthlyBase * pct) / 100;
  return { slabId: slab.id, slabName: slab.name, percentage: pct, amount };
}

/** Back-compat wrapper: returns the matched slab's monthly tax, or 0. */
export function calcMonthlyTax(setup: PayrollSetup, monthlyBase: number): number {
  return matchTaxSlab(setup, monthlyBase)?.amount ?? 0;
}
