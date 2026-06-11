import type { PaginationQuery } from "../types";

export type EmployeeStatus = "active" | "on_leave" | "separated" | "pending";

export interface Employee {
  id: string;
  clientId: string;
  userId: string | null;
  empId: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  email: string;
  personalEmail: string | null;
  phone: string | null;
  personalPhone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  maritalStatus: string | null;
  nationality: string | null;
  religion: string | null;
  department: string | null;
  designation: string | null;
  division: string | null;
  category: string | null;
  joiningDate: string | null;
  probationEndDate: string | null;
  separationDate: string | null;
  workLocationCountry: string | null;
  workLocationCity: string | null;
  payCurrency: string | null;
  reportsToId: string | null;
  /** PayrollSetup driving this employee's compensation calculations. */
  payrollSetupId: string | null;
  avatarUrl: string | null;
  status: EmployeeStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Trimmed Employee returned by directory listings. Matches the backend
 * `directorySelect` projection — keep this in sync if you add/remove columns
 * there.
 */
export interface EmployeeDirectoryItem {
  id: string;
  clientId: string;
  empId: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  email: string;
  phone: string | null;
  department: string | null;
  designation: string | null;
  division: string | null;
  category: string | null;
  joiningDate: string | null;
  workLocationCity: string | null;
  workLocationCountry: string | null;
  avatarUrl: string | null;
  status: EmployeeStatus;
  reportsToId: string | null;
  payrollSetupId: string | null;
  payCurrency: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeWithRelations extends Employee {
  reportsTo: EmployeeDirectoryItem | null;
  directReports: EmployeeDirectoryItem[];
}

export interface ListEmployeesQuery extends PaginationQuery {
  status?: EmployeeStatus;
  department?: string;
  designation?: string;
  reportsTo?: string;
}

export interface CreateEmployeeRequest {
  empId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  personalEmail?: string | null;
  phone?: string | null;
  personalPhone?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  maritalStatus?: string | null;
  nationality?: string | null;
  religion?: string | null;
  department?: string | null;
  designation?: string | null;
  division?: string | null;
  category?: string | null;
  joiningDate?: string | null;
  probationEndDate?: string | null;
  workLocationCountry?: string | null;
  workLocationCity?: string | null;
  payCurrency?: string | null;
  reportsToId?: string | null;
  payrollSetupId?: string | null;
  avatarUrl?: string | null;
  status?: EmployeeStatus;
}

export type UpdateEmployeeRequest = Partial<Omit<CreateEmployeeRequest, "empId">>;

export interface ArchiveEmployeeRequest {
  separationDate?: string | null;
}

// ─── Sub-records (Phase 3b) ──────────────────────────────────────────────────

export interface EmployeeAddress {
  id: string;
  employeeId: string;
  clientId: string;
  type: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeBankDetails {
  id: string;
  employeeId: string;
  clientId: string;
  bankName: string | null;
  bankCountry: string | null;
  swiftCode: string | null;
  iban: string | null;
  bankCurrency: string | null;
  beneficiaryName: string | null;
  bankAddress: string | null;
  accountNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeEmergencyContact {
  id: string;
  employeeId: string;
  clientId: string;
  name: string | null;
  relation: string | null;
  phone: string | null;
  email: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeEducation {
  id: string;
  employeeId: string;
  clientId: string;
  institution: string | null;
  degree: string | null;
  fieldOfStudy: string | null;
  startYear: number | null;
  endYear: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  clientId: string;
  docType: string | null;
  docNumber: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  fileUrl: string | null;
  status: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeCompensation {
  id: string;
  employeeId: string;
  clientId: string;
  componentName: string;
  componentType: string;
  /**
   * Bigint minor units (halalas / fils / cents) come back as a string from JSON
   * because JS numbers can't represent the full BigInt range safely. Convert
   * with `BigInt(amount)` before arithmetic.
   */
  amount: string;
  currency: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeProfile extends Employee {
  reportsTo: EmployeeDirectoryItem | null;
  addresses: EmployeeAddress[];
  bankDetails: EmployeeBankDetails[];
  emergencyContacts: EmployeeEmergencyContact[];
  education: EmployeeEducation[];
  documents: EmployeeDocument[];
  compensation: EmployeeCompensation[];
}

// ─── Update profile data request shapes ──────────────────────────────────────

export interface AddressInput {
  type?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
}

export interface BankDetailsInput {
  bankName?: string | null;
  bankCountry?: string | null;
  swiftCode?: string | null;
  iban?: string | null;
  bankCurrency?: string | null;
  beneficiaryName?: string | null;
  bankAddress?: string | null;
  accountNumber?: string | null;
}

export interface EmergencyContactInput {
  name?: string | null;
  relation?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface EducationRowInput {
  institution?: string | null;
  degree?: string | null;
  fieldOfStudy?: string | null;
  startYear?: number | null;
  endYear?: number | null;
}

export interface DocumentRowInput {
  docType?: string | null;
  docNumber?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  fileUrl?: string | null;
  status?: string | null;
}

export interface CompensationRowInput {
  componentName: string;
  componentType: string;
  /** String or number — backend coerces to BigInt. Use string for values > 2^53-1. */
  amount: string | number;
  currency?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
}

export interface UpdateEmployeeProfileRequest {
  address?: AddressInput;
  bankDetails?: BankDetailsInput;
  emergencyContact?: EmergencyContactInput;
  education?: EducationRowInput[];
  documents?: DocumentRowInput[];
  compensation?: CompensationRowInput[];
}
