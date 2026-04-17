// All business data has been migrated to Supabase.
// This file is retained as a no-op shim until every legacy import is rewired
// to the corresponding React Query hook. Each export below resolves to an
// empty array so legacy pages render their empty-state branches instead of
// crashing. Do NOT add new mock data here — wire pages to hooks in
// src/hooks/queries/* instead.
import type {
  Employee,
  PayrollRun,
  LeaveRequest,
  Loan,
  ExpenseReimbursement,
  Deduction,
  TaxConfig,
  CostAllocation,
  Asset,
  Project,
  Timesheet,
  MileageEntry,
} from "@/types/hcm";

export const employees: Employee[] = [];
export const payrollRuns: PayrollRun[] = [];
export const leaveRequests: LeaveRequest[] = [];
export const loans: Loan[] = [];
export const expenses: ExpenseReimbursement[] = [];
export const deductions: Deduction[] = [];
export const taxConfigs: TaxConfig[] = [];
export const costAllocations: CostAllocation[] = [];
export const assets: Asset[] = [];
export const projects: Project[] = [];
export const timesheets: Timesheet[] = [];
export const mileageEntries: MileageEntry[] = [];

export function getUpcomingBirthdays(emps: Employee[]) {
  const today = new Date();
  const thisMonth = today.getMonth();
  return emps
    .filter((e) => {
      if (!e.dateOfBirth) return false;
      const dob = new Date(e.dateOfBirth);
      return dob.getMonth() === thisMonth;
    })
    .sort((a, b) => {
      const da = new Date(a.dateOfBirth!).getDate();
      const db = new Date(b.dateOfBirth!).getDate();
      return da - db;
    });
}
