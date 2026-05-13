import type { PayrollSetup, TaxSlab } from "@/types/payrollSetup";

/**
 * Calculate monthly income tax from configured slabs.
 *
 * Slab brackets are always treated as MONTHLY amounts. The employee's
 * monthly base (basic or gross, depending on taxBasis) is matched directly
 * against incomeFrom / incomeTo. Returns the monthly tax rounded to 2 dp.
 */
export function calcMonthlyTax(setup: PayrollSetup, monthlyBase: number): number {
  if (!setup.options?.enableTaxCalculation) return 0;
  const slabs: TaxSlab[] = setup.taxRules ?? [];
  if (slabs.length === 0 || monthlyBase <= 0) return 0;

  let tax = 0;
  for (const slab of slabs) {
    if (monthlyBase <= slab.incomeFrom) continue;
    const taxable = Math.min(monthlyBase, slab.incomeTo) - slab.incomeFrom;
    if (taxable > 0) tax += (taxable * (slab.percentage || 0)) / 100;
    if (slab.fixedAmount) tax += slab.fixedAmount;
  }

  return Math.round(tax * 100) / 100;
}

/**
 * Find the slab that the monthly base falls into (the highest applicable
 * bracket). Returns undefined if none applies.
 */
export function findApplicableSlab(
  setup: PayrollSetup,
  monthlyBase: number,
): TaxSlab | undefined {
  if (!setup.options?.enableTaxCalculation) return undefined;
  const slabs: TaxSlab[] = setup.taxRules ?? [];
  if (slabs.length === 0 || monthlyBase <= 0) return undefined;
  let match: TaxSlab | undefined;
  for (const s of slabs) {
    if (monthlyBase > s.incomeFrom && monthlyBase <= s.incomeTo) {
      match = s;
    }
  }
  // If above all slab ceilings, take the slab with the highest incomeTo that
  // monthlyBase still exceeds incomeFrom for.
  if (!match) {
    const above = slabs
      .filter(s => monthlyBase > s.incomeFrom)
      .sort((a, b) => b.incomeTo - a.incomeTo)[0];
    match = above;
  }
  return match;
}
