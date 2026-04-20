// Stub: real payroll analytics now read from Supabase via React Query hooks.
// This file is retained only to satisfy legacy imports in PayrollAnalyticsPage
// until that page is migrated. All exports return empty data so the page
// renders its empty-state branches instead of crashing.

export interface PayrollEmployeeDetail {
  employeeId: string;
  name: string;
  department?: string;
  designation?: string;
  gross: number;
  net: number;
  deductions: number;
  status?: string;
}

export interface CompletedRun {
  id: string;
  label: string;
  month: string;
  year: number;
  totalGross: number;
  totalNet: number;
  totalDeductions: number;
  employeeCount: number;
  details: PayrollEmployeeDetail[];
}

export interface ComparisonResult {
  current: CompletedRun | null;
  previous: CompletedRun | null;
  deltas: {
    gross: number;
    net: number;
    deductions: number;
    headcount: number;
    grossPct: number;
    netPct: number;
  };
  joiners: PayrollEmployeeDetail[];
  leavers: PayrollEmployeeDetail[];
  changed: Array<{ employee: PayrollEmployeeDetail; previousNet: number; deltaNet: number }>;
}

export function getCompletedRuns(): CompletedRun[] {
  return [];
}

export function computeComparison(_currentId?: string, _previousId?: string): ComparisonResult {
  return {
    current: null,
    previous: null,
    deltas: { gross: 0, net: 0, deductions: 0, headcount: 0, grossPct: 0, netPct: 0 },
    joiners: [],
    leavers: [],
    changed: [],
  };
}
