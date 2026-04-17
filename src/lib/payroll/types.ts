/**
 * Pure types for the payroll calculation engine.
 * No React/Supabase dependencies — these mirror the DB schema but are
 * intentionally decoupled so the engine can be tested in isolation.
 */

export interface PayrollEmployee {
  id: string;
  emp_id: string;
  first_name: string | null;
  last_name: string | null;
  /** Monthly gross salary in MAJOR units (e.g. 18000 SAR, not halalas). */
  salary: number;
  pay_currency: string;
  joining_date?: string | null;
  separation_date?: string | null;
}

export interface PayrollSetupSnapshot {
  id: string;
  name: string;
  currency: string;
  options: {
    enable_tax_calculation?: boolean;
    enable_gosi?: boolean;
    enable_eosb?: boolean;
    [key: string]: unknown;
  };
}

export interface PayrollComponent {
  id: string;
  name: string;
  type: "earning" | "deduction";
  calculation_type: "fixed" | "percentage" | "formula";
  /** For fixed: amount in MAJOR units. For percentage: 11.5 means 11.5%. */
  value: number;
  formula?: string | null;
  status: "active" | "inactive";
  order_index: number;
}

export interface PayrollTaxRule {
  id: string;
  slab_name: string;
  /** Annual income lower bound in MINOR units. */
  income_from: bigint;
  /** Annual income upper bound in MINOR units. Use a very large bigint for the top slab. */
  income_to: bigint;
  /** e.g. 15 means 15%. */
  percentage: number;
  order_index: number;
}

export interface ActiveLoan {
  id: string;
  /** Per-period deduction in MINOR units. */
  monthly_deduction: bigint;
}

export interface OneOffAdjustment {
  id: string;
  name: string;
  /** Amount in MINOR units. */
  amount: bigint;
  type: "benefit" | "deduction";
}

export interface SeparationContext {
  /** Final settlement payout in MINOR units. */
  settlement: bigint;
}

export interface CalculationContext {
  employee: PayrollEmployee;
  setup: PayrollSetupSnapshot;
  components: PayrollComponent[];
  taxRules: PayrollTaxRule[];
  loans: ActiveLoan[];
  /** Sum of approved expense reimbursements for the period (MINOR units). */
  approvedExpenses: bigint;
  /** Sum of approved cash advances disbursed in the period (MINOR units). */
  approvedAdvances: bigint;
  oneOffAdjustments: OneOffAdjustment[];
  separation?: SeparationContext;
}

export interface PayrollLineResult {
  basic: bigint;
  allowances: bigint;
  gross: bigint;
  loanDeduction: bigint;
  taxDeduction: bigint;
  statutoryDeduction: bigint;
  otherDeductions: bigint;
  totalDeductions: bigint;
  expenseReimbursement: bigint;
  advanceGiven: bigint;
  oneOffBenefits: bigint;
  oneOffDeductions: bigint;
  separationSettlement: bigint;
  netPay: bigint;
  payCurrency: string;
  /** Full audit snapshot of inputs used at calculation time. */
  snapshot: Record<string, unknown>;
}
