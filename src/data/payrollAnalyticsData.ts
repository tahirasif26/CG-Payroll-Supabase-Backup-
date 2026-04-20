// Stub: real payroll analytics will be migrated to Supabase via React Query hooks.
// Retained only to satisfy legacy imports in PayrollAnalyticsPage. All exports
// return empty data so the page renders empty-state branches instead of crashing.
// TODO: Migrate PayrollAnalyticsPage to a hooks-based implementation and delete this file.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PayrollEmployeeDetail = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CompletedRun = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ComparisonResult = any;

export function getCompletedRuns(): CompletedRun[] {
  return [];
}

export function computeComparison(_currentId?: string, _previousId?: string): ComparisonResult {
  return {
    baseRun: null,
    compareRun: null,
    bridge: [],
    departmentBreakdown: [],
    compareGross: 0,
    grossChange: 0,
    compareNet: 0,
    netChange: 0,
    compareDeductions: 0,
    deductionsChange: 0,
    compareHeadcount: 0,
    headcountChange: 0,
    newHires: [],
    separations: [],
    salaryChanges: [],
  };
}
