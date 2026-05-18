export interface PaySchedule {
  payFrequency: "monthly" | "weekly" | "bi-weekly";
  cycleStartDate: string;
  /** Day-of-month (1-31) or "EOM" for end-of-month auto. */
  cycleEndDate: string;
  payDate: string;
  /** @deprecated kept for backward compatibility with existing setups. */
  cutoffDate?: string;
}

export interface PayrollOptions {
  includeOvertime: boolean;
  includeUnpaidLeave: boolean;
  enableTaxCalculation: boolean;
  allowNegativeSalary: boolean;
}

export interface PayslipComponent {
  id: string;
  name: string;
  type: "earning" | "deduction";
  calculationType: "fixed" | "percentage" | "formula";
  value: number;
  formula?: string;
  status: "active" | "inactive";
}

export interface TaxSlab {
  id: string;
  name: string;
  incomeFrom: number;
  incomeTo: number;
  percentage: number;
  fixedAmount?: number;
}

export interface OvertimeConfig {
  enabled: boolean;
  rateMultiplier: number;
  maxOvertimeHours: number;
}

export interface AutoDeductions {
  enabled?: boolean;
  latePenaltyEnabled: boolean;
  latePenaltyAmount: number;
  absenceDeductionEnabled: boolean;
  absenceDeductionPerDay: number;
  customRules: { id: string; name: string; amount: number; enabled: boolean }[];
}

export interface LoanAdvanceConfig {
  enableAdvanceDeduction: boolean;
  maxDeductionPercentage: number;
  autoDeductRemaining: boolean;
}

export interface LeaveAllocation {
  leaveTypeId: string;
  leaveTypeName: string;
  daysEntitled: number;
  isActive: boolean;
}

export interface FinalSettlement {
  noticePeriodRecoveryDays: number;
}

export interface RetirementPolicies {
  enablePF: boolean;
  employeeContributionPct: number;
  employerContributionPct: number;
  enableVPS: boolean;
  vpsContributionRules: string;
}

export interface LeaveSettings {
  includeUnpaidLeave: boolean;
  leaveTypes: Record<string, { enabled: boolean; days: number }>;
  allowCarryForward: boolean;
  maxCarryForwardDays: number;
}

export interface BonusSettings {
  enabled: boolean;
  componentName?: string;
  method: "fixed" | "percentage" | "percentage_total";
  value: number;
  frequency: "annual" | "semi_annual" | "quarterly" | "monthly" | "weekly";
  includeInPayslip: boolean;
  /** For weekly frequency: 0 = Sunday … 6 = Saturday */
  payoutDayOfWeek?: number;
  /** For annual frequency: 1–12 */
  payoutMonth?: number;
  /** For semi-annual: two months [1–12, 1–12] */
  payoutMonths?: number[];
  /** For quarterly: starting month (1, 2 or 3); subsequent payouts at +3, +6, +9 */
  quarterStartMonth?: number;
}

export interface GratuitySettings {
  enabled: boolean;
  method: "saudi" | "uae" | "custom";
  componentName?: string;
  slab1Days: number;
  slab2Days: number;
  slab3Days: number;
  slab4Days: number;
  maxMonths: number;
  basis: "basic" | "total";
}

export interface ProvidentFundSettings {
  enabled: boolean;
  scheme: "gosi_saudi" | "gpssa_uae" | "custom";
  componentName?: string;
  employeeRate: number;
  employerRate: number;
  basis: "basic" | "total";
  autoDeduct: boolean;
}

export interface ApprovalWorkflow {
  enabled: boolean;
  levels: string[];
}

export interface PayrollSetup {
  id: string;
  name: string;
  country: string;
  currency: string;
  status: "active" | "inactive";
  lastUpdated: string;
  paySchedule: PaySchedule;
  options: PayrollOptions;
  payslipComponents: PayslipComponent[];
  taxRules: TaxSlab[];
  /** Mandatory display name for the income-tax deduction component on payslips. */
  taxComponentName?: string;
  /** Which figure tax slabs apply to: basic salary or gross (basic + earnings). Default: gross. */
  taxBasis?: "basic" | "gross";
  /** Whether tax slab brackets (incomeFrom/incomeTo) are monthly or annual amounts. Default: annual. */
  taxBracketBasis?: "monthly" | "annual";
  overtime: OvertimeConfig;
  autoDeductions: AutoDeductions;
  loanAdvance: LoanAdvanceConfig;

  finalSettlement: FinalSettlement;
  retirement: RetirementPolicies;
  leaves: LeaveSettings;
  bonus: BonusSettings;
  gratuity: GratuitySettings;
  providentFund: ProvidentFundSettings;
  approvalWorkflow: ApprovalWorkflow;
}
