import type { PaginationQuery } from "../types";

export type PayFrequency = "monthly" | "biweekly" | "weekly";
export type PayrollSetupStatus = "draft" | "active" | "archived";
export type PayrollComponentType = "earning" | "deduction";
export type PayrollCalcType = "fixed" | "percentage" | "formula";
export type PayrollRunStatus =
  | "draft"
  | "calculated"
  | "pending_approval"
  | "approved"
  | "completed"
  | "cancelled";

export interface PayrollSetupComponent {
  id: string;
  name: string;
  type: PayrollComponentType;
  calculationType: PayrollCalcType;
  value: string;
  formula: string | null;
  orderIndex: number;
  isActive: boolean;
}

export interface PayrollSetupTaxRule {
  id: string;
  slabName: string;
  incomeFromMinor: string;
  incomeToMinor: string | null;
  rateBps: number;
  orderIndex: number;
}

export interface PayrollSetup {
  id: string;
  clientId: string;
  name: string;
  description: string | null;
  country: string;
  currency: string;
  payFrequency: PayFrequency;
  yearEndDate: string | null;
  status: PayrollSetupStatus;
  options: Record<string, unknown>;
  components: PayrollSetupComponent[];
  taxRules: PayrollSetupTaxRule[];
  createdAt: string;
  updatedAt: string;
}

export interface PayrollRun {
  id: string;
  clientId: string;
  payrollSetupId: string;
  month: number;
  year: number;
  status: PayrollRunStatus;
  totalGrossMinor: string;
  totalDeductionsMinor: string;
  totalNetMinor: string;
  employeeCount: number;
  runDate: string | null;
  approvedAt: string | null;
  completedAt: string | null;
  locked: boolean;
  lockedAt: string | null;
  setup?: { id: string; name: string; currency: string };
  lines?: PayrollLine[];
  oneOffAdjustments?: PayrollOneOff[];
  createdAt: string;
  updatedAt: string;
}

export interface PayrollLine {
  id: string;
  payrollRunId: string;
  employeeId: string;
  basicMinor: string;
  allowancesMinor: string;
  grossMinor: string;
  taxDeductionMinor: string;
  loanDeductionMinor: string;
  statutoryDeductionMinor: string;
  otherDeductionsMinor: string;
  totalDeductionsMinor: string;
  oneOffBenefitsMinor: string;
  oneOffDeductionsMinor: string;
  netPayMinor: string;
  payCurrency: string;
  snapshotData: Record<string, unknown>;
  employee?: { id: string; empId: string; firstName: string; lastName: string };
}

export interface PayrollOneOff {
  id: string;
  payrollRunId: string;
  employeeId: string;
  name: string;
  amountMinor: string;
  type: PayrollComponentType;
}

export interface Payslip {
  id: string;
  payrollRunId: string;
  payrollLineId: string;
  employeeId: string;
  pdfUrl: string | null;
  issuedAt: string | null;
  viewedByEmployeeAt: string | null;
  emailedAt: string | null;
  run?: { month: number; year: number; setup?: { name: string; currency: string } };
}

// ─── Request shapes ──────────────────────────────────────────────────────────

export interface ComponentInput {
  id?: string;
  name: string;
  type: PayrollComponentType;
  calculationType: PayrollCalcType;
  value?: string | number;
  formula?: string | null;
  orderIndex?: number;
  isActive?: boolean;
}

export interface TaxRuleInput {
  id?: string;
  slabName: string;
  incomeFromMinor: string | number;
  incomeToMinor?: string | number | null;
  rateBps: number;
  orderIndex?: number;
}

export interface CreatePayrollSetupRequest {
  name: string;
  description?: string | null;
  country: string;
  currency: string;
  payFrequency?: PayFrequency;
  yearEndDate?: string | null;
  options?: Record<string, unknown>;
  components?: ComponentInput[];
  taxRules?: TaxRuleInput[];
}
export type UpdatePayrollSetupRequest = Partial<CreatePayrollSetupRequest>;

export interface CreatePayrollRunRequest {
  payrollSetupId: string;
  month: number;
  year: number;
}

export interface ListPayrollRunsQuery extends PaginationQuery {
  setupId?: string;
  year?: number;
  status?: PayrollRunStatus;
}

export interface OneOffAdjustmentRequest {
  employeeId: string;
  name: string;
  amountMinor: string | number;
  type: PayrollComponentType;
}
