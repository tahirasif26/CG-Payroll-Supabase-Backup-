export interface Employee {
  id: string;
  empId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  joiningDate: string;
  salary: number;
  status: "active" | "inactive" | "on-leave";
  avatar: string;
  dateOfBirth: string;
}

export interface PayrollRun {
  id: string;
  month: string;
  year: number;
  status: "draft" | "processing" | "completed" | "failed";
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  runDate: string;
  employeeCount: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: "annual" | "sick" | "compassionate" | "unpaid" | "maternity";
  startDate: string;
  endDate: string;
  days: number;
  status: "pending" | "approved" | "rejected";
  reason: string;
}

export interface Loan {
  id: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  remainingBalance: number;
  monthlyDeduction: number;
  startDate: string;
  endDate: string;
  status: "active" | "completed" | "defaulted";
}

export interface ExpenseReimbursement {
  id: string;
  employeeId: string;
  employeeName: string;
  category: string;
  amount: number;
  submissionDate: string;
  status: "pending" | "approved" | "rejected";
  description: string;
}

export interface Deduction {
  id: string;
  name: string;
  type: "statutory" | "benefit" | "other";
  percentage?: number;
  fixedAmount?: number;
  isActive: boolean;
}

export interface TaxConfig {
  id: string;
  name: string;
  rate: number;
  applicableTo: string;
  isActive: boolean;
}

export interface CostAllocation {
  id: string;
  employeeId: string;
  employeeName: string;
  projectCode: string;
  projectName: string;
  allocation: number;
  month: string;
}
