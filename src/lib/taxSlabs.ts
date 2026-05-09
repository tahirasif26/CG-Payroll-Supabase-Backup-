import type { PayrollSetup, TaxSlab } from "@/types/payrollSetup";

/**
 * Calculate monthly income tax from configured slabs.
 *
 * - `monthlyBase` is the monthly amount (basic or gross, depending on taxBasis).
 * - If `bracketBasis === "annual"` (default), brackets are matched against
 *   the annualised base (`monthlyBase * 12`) and the resulting tax is
 *   divided by 12. If `"monthly"`, brackets and tax are kept monthly.
 * - Returns a number rounded to 2 decimals so small test values still show.
 */
export function calcMonthlyTax(setup: PayrollSetup, monthlyBase: number): number {
  if (!setup.options?.enableTaxCalculation) return 0;
  const slabs: TaxSlab[] = setup.taxRules ?? [];
  if (slabs.length === 0 || monthlyBase <= 0) return 0;

  const bracketBasis = setup.taxBracketBasis ?? "annual";
  const base = bracketBasis === "annual" ? monthlyBase * 12 : monthlyBase;

  let tax = 0;
  for (const slab of slabs) {
    if (base <= slab.incomeFrom) continue;
    const taxable = Math.min(base, slab.incomeTo) - slab.incomeFrom;
    if (taxable > 0) tax += (taxable * (slab.percentage || 0)) / 100;
    if (slab.fixedAmount) tax += slab.fixedAmount;
  }

  if (bracketBasis === "annual") tax = tax / 12;
  return Math.round(tax * 100) / 100;
}
