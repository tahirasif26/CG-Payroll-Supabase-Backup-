import { Employee, PayrollRun, LeaveRequest, Loan, ExpenseReimbursement, Deduction, TaxConfig, CostAllocation } from "@/types/hcm";

// Sample employees
export const employees: Employee[] = [
  { id: "1", empId: "EY-001", firstName: "Aisha", lastName: "Rahman", email: "aisha.rahman@ey.com", phone: "+966 50 123 4567", department: "Assurance", designation: "Senior Associate", joiningDate: "2021-03-15", salary: 18000, status: "active", avatar: "", dateOfBirth: "1994-07-12" },
  { id: "2", empId: "EY-002", firstName: "Omar", lastName: "Al-Faisal", email: "omar.alfaisal@ey.com", phone: "+966 55 234 5678", department: "Tax", designation: "Manager", joiningDate: "2019-06-01", salary: 28000, status: "active", avatar: "", dateOfBirth: "1990-02-28" },
  { id: "3", empId: "EY-003", firstName: "Fatima", lastName: "Hassan", email: "fatima.hassan@ey.com", phone: "+966 54 345 6789", department: "Advisory", designation: "Associate", joiningDate: "2023-01-10", salary: 12000, status: "active", avatar: "", dateOfBirth: "1997-05-03" },
  { id: "4", empId: "EY-004", firstName: "Khalid", lastName: "Nasser", email: "khalid.nasser@ey.com", phone: "+966 56 456 7890", department: "Strategy", designation: "Senior Manager", joiningDate: "2017-09-20", salary: 35000, status: "active", avatar: "", dateOfBirth: "1988-11-15" },
  { id: "5", empId: "EY-005", firstName: "Sara", lastName: "Al-Mutairi", email: "sara.almutairi@ey.com", phone: "+966 50 567 8901", department: "Assurance", designation: "Staff", joiningDate: "2024-02-01", salary: 9000, status: "active", avatar: "", dateOfBirth: "1999-02-07" },
  { id: "6", empId: "EY-006", firstName: "Yousef", lastName: "Bakr", email: "yousef.bakr@ey.com", phone: "+966 55 678 9012", department: "Tax", designation: "Associate", joiningDate: "2022-08-15", salary: 13000, status: "on-leave", avatar: "", dateOfBirth: "1996-08-22" },
  { id: "7", empId: "EY-007", firstName: "Layla", lastName: "Qasim", email: "layla.qasim@ey.com", phone: "+966 54 789 0123", department: "Advisory", designation: "Partner", joiningDate: "2012-04-01", salary: 55000, status: "active", avatar: "", dateOfBirth: "1980-12-01" },
  { id: "8", empId: "EY-008", firstName: "Tariq", lastName: "Zaman", email: "tariq.zaman@ey.com", phone: "+966 56 890 1234", department: "Technology", designation: "Manager", joiningDate: "2020-11-10", salary: 26000, status: "active", avatar: "", dateOfBirth: "1991-02-05" },
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
  { id: "1", employeeId: "2", employeeName: "Omar Al-Faisal", amount: 50000, remainingBalance: 35000, monthlyDeduction: 2500, startDate: "2024-06-01", endDate: "2026-02-01", status: "active" },
  { id: "2", employeeId: "4", employeeName: "Khalid Nasser", amount: 80000, remainingBalance: 60000, monthlyDeduction: 4000, startDate: "2024-09-01", endDate: "2026-05-01", status: "active" },
  { id: "3", employeeId: "1", employeeName: "Aisha Rahman", amount: 20000, remainingBalance: 0, monthlyDeduction: 2000, startDate: "2023-01-01", endDate: "2023-11-01", status: "completed" },
];

export const expenses: ExpenseReimbursement[] = [
  { id: "1", employeeId: "2", employeeName: "Omar Al-Faisal", category: "Travel", amount: 3500, submissionDate: "2025-02-10", status: "approved", description: "Client site visit - Riyadh" },
  { id: "2", employeeId: "7", employeeName: "Layla Qasim", category: "Client Entertainment", amount: 1200, submissionDate: "2025-02-15", status: "pending", description: "Client dinner meeting" },
  { id: "3", employeeId: "4", employeeName: "Khalid Nasser", category: "Training", amount: 5000, submissionDate: "2025-01-28", status: "approved", description: "Leadership conference" },
  { id: "4", employeeId: "8", employeeName: "Tariq Zaman", category: "Equipment", amount: 800, submissionDate: "2025-02-18", status: "pending", description: "External monitor" },
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

export function getUpcomingBirthdays(emps: Employee[]) {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();

  return emps
    .map((emp) => {
      const dob = new Date(emp.dateOfBirth);
      const birthMonth = dob.getMonth();
      const birthDay = dob.getDate();
      let daysUntil = 0;

      const thisYearBirthday = new Date(today.getFullYear(), birthMonth, birthDay);
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
