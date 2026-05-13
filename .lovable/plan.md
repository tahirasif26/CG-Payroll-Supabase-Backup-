## Goal

Replace progressive accumulation with **single-slab match**: find the one slab whose `incomeFrom..incomeTo` contains the employee's gross monthly salary, apply that slab's % to the full salary, and label the deduction line with that slab's name. Multiple slabs may exist in the setup, but only the matched one is applied. If nothing matches (or tax is disabled), no tax line is shown anywhere.

## Changes

### 1. `src/lib/taxSlabs.ts`

Add slab matcher; rewrite `calcMonthlyTax` to use it.

```ts
export interface MatchedTax {
  slabId: string;
  slabName: string;
  percentage: number;
  amount: number; // monthly tax, 2dp
}

export function matchTaxSlab(setup, monthlyBase): MatchedTax | null {
  if (!setup.options?.enableTaxCalculation) return null;
  const slabs = setup.taxRules ?? [];
  if (!slabs.length || monthlyBase <= 0) return null;
  const slab = slabs.find(s => monthlyBase >= s.incomeFrom && monthlyBase <= s.incomeTo);
  if (!slab) return null;
  const amount = Math.round(monthlyBase * (slab.percentage || 0)) / 100;
  return { slabId: slab.id, slabName: slab.name, percentage: slab.percentage || 0, amount };
}

// Back-compat: returns 0 when no slab matches
export function calcMonthlyTax(setup, monthlyBase): number {
  return matchTaxSlab(setup, monthlyBase)?.amount ?? 0;
}
```

(Removes the previous loop that summed across slabs and the `fixedAmount` adder — out of scope per spec.)

### 2. Display sites — use slab name, hide row when no match

Files: `src/pages/EmployeesPage.tsx`, `src/components/employees/AddEmployeeWizard.tsx`, `src/pages/PayslipsPage.tsx`, `src/pages/PayrollPage.tsx`.

In each, replace the current pattern:
```
const slabTax = taxEnabled ? calcMonthlyTax(setup, taxBaseMonthly) : 0;
// pushes tax row using setup.taxComponentName / "Income Tax"
```
with:
```
const matched = taxEnabled ? matchTaxSlab(setup, taxBaseMonthly) : null;
```

Behavior:
- `matched === null` → do **not** push any tax row, and filter out any pre-existing `formula === "tax_slabs"` row from the displayed deductions.
- `matched` exists → push/replace a single tax row with `name = matched.slabName`, `percentage = matched.percentage`, `amount = matched.amount`. Slab name overrides `setup.taxComponentName` for the label.
- Keep the existing dedup (drop other rows whose name matches the old tax label or whose `formula === "tax_slabs"`) so only one tax line ever shows.

### 3. Untouched

- `TaxRulesTab.tsx` UI (slab CRUD).
- `TaxSlab` type, storage, options toggle wiring.
- `src/lib/payroll/calculator.ts` server engine (not used by the affected screens).

## Verification

1. Slabs: "Basic Tax" 0–50000 @8%, "Mid Tax" 50001–100000 @15%.
   - Salary 30000 → row "Basic Tax" = 2400.
   - Salary 60000 → row "Mid Tax" = 9000.
   - Salary 120000 → no tax row anywhere.
2. Slab renamed "Pakistan Standard Tax" → that exact label shows on payslip + compensation.
3. `enableTaxCalculation` off → no tax row regardless of salary or slabs.
4. Only one tax line ever appears (no duplicate "Tax Deduction" / "Income Tax").
