export type EmployeeCategory = "direct" | "contractor" | string;

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
  status: "active" | "inactive" | "on-leave" | "separated";
  avatar: string;
  dateOfBirth: string;
  category: EmployeeCategory;
  workLocationCountry: string;
  payCurrency?: string;
  payrollSetupId?: string;
  userId?: string;
  roleId?: string;
  roleName?: string;
  reportsTo?: string;
  compensation?: SalaryComponent[];
}

export interface SalaryComponent {
  name: string;
  type: "base" | "housing" | "travel" | "medical" | "other";
  amount: number;
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
  employeeTypes?: string[];
  payrollSetupId?: string;
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

export interface LoanTransaction {
  id: string;
  payrollRunId: string;
  payrollLabel: string;
  type: "disbursement" | "deduction" | "emi_change" | "emi_pause" | "emi_resume";
  amount: number;
  balanceAfter: number;
  emiAtTime: number;
  date: string;
  note?: string;
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
  transactions?: LoanTransaction[];
  pausedUntil?: string;
  prePauseEmi?: number;
}

export interface ExpenseReimbursement {
  id: string;
  employeeId: string;
  employeeName: string;
  category: string;
  amount: number;
  expenseDate: string;
  submissionDate: string;
  status: "pending" | "approved" | "rejected" | "paid";
  description: string;
  attachments?: string[];
  payrollRunId?: string;
  currency?: string;
  exchangeRate?: number;
  originalAmount?: number;
  advanceId?: string;
  paidDate?: string;
  paymentMethod?: string;
}

export interface OneOffAdjustment {
  id: string;
  employeeId: string;
  type: "benefit" | "deduction";
  name: string;
  amount: number;
}

export interface Deduction {
  id: string;
  name: string;
  type: "statutory" | "benefit" | "other" | "one-off";
  percentage?: number;
  fixedAmount?: number;
  isActive: boolean;
  appliesTo?: string[];
  appliesToCountries?: string[];
}

export interface TaxConfig {
  id: string;
  name: string;
  rate: number;
  applicableTo: string[];
  isActive: boolean;
  appliesTo?: string[];
  appliesToCountries?: string[];
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

export interface Asset {
  id: string;
  assetTag: string;
  name: string;
  category: string;
  model?: string;
  brand?: string;
  serialNumber: string;
  condition: "new" | "good" | "fair" | "needs-repair" | "damaged" | "retired";
  location?: string;
  employeeId: string | null;
  employeeName: string | null;
  assignedDate: string | null;
  status: "assigned" | "available" | "retired";
  returnDate?: string | null;
  purchaseDate?: string;
  warrantyExpiry?: string;
  serviceDueDate?: string;
  reminderDays?: number;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  client: string;
  budget: number;
  startDate: string;
  endDate: string;
  status: "active" | "completed" | "on-hold";
  completion: number;
  teamMembers: string[];
}

export interface Timesheet {
  id: string;
  employeeId: string;
  projectId: string;
  weekStarting: string;
  hours: number;
  status: "draft" | "submitted" | "approved";
}

export interface MileageEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  distance: number;
  rate: number;
  amount: number;
  vehicleType: "car" | "motorcycle" | "bicycle";
  fromAddress?: string;
  toAddress?: string;
  routeCoordinates?: { lat: number; lng: number }[];
  notes?: string;
  status: "pending" | "approved" | "rejected";
  attachments?: string[];
}

export interface AssetCategory {
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive";
  createdDate: string;
}

export interface AssetStoreItem {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  brand: string;
  model: string;
  description: string;
  image: string;
  status: "active" | "inactive";
  sku?: string;
  estimatedCost?: number;
  warrantyPeriod?: string;
  specifications?: string;
  publishToStore: boolean;
  createdDate: string;
}

export interface AssetConditionItem {
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive";
  createdDate: string;
}

export interface AssetLocationItem {
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive";
  createdDate: string;
}

export interface AssetRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  storeItemId: string;
  storeItemName: string;
  category: string;
  requestDate: string;
  reason: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "approved" | "rejected";
}
