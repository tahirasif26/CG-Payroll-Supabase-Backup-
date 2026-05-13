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

