export interface PaySchedule {
  payFrequency: "monthly" | "weekly" | "bi-weekly";
  cycleStartDate: string;
  cycleEndDate: string;
  payDate: string;
  cutoffDate: string;
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

export interface SalaryRules {
  salaryType: "fixed" | "variable";
  prorationRule: "days-worked" | "calendar-days";
  workingDaysPerMonth: number;
}

export interface OvertimeConfig {
  enabled: boolean;
  rateMultiplier: number;
  maxOvertimeHours: number;
}

export interface AutoDeductions {
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

export interface LeaveEncashment {
  enabled: boolean;
  formula: string;
  leaveAllocations: LeaveAllocation[];
}

export interface FinalSettlement {
  includeLeaveEncashment: boolean;
  includePendingSalary: boolean;
  includeDeductions: boolean;
  noticePeriodRecoveryDays: number;
}

export interface RetirementPolicies {
  enablePF: boolean;
  employeeContributionPct: number;
  employerContributionPct: number;
  enableVPS: boolean;
  vpsContributionRules: string;
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
  salaryRules: SalaryRules;
  overtime: OvertimeConfig;
  autoDeductions: AutoDeductions;
  loanAdvance: LoanAdvanceConfig;
  leaveEncashment: LeaveEncashment;
  finalSettlement: FinalSettlement;
  retirement: RetirementPolicies;
  approvalWorkflow: ApprovalWorkflow;
}
