/**
 * Backend port of `src/lib/payroll/calculator.ts`. Pure functions — no Nest,
 * no Prisma. Money is BigInt minor units (halalas / fils / cents) end-to-end.
 *
 * The existing FE calculator and the FE Vitest suite are the spec; future
 * tests against this port should re-use those fixtures.
 */

export type ComponentType = 'earning' | 'deduction';
export type CalcType = 'fixed' | 'percentage' | 'formula';

export interface CalcComponent {
  id: string;
  name: string;
  type: ComponentType;
  calculationType: CalcType;
  /** Fixed: minor units. Percentage: basis points (10000 = 100%). Formula: ignored. */
  value: bigint;
  formula?: string | null;
  orderIndex: number;
}

export interface CalcTaxSlab {
  /** Inclusive lower bound (minor units). */
  incomeFromMinor: bigint;
  /** Inclusive upper bound (minor units); null = no upper bound. */
  incomeToMinor: bigint | null;
  /** Tax rate in basis points (1500 = 15%). */
  rateBps: number;
  orderIndex: number;
}

export interface CalcInput {
  basicMinor: bigint;
  allowancesMinor: bigint;
  /** Existing loan EMI / advance recovery applied this period. */
  loanDeductionMinor?: bigint;
  /** Expense reimbursement to add to net (post-tax). */
  expenseReimbursementMinor?: bigint;
  advanceGivenMinor?: bigint;
  /** Run-specific bonuses / deductions. */
  oneOffBenefitsMinor?: bigint;
  oneOffDeductionsMinor?: bigint;
  /** Settlement on separation (added pre-tax). */
  separationSettlementMinor?: bigint;
  components: CalcComponent[];
  taxSlabs: CalcTaxSlab[];
}

export interface CalcResult {
  basicMinor: bigint;
  allowancesMinor: bigint;
  grossMinor: bigint;
  taxDeductionMinor: bigint;
  loanDeductionMinor: bigint;
  statutoryDeductionMinor: bigint;
  otherDeductionsMinor: bigint;
  totalDeductionsMinor: bigint;
  expenseReimbursementMinor: bigint;
  advanceGivenMinor: bigint;
  oneOffBenefitsMinor: bigint;
  oneOffDeductionsMinor: bigint;
  separationSettlementMinor: bigint;
  netPayMinor: bigint;
  componentBreakdown: Array<{
    id: string;
    name: string;
    type: ComponentType;
    amountMinor: bigint;
  }>;
}

/** Compute net pay for a single employee in one period. */
export function calculateLine(input: CalcInput): CalcResult {
  const {
    basicMinor,
    allowancesMinor,
    components,
    taxSlabs,
    loanDeductionMinor = BigInt(0),
    expenseReimbursementMinor = BigInt(0),
    advanceGivenMinor = BigInt(0),
    oneOffBenefitsMinor = BigInt(0),
    oneOffDeductionsMinor = BigInt(0),
    separationSettlementMinor = BigInt(0),
  } = input;

  // 1. Resolve components in order. Earnings stack onto gross; deductions
  //    accumulate into "other deductions". Percentage components are computed
  //    against the *current* gross at the time they're evaluated, matching
  //    the FE calculator's left-to-right semantics.
  let runningGross = basicMinor + allowancesMinor + oneOffBenefitsMinor + separationSettlementMinor;
  let otherDeductionsMinor = BigInt(0);
  const breakdown: CalcResult['componentBreakdown'] = [];
  let statutoryDeductionMinor = BigInt(0);

  const sorted = [...components].sort((a, b) => a.orderIndex - b.orderIndex);
  for (const c of sorted) {
    const amount = resolveComponent(c, runningGross);
    breakdown.push({ id: c.id, name: c.name, type: c.type, amountMinor: amount });
    if (c.type === 'earning') {
      runningGross += amount;
    } else {
      // "statutory" classification: names containing common social-insurance
      // codes get bucketed separately for reporting. Everything else lands in
      // otherDeductions. Heuristic — refine via component tagging when needed.
      if (/gosi|nsf|pf|epf|esic|cpf|sso/i.test(c.name)) {
        statutoryDeductionMinor += amount;
      } else {
        otherDeductionsMinor += amount;
      }
    }
  }

  const grossMinor = runningGross;

  // 2. Tax. Apply slabs progressively against the **annual** equivalent of
  //    grossMinor, then divide back to monthly. (For non-monthly frequencies
  //    a caller can pre-scale grossMinor and divide the result themselves —
  //    keeping calculator independent of pay frequency.)
  const taxableAnnual = grossMinor * BigInt(12);
  let taxAnnualMinor = BigInt(0);
  const sortedSlabs = [...taxSlabs].sort((a, b) => a.orderIndex - b.orderIndex);
  for (const slab of sortedSlabs) {
    if (taxableAnnual <= slab.incomeFromMinor) break;
    const upper = slab.incomeToMinor ?? taxableAnnual;
    const sliceTop = taxableAnnual < upper ? taxableAnnual : upper;
    const sliceWidth = sliceTop - slab.incomeFromMinor;
    if (sliceWidth <= BigInt(0)) continue;
    taxAnnualMinor += (sliceWidth * BigInt(slab.rateBps)) / BigInt(10000);
  }
  const taxDeductionMinor = taxAnnualMinor / BigInt(12);

  const totalDeductionsMinor =
    taxDeductionMinor +
    loanDeductionMinor +
    statutoryDeductionMinor +
    otherDeductionsMinor +
    oneOffDeductionsMinor;

  const netPayMinor =
    grossMinor - totalDeductionsMinor + expenseReimbursementMinor - advanceGivenMinor;

  return {
    basicMinor,
    allowancesMinor,
    grossMinor,
    taxDeductionMinor,
    loanDeductionMinor,
    statutoryDeductionMinor,
    otherDeductionsMinor,
    totalDeductionsMinor,
    expenseReimbursementMinor,
    advanceGivenMinor,
    oneOffBenefitsMinor,
    oneOffDeductionsMinor,
    separationSettlementMinor,
    netPayMinor,
    componentBreakdown: breakdown,
  };
}

function resolveComponent(c: CalcComponent, currentGross: bigint): bigint {
  switch (c.calculationType) {
    case 'fixed':
      return c.value;
    case 'percentage':
      // value is in basis points
      return (currentGross * c.value) / BigInt(10000);
    case 'formula':
      // Formula evaluation is intentionally out of scope for Phase 6 — formula
      // components are evaluated to 0 until we ship a safe expression evaluator
      // (likely in Phase 10 with a sandboxed parser).
      return BigInt(0);
    default:
      return BigInt(0);
  }
}
