import { employees } from "./mockData";
import { departments } from "./settingsData";

export interface PayrollRunDetail {
  runId: string;
  runLabel: string;
  employees: PayrollEmployeeDetail[];
}

export interface PayrollEmployeeDetail {
  employeeId: string;
  empId: string;
  name: string;
  department: string;
  division: string;
  designation: string;
  category: "direct" | "contractor";
  workLocationCountry: string;
  payCurrency: string;
  baseSalary: number;
  housingAllowance: number;
  travelAllowance: number;
  medicalAllowance: number;
  otherAllowances: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  isNew?: boolean;
  isSeparated?: boolean;
  salaryChanged?: boolean;
  previousGross?: number;
}

const getDivision = (dept: string) => departments.find(d => d.name === dept)?.division || "Other";

const jan2025Employees: PayrollEmployeeDetail[] = employees.map((emp) => {
  const base = Math.round(emp.salary * 0.6);
  const housing = Math.round(emp.salary * 0.25);
  const travel = Math.round(emp.salary * 0.05);
  const medical = Math.round(emp.salary * 0.05);
  const other = Math.round(emp.salary * 0.05);
  const gross = emp.salary;
  const deductions = Math.round(gross * 0.15);
  return {
    employeeId: emp.id,
    empId: emp.empId,
    name: `${emp.firstName} ${emp.lastName}`,
    department: emp.department,
    division: getDivision(emp.department),
    designation: emp.designation,
    category: emp.category,
    workLocationCountry: emp.workLocationCountry,
    payCurrency: emp.payCurrency || "SAR",
    baseSalary: base,
    housingAllowance: housing,
    travelAllowance: travel,
    medicalAllowance: medical,
    otherAllowances: other,
    grossPay: gross,
    totalDeductions: deductions,
    netPay: gross - deductions,
  };
});

// February 2025 - simulate changes:
// - Khalid Nasser got a raise (35000 -> 38000)
// - Sara Al-Mutairi is new (joined Feb)
// - Yousef Bakr separated
const feb2025Employees: PayrollEmployeeDetail[] = (employees
  .filter((emp) => emp.id !== "6") // Yousef separated
  .map((emp) => {
    let salary = emp.salary;
    let salaryChanged = false;
    let previousGross: number | undefined;

    if (emp.id === "4") {
      // Khalid got a raise
      previousGross = salary;
      salary = 38000;
      salaryChanged = true;
    }

    const base = Math.round(salary * 0.6);
    const housing = Math.round(salary * 0.25);
    const travel = Math.round(salary * 0.05);
    const medical = Math.round(salary * 0.05);
    const other = Math.round(salary * 0.05);
    const gross = salary;
    const deductions = Math.round(gross * 0.15);

    return {
      employeeId: emp.id,
      empId: emp.empId,
      name: `${emp.firstName} ${emp.lastName}`,
      department: emp.department,
      division: getDivision(emp.department),
      designation: emp.designation,
      category: emp.category,
      workLocationCountry: emp.workLocationCountry,
      payCurrency: emp.payCurrency || "SAR",
      baseSalary: base,
      housingAllowance: housing,
      travelAllowance: travel,
      medicalAllowance: medical,
      otherAllowances: other,
      grossPay: gross,
      totalDeductions: deductions,
      netPay: gross - deductions,
      salaryChanged,
      previousGross,
    };
  }) as PayrollEmployeeDetail[])
  // Add a new hire
  .concat([
    {
      employeeId: "9",
      empId: "CG-009",
      name: "Nadia Al-Rashid",
      department: "Advisory",
      division: getDivision("Advisory"),
      designation: "Senior Associate",
      category: "direct" as const,
      workLocationCountry: "Saudi Arabia",
      payCurrency: "SAR",
      baseSalary: 13200,
      housingAllowance: 5500,
      travelAllowance: 1100,
      medicalAllowance: 1100,
      otherAllowances: 1100,
      grossPay: 22000,
      totalDeductions: 3300,
      netPay: 18700,
      isNew: true,
    },
  ]);

export const payrollRunDetails: PayrollRunDetail[] = [
  { runId: "1", runLabel: "January 2025", employees: jan2025Employees },
  { runId: "2", runLabel: "February 2025", employees: feb2025Employees },
];

export function getCompletedRuns() {
  return payrollRunDetails.map((r) => ({ id: r.runId, label: r.runLabel }));
}

export interface BridgeItem {
  label: string;
  value: number;
  type: "increase" | "decrease" | "total";
}

export function computeComparison(baseRunId: string, compareRunId: string) {
  const baseRun = payrollRunDetails.find((r) => r.runId === baseRunId);
  const compareRun = payrollRunDetails.find((r) => r.runId === compareRunId);
  if (!baseRun || !compareRun) return null;

  const baseMap = new Map(baseRun.employees.map((e) => [e.employeeId, e]));
  const compareMap = new Map(compareRun.employees.map((e) => [e.employeeId, e]));

  const baseGross = baseRun.employees.reduce((s, e) => s + e.grossPay, 0);
  const compareGross = compareRun.employees.reduce((s, e) => s + e.grossPay, 0);
  const baseNet = baseRun.employees.reduce((s, e) => s + e.netPay, 0);
  const compareNet = compareRun.employees.reduce((s, e) => s + e.netPay, 0);
  const baseDeductions = baseRun.employees.reduce((s, e) => s + e.totalDeductions, 0);
  const compareDeductions = compareRun.employees.reduce((s, e) => s + e.totalDeductions, 0);

  // New hires (in compare but not in base)
  const newHires = compareRun.employees.filter((e) => !baseMap.has(e.employeeId));
  const newHiresGross = newHires.reduce((s, e) => s + e.grossPay, 0);

  // Separations (in base but not in compare)
  const separations = baseRun.employees.filter((e) => !compareMap.has(e.employeeId));
  const separationsGross = separations.reduce((s, e) => s + e.grossPay, 0);

  // Salary changes (present in both, different gross)
  const salaryChanges: { employee: PayrollEmployeeDetail; oldGross: number; newGross: number }[] = [];
  let salaryChangeTotal = 0;
  for (const [id, compEmp] of compareMap) {
    const baseEmp = baseMap.get(id);
    if (baseEmp && baseEmp.grossPay !== compEmp.grossPay) {
      const diff = compEmp.grossPay - baseEmp.grossPay;
      salaryChanges.push({ employee: compEmp, oldGross: baseEmp.grossPay, newGross: compEmp.grossPay });
      salaryChangeTotal += diff;
    }
  }

  // Bridge chart data
  const bridge: BridgeItem[] = [
    { label: baseRun.runLabel, value: baseGross, type: "total" },
    ...(newHiresGross > 0 ? [{ label: "New Hires", value: newHiresGross, type: "increase" as const }] : []),
    ...(separationsGross > 0 ? [{ label: "Separations", value: -separationsGross, type: "decrease" as const }] : []),
    ...(salaryChangeTotal !== 0
      ? [{ label: "Salary Changes", value: salaryChangeTotal, type: (salaryChangeTotal > 0 ? "increase" : "decrease") as "increase" | "decrease" }]
      : []),
    { label: compareRun.runLabel, value: compareGross, type: "total" },
  ];

  // Department breakdown
  const deptMap = new Map<string, { base: number; compare: number }>();
  for (const e of baseRun.employees) {
    const existing = deptMap.get(e.department) || { base: 0, compare: 0 };
    existing.base += e.grossPay;
    deptMap.set(e.department, existing);
  }
  for (const e of compareRun.employees) {
    const existing = deptMap.get(e.department) || { base: 0, compare: 0 };
    existing.compare += e.grossPay;
    deptMap.set(e.department, existing);
  }
  const departmentBreakdown = Array.from(deptMap.entries()).map(([dept, v]) => ({
    department: dept,
    base: v.base,
    compare: v.compare,
    change: v.compare - v.base,
    changePercent: v.base > 0 ? ((v.compare - v.base) / v.base) * 100 : 100,
  }));

  return {
    baseRun,
    compareRun,
    baseGross,
    compareGross,
    grossChange: compareGross - baseGross,
    grossChangePercent: baseGross > 0 ? ((compareGross - baseGross) / baseGross) * 100 : 0,
    baseNet,
    compareNet,
    netChange: compareNet - baseNet,
    baseDeductions,
    compareDeductions,
    deductionsChange: compareDeductions - baseDeductions,
    baseHeadcount: baseRun.employees.length,
    compareHeadcount: compareRun.employees.length,
    headcountChange: compareRun.employees.length - baseRun.employees.length,
    newHires,
    separations,
    salaryChanges,
    bridge,
    departmentBreakdown,
  };
}
