import { Employee, PayrollRun, LeaveRequest, Loan, ExpenseReimbursement, Deduction, TaxConfig, CostAllocation, Asset, Project, Timesheet, SalaryComponent } from "@/types/hcm";

function makeCompensation(base: number): SalaryComponent[] {
  return [
    { name: "Basic Salary", type: "base", amount: Math.round(base * 0.6) },
    { name: "Housing Allowance", type: "housing", amount: Math.round(base * 0.25) },
    { name: "Travel Allowance", type: "travel", amount: Math.round(base * 0.05) },
    { name: "Medical Allowance", type: "medical", amount: Math.round(base * 0.05) },
    { name: "Other Allowances", type: "other", amount: Math.round(base * 0.05) },
  ];
}

export const employees: Employee[] = [
  { id: "1", empId: "CG-001", firstName: "Aisha", lastName: "Rahman", email: "aisha.rahman@cg.com", phone: "+966 50 123 4567", department: "Assurance", designation: "Senior Associate", joiningDate: "2021-03-15", salary: 18000, status: "active", avatar: "", dateOfBirth: "1994-07-12", category: "direct", workLocationCountry: "Saudi Arabia", compensation: makeCompensation(18000) },
  { id: "2", empId: "CG-002", firstName: "Omar", lastName: "Al-Faisal", email: "omar.alfaisal@cg.com", phone: "+966 55 234 5678", department: "Tax", designation: "Manager", joiningDate: "2019-06-01", salary: 28000, status: "active", avatar: "", dateOfBirth: "1990-02-28", category: "direct", workLocationCountry: "Saudi Arabia", compensation: makeCompensation(28000) },
  { id: "3", empId: "CG-003", firstName: "Fatima", lastName: "Hassan", email: "fatima.hassan@cg.com", phone: "+966 54 345 6789", department: "Advisory", designation: "Associate", joiningDate: "2023-01-10", salary: 12000, status: "active", avatar: "", dateOfBirth: "1997-05-03", category: "contractor", workLocationCountry: "UAE", compensation: makeCompensation(12000) },
  { id: "4", empId: "CG-004", firstName: "Khalid", lastName: "Nasser", email: "khalid.nasser@cg.com", phone: "+966 56 456 7890", department: "Strategy", designation: "Senior Manager", joiningDate: "2017-09-20", salary: 35000, status: "active", avatar: "", dateOfBirth: "1988-11-15", category: "direct", workLocationCountry: "Saudi Arabia", compensation: makeCompensation(35000) },
  { id: "5", empId: "CG-005", firstName: "Sara", lastName: "Al-Mutairi", email: "sara.almutairi@cg.com", phone: "+966 50 567 8901", department: "Assurance", designation: "Staff", joiningDate: "2024-02-01", salary: 9000, status: "active", avatar: "", dateOfBirth: "1999-02-07", category: "direct", workLocationCountry: "Saudi Arabia", compensation: makeCompensation(9000) },
  { id: "6", empId: "CG-006", firstName: "Yousef", lastName: "Bakr", email: "yousef.bakr@cg.com", phone: "+966 55 678 9012", department: "Tax", designation: "Associate", joiningDate: "2022-08-15", salary: 13000, status: "on-leave", avatar: "", dateOfBirth: "1996-08-22", category: "contractor", workLocationCountry: "Qatar", compensation: makeCompensation(13000) },
  { id: "7", empId: "CG-007", firstName: "Layla", lastName: "Qasim", email: "layla.qasim@cg.com", phone: "+966 54 789 0123", department: "Advisory", designation: "Partner", joiningDate: "2012-04-01", salary: 55000, status: "active", avatar: "", dateOfBirth: "1980-12-01", category: "direct", workLocationCountry: "Saudi Arabia", compensation: makeCompensation(55000) },
  { id: "8", empId: "CG-008", firstName: "Tariq", lastName: "Zaman", email: "tariq.zaman@cg.com", phone: "+966 56 890 1234", department: "Technology", designation: "Manager", joiningDate: "2020-11-10", salary: 26000, status: "active", avatar: "", dateOfBirth: "1991-02-05", category: "direct", workLocationCountry: "Bahrain", compensation: makeCompensation(26000) },
];

export const payrollRuns: PayrollRun[] = [
  { id: "1", month: "January", year: 2025, status: "completed", totalGross: 196000, totalDeductions: 29400, totalNet: 166600, runDate: "2025-01-28", employeeCount: 8 },
  { id: "2", month: "February", year: 2025, status: "completed", totalGross: 196000, totalDeductions: 29400, totalNet: 166600, runDate: "2025-02-27", employeeCount: 8 },
  { id: "3", month: "March", year: 2025, status: "processing", totalGross: 196000, totalDeductions: 29400, totalNet: 166600, runDate: "", employeeCount: 8 },
];

export const leaveRequests: LeaveRequest[] = [
  { id: "1", employeeId: "1", employeeName: "Aisha Rahman", type: "annual", startDate: "2025-03-10", endDate: "2025-03-14", days: 5, status: "approved", reason: "Family vacation" },
  { id: "2", employeeId: "3", employeeName: "Fatima Hassan", type: "sick", startDate: "2025-02-20", endDate: "2025-02-21", days: 2, status: "approved", reason: "Medical appointment" },
  { id: "3", employeeId: "6", employeeName: "Yousef Bakr", type: "annual", startDate: "2025-02-01", endDate: "2025-02-15", days: 15, status: "approved", reason: "Extended leave" },
  { id: "4", employeeId: "4", employeeName: "Khalid Nasser", type: "annual", startDate: "2025-04-01", endDate: "2025-04-05", days: 5, status: "pending", reason: "Personal travel" },
  { id: "5", employeeId: "8", employeeName: "Tariq Zaman", type: "compassionate", startDate: "2025-03-01", endDate: "2025-03-03", days: 3, status: "pending", reason: "Family emergency" },
];

export const loans: Loan[] = [
  { id: "1", employeeId: "2", employeeName: "Omar Al-Faisal", amount: 50000, remainingBalance: 35000, monthlyDeduction: 2500, startDate: "2024-06-01", endDate: "2026-02-01", status: "active", transactions: [
    { id: "t1-1", payrollRunId: "0", payrollLabel: "June 2024", type: "disbursement", amount: 50000, balanceAfter: 50000, emiAtTime: 2500, date: "2024-06-01", note: "Loan disbursed" },
    { id: "t1-2", payrollRunId: "0", payrollLabel: "July 2024", type: "deduction", amount: 2500, balanceAfter: 47500, emiAtTime: 2500, date: "2024-07-28" },
    { id: "t1-3", payrollRunId: "0", payrollLabel: "August 2024", type: "deduction", amount: 2500, balanceAfter: 45000, emiAtTime: 2500, date: "2024-08-28" },
    { id: "t1-4", payrollRunId: "0", payrollLabel: "September 2024", type: "deduction", amount: 2500, balanceAfter: 42500, emiAtTime: 2500, date: "2024-09-28" },
    { id: "t1-5", payrollRunId: "0", payrollLabel: "October 2024", type: "deduction", amount: 2500, balanceAfter: 40000, emiAtTime: 2500, date: "2024-10-28" },
    { id: "t1-6", payrollRunId: "0", payrollLabel: "November 2024", type: "deduction", amount: 2500, balanceAfter: 37500, emiAtTime: 2500, date: "2024-11-28" },
    { id: "t1-7", payrollRunId: "1", payrollLabel: "January 2025", type: "deduction", amount: 2500, balanceAfter: 35000, emiAtTime: 2500, date: "2025-01-28" },
  ]},
  { id: "2", employeeId: "4", employeeName: "Khalid Nasser", amount: 80000, remainingBalance: 60000, monthlyDeduction: 4000, startDate: "2024-09-01", endDate: "2026-05-01", status: "active", transactions: [
    { id: "t2-1", payrollRunId: "0", payrollLabel: "September 2024", type: "disbursement", amount: 80000, balanceAfter: 80000, emiAtTime: 4000, date: "2024-09-01", note: "Loan disbursed" },
    { id: "t2-2", payrollRunId: "0", payrollLabel: "October 2024", type: "deduction", amount: 4000, balanceAfter: 76000, emiAtTime: 4000, date: "2024-10-28" },
    { id: "t2-3", payrollRunId: "0", payrollLabel: "November 2024", type: "deduction", amount: 4000, balanceAfter: 72000, emiAtTime: 4000, date: "2024-11-28" },
    { id: "t2-4", payrollRunId: "0", payrollLabel: "December 2024", type: "deduction", amount: 4000, balanceAfter: 68000, emiAtTime: 4000, date: "2024-12-28" },
    { id: "t2-5", payrollRunId: "1", payrollLabel: "January 2025", type: "deduction", amount: 4000, balanceAfter: 64000, emiAtTime: 4000, date: "2025-01-28" },
    { id: "t2-6", payrollRunId: "2", payrollLabel: "February 2025", type: "deduction", amount: 4000, balanceAfter: 60000, emiAtTime: 4000, date: "2025-02-27" },
  ]},
  { id: "3", employeeId: "1", employeeName: "Aisha Rahman", amount: 20000, remainingBalance: 0, monthlyDeduction: 2000, startDate: "2023-01-01", endDate: "2023-11-01", status: "completed", transactions: [
    { id: "t3-1", payrollRunId: "0", payrollLabel: "January 2023", type: "disbursement", amount: 20000, balanceAfter: 20000, emiAtTime: 2000, date: "2023-01-01", note: "Loan disbursed" },
    { id: "t3-2", payrollRunId: "0", payrollLabel: "February 2023", type: "deduction", amount: 2000, balanceAfter: 18000, emiAtTime: 2000, date: "2023-02-28" },
    { id: "t3-3", payrollRunId: "0", payrollLabel: "March 2023", type: "deduction", amount: 2000, balanceAfter: 16000, emiAtTime: 2000, date: "2023-03-28" },
    { id: "t3-4", payrollRunId: "0", payrollLabel: "April 2023", type: "deduction", amount: 2000, balanceAfter: 14000, emiAtTime: 2000, date: "2023-04-28" },
    { id: "t3-5", payrollRunId: "0", payrollLabel: "May 2023", type: "deduction", amount: 2000, balanceAfter: 12000, emiAtTime: 2000, date: "2023-05-28" },
    { id: "t3-6", payrollRunId: "0", payrollLabel: "June 2023", type: "deduction", amount: 2000, balanceAfter: 10000, emiAtTime: 2000, date: "2023-06-28" },
    { id: "t3-7", payrollRunId: "0", payrollLabel: "July 2023", type: "deduction", amount: 2000, balanceAfter: 8000, emiAtTime: 2000, date: "2023-07-28" },
    { id: "t3-8", payrollRunId: "0", payrollLabel: "August 2023", type: "deduction", amount: 2000, balanceAfter: 6000, emiAtTime: 2000, date: "2023-08-28" },
    { id: "t3-9", payrollRunId: "0", payrollLabel: "September 2023", type: "deduction", amount: 2000, balanceAfter: 4000, emiAtTime: 2000, date: "2023-09-28" },
    { id: "t3-10", payrollRunId: "0", payrollLabel: "October 2023", type: "deduction", amount: 2000, balanceAfter: 2000, emiAtTime: 2000, date: "2023-10-28" },
    { id: "t3-11", payrollRunId: "0", payrollLabel: "November 2023", type: "deduction", amount: 2000, balanceAfter: 0, emiAtTime: 2000, date: "2023-11-28", note: "Loan fully repaid" },
  ]},
];

export const expenses: ExpenseReimbursement[] = [
  { id: "1", employeeId: "2", employeeName: "Omar Al-Faisal", category: "Travel", amount: 3500, expenseDate: "2025-02-08", submissionDate: "2025-02-10", status: "approved", description: "Client site visit - Riyadh. Includes flight, hotel, and meals for 2-day engagement.", attachments: ["flight_receipt.pdf", "hotel_invoice.pdf"] },
  { id: "2", employeeId: "7", employeeName: "Layla Qasim", category: "Client Entertainment", amount: 1200, expenseDate: "2025-02-14", submissionDate: "2025-02-15", status: "pending", description: "Client dinner meeting at Four Seasons with ABC Corp team.", attachments: ["dinner_receipt.jpg"] },
  { id: "3", employeeId: "4", employeeName: "Khalid Nasser", category: "Training", amount: 5000, expenseDate: "2025-01-25", submissionDate: "2025-01-28", status: "approved", description: "Leadership conference registration and travel. 3-day event in Dubai.", attachments: ["conference_reg.pdf", "travel_receipt.pdf", "hotel_receipt.pdf"] },
  { id: "4", employeeId: "8", employeeName: "Tariq Zaman", category: "Equipment", amount: 800, expenseDate: "2025-02-17", submissionDate: "2025-02-18", status: "pending", description: "External 27-inch 4K monitor for home office setup.", attachments: ["monitor_invoice.pdf"] },
];

export const deductions: Deduction[] = [
  { id: "1", name: "GOSI (Employee)", type: "statutory", percentage: 9.75, isActive: true },
  { id: "2", name: "GOSI (Employer)", type: "statutory", percentage: 11.75, isActive: true },
  { id: "3", name: "Medical Insurance", type: "benefit", fixedAmount: 500, isActive: true },
  { id: "4", name: "Housing Allowance Deduction", type: "other", percentage: 5, isActive: false },
];

export const taxConfigs: TaxConfig[] = [
  { id: "1", name: "Zakat", rate: 2.5, applicableTo: "All Employees", isActive: true },
  { id: "2", name: "VAT on Benefits", rate: 15, applicableTo: "Non-Saudi Employees", isActive: true },
];

export const costAllocations: CostAllocation[] = [
  { id: "1", employeeId: "2", employeeName: "Omar Al-Faisal", projectCode: "PRJ-2025-001", projectName: "Saudi Aramco Audit", allocation: 60, month: "February 2025" },
  { id: "2", employeeId: "2", employeeName: "Omar Al-Faisal", projectCode: "PRJ-2025-003", projectName: "SABIC Tax Review", allocation: 40, month: "February 2025" },
  { id: "3", employeeId: "4", employeeName: "Khalid Nasser", projectCode: "PRJ-2025-002", projectName: "NEOM Strategy", allocation: 100, month: "February 2025" },
  { id: "4", employeeId: "7", employeeName: "Layla Qasim", projectCode: "PRJ-2025-004", projectName: "Vision 2030 Advisory", allocation: 80, month: "February 2025" },
  { id: "5", employeeId: "7", employeeName: "Layla Qasim", projectCode: "PRJ-2025-001", projectName: "Saudi Aramco Audit", allocation: 20, month: "February 2025" },
];

export const assets: Asset[] = [
  { id: "1", name: "MacBook Pro 16\"", category: "Laptop", serialNumber: "MBP-2024-001", employeeId: "1", employeeName: "Aisha Rahman", assignedDate: "2021-03-15", status: "assigned" },
  { id: "2", name: "Dell Ultrasharp 27\"", category: "Monitor", serialNumber: "DU27-2024-002", employeeId: "1", employeeName: "Aisha Rahman", assignedDate: "2021-03-15", status: "assigned" },
  { id: "3", name: "ThinkPad X1 Carbon", category: "Laptop", serialNumber: "TPX1-2024-003", employeeId: "2", employeeName: "Omar Al-Faisal", assignedDate: "2019-06-01", status: "assigned" },
  { id: "4", name: "iPhone 15 Pro", category: "Phone", serialNumber: "IP15-2024-004", employeeId: "4", employeeName: "Khalid Nasser", assignedDate: "2024-01-15", status: "assigned" },
  { id: "5", name: "Surface Pro 9", category: "Laptop", serialNumber: "SP9-2024-005", employeeId: null, employeeName: null, assignedDate: null, status: "available" },
  { id: "6", name: "Dell XPS 15", category: "Laptop", serialNumber: "DXP-2024-006", employeeId: null, employeeName: null, assignedDate: null, status: "maintenance" },
];

export const projects: Project[] = [
  { id: "1", code: "PRJ-2025-001", name: "Saudi Aramco Audit", client: "Saudi Aramco", budget: 500000, startDate: "2025-01-01", endDate: "2025-06-30", status: "active", completion: 35, teamMembers: ["2", "7"] },
  { id: "2", code: "PRJ-2025-002", name: "NEOM Strategy", client: "NEOM", budget: 800000, startDate: "2025-02-01", endDate: "2025-12-31", status: "active", completion: 15, teamMembers: ["4"] },
  { id: "3", code: "PRJ-2025-003", name: "SABIC Tax Review", client: "SABIC", budget: 250000, startDate: "2025-01-15", endDate: "2025-04-30", status: "active", completion: 60, teamMembers: ["2"] },
  { id: "4", code: "PRJ-2025-004", name: "Vision 2030 Advisory", client: "PIF", budget: 1200000, startDate: "2024-06-01", endDate: "2025-12-31", status: "active", completion: 45, teamMembers: ["7", "4"] },
  { id: "5", code: "PRJ-2024-010", name: "STC Digital Transformation", client: "STC", budget: 350000, startDate: "2024-03-01", endDate: "2024-12-31", status: "completed", completion: 100, teamMembers: ["8", "3"] },
];

export const timesheets: Timesheet[] = [
  { id: "1", employeeId: "1", projectId: "1", weekStarting: "2025-02-03", hours: 20, status: "approved" },
  { id: "2", employeeId: "1", projectId: "3", weekStarting: "2025-02-03", hours: 20, status: "approved" },
  { id: "3", employeeId: "2", projectId: "1", weekStarting: "2025-02-03", hours: 25, status: "approved" },
  { id: "4", employeeId: "2", projectId: "3", weekStarting: "2025-02-03", hours: 15, status: "submitted" },
  { id: "5", employeeId: "4", projectId: "2", weekStarting: "2025-02-03", hours: 40, status: "approved" },
  { id: "6", employeeId: "7", projectId: "4", weekStarting: "2025-02-03", hours: 32, status: "submitted" },
  { id: "7", employeeId: "7", projectId: "1", weekStarting: "2025-02-03", hours: 8, status: "draft" },
  { id: "8", employeeId: "8", projectId: "5", weekStarting: "2025-02-03", hours: 40, status: "approved" },
  { id: "9", employeeId: "1", projectId: "1", weekStarting: "2025-02-10", hours: 30, status: "submitted" },
  { id: "10", employeeId: "1", projectId: "3", weekStarting: "2025-02-10", hours: 10, status: "draft" },
];

export function getUpcomingBirthdays(emps: Employee[]) {
  const today = new Date();

  return emps
    .map((emp) => {
      const dob = new Date(emp.dateOfBirth);
      const birthMonth = dob.getMonth();
      const birthDay = dob.getDate();

      const thisYearBirthday = new Date(today.getFullYear(), birthMonth, birthDay);
      let daysUntil = 0;
      if (thisYearBirthday >= today) {
        daysUntil = Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      } else {
        const nextYearBirthday = new Date(today.getFullYear() + 1, birthMonth, birthDay);
        daysUntil = Math.ceil((nextYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }

      return { ...emp, daysUntil, birthMonth, birthDay };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil);
}
