import type { PaginationQuery } from "../types";

export type SeparationStatus = "pending" | "approved" | "processed" | "cancelled";
export type SeparationType = "resignation" | "termination" | "end_of_contract" | "retirement";

export interface Separation {
  id: string;
  clientId: string;
  employeeId: string;
  lastWorkingDate: string;
  reason: string | null;
  type: SeparationType;
  noticePeriodDays: number;
  noticePeriodServed: boolean;
  unpaidSalaryMinor: string;
  eosbAmountMinor: string;
  eosbBreakdown: Record<string, unknown>;
  leaveEncashmentMinor: string;
  noticePeriodPayMinor: string;
  loanDeductionMinor: string;
  totalSettlementMinor: string;
  status: SeparationStatus;
  payrollRunId: string | null;
  processedDate: string | null;
  employee?: { id: string; firstName: string; lastName: string; empId: string };
}

export interface EosbPreview {
  amount: string;
  breakdown: {
    yearsOfService: number;
    components: Array<{ label: string; amount: string }>;
    notes: string[];
  };
}

export interface EosbPreviewRequest {
  lastBasic: string | number;
  joiningDate: string;
  lastWorkingDate: string;
  reason: SeparationType;
  country: "SA" | "AE";
}

export interface ListSeparationsQuery extends PaginationQuery {
  status?: SeparationStatus;
}

export interface CreateSeparationRequest {
  employeeId: string;
  lastWorkingDate: string;
  reason?: string | null;
  type: SeparationType;
  noticePeriodDays?: number;
  noticePeriodServed?: boolean;
  unpaidSalaryMinor?: string | number;
  leaveEncashmentMinor?: string | number;
  noticePeriodPayMinor?: string | number;
  loanDeductionMinor?: string | number;
}
