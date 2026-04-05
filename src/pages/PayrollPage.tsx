import React, { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { payrollRuns, loans, expenses } from "@/data/mockData";
import { useEmployees } from "@/contexts/EmployeeContext";
import { PayrollRun, OneOffAdjustment, Employee, Deduction } from "@/types/hcm";
import { useEmployeeTypes } from "@/contexts/EmployeeTypeContext";
import { defaultExchangeRates } from "@/data/settingsData";
import { useAdvances } from "@/contexts/AdvanceContext";
import { useDeductions } from "@/contexts/DeductionContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSeparations } from "@/contexts/SeparationContext";
import { Button } from "@/components/ui/button";
import { Play, Eye, CheckCircle2, XCircle, ArrowLeft, Download, Search, Plus, X, Lock, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { DollarSign, Users, TrendingDown } from "lucide-react";
import { useClient } from "@/contexts/ClientContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLeaveTypes } from "@/contexts/LeaveTypeContext";
import { useActiveEmployees } from "@/hooks/useActiveEmployees";
import { useApprovals } from "@/contexts/ApprovalContext";
import { useRole } from "@/contexts/RoleContext";

const REPORTING_CURRENCY = "SAR";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function getYearEndMonth(yearEndDate?: string): string | null {
  if (!yearEndDate) return null;
  const [mm] = yearEndDate.split("-").map(Number);
  return MONTHS[mm - 1] || null;
}

function getCurrentFiscalYear(yearEndDate?: string): string {
  if (!yearEndDate) return `${new Date().getFullYear()}`;
  const [mm, dd] = yearEndDate.split("-").map(Number);
  const now = new Date();
  const yearEndThisYear = new Date(now.getFullYear(), mm - 1, dd);
  if (now <= yearEndThisYear) {
    return `${now.getFullYear() - 1}-${now.getFullYear()}`;
  }
  return `${now.getFullYear()}-${now.getFullYear() + 1}`;
}

function getEmployeePayCurrency(emp: { payCurrency?: string }): string {
  return emp.payCurrency || REPORTING_CURRENCY;
}

function getToReportingRate(fromCurrency: string): number {
  if (fromCurrency === REPORTING_CURRENCY) return 1;
  return defaultExchangeRates.find(r => r.fromCurrency === fromCurrency)?.toReportingRate || 1;
}

interface EmployeePayrollLine {
  emp: Employee;
  basic: number;
  allowances: number;
  gross: number;
  loanDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  expenseReimbursement: number;
  advanceGiven: number;
  oneOffBenefits: number;
  oneOffDeductions: number;
  separationSettlement: number;
  isSeparated: boolean;
  net: number;
  payCurrency: string;
}

function buildBreakdown(allEmployees: Employee[], allDeductions: Deduction[], oneOffs: OneOffAdjustment[], separationMap: Record<string, number>, processedSepIds: Set<string>, runId?: string, advancesData?: { employeeId: string; amount: number; payrollRunId?: string }[]): EmployeePayrollLine[] {
  const activeEmployees = allEmployees.filter(emp => {
    if (processedSepIds.has(emp.id)) return false;
    return true;
  });
  return activeEmployees.map(emp => {
    const comp = emp.compensation || [];
    const basic = comp.find(c => c.type === "base")?.amount || 0;
    const gross = emp.salary;
    const allowances = gross - basic;
    const activeLoan = loans.find(l => l.employeeId === emp.id && l.status === "active");
    const loanDeduction = activeLoan ? activeLoan.monthlyDeduction : 0;
    const applicableDeductions = allDeductions.filter(d => {
      if (!d.isActive) return false;
      if (d.type === "one-off") return false;
      if (d.appliesTo && d.appliesTo !== "all" && d.appliesTo !== emp.category) return false;
      if (d.appliesToCountries && d.appliesToCountries.length > 0 && !d.appliesToCountries.includes(emp.workLocationCountry)) return false;
      return true;
    });
    const otherDeductions = applicableDeductions.reduce((sum, d) => {
      if (d.percentage) return sum + Math.round(gross * d.percentage / 100);
      if (d.fixedAmount) return sum + d.fixedAmount;
      return sum;
    }, 0);
    // Only reimburse expenses NOT linked to an advance
    const approvedExpenses = expenses
      .filter(e => e.employeeId === emp.id && e.status === "approved" && e.payrollRunId === runId && !e.advanceId)
      .reduce((s, e) => s + e.amount, 0);
    // Advance given through payroll
    const advanceGiven = (advancesData || [])
      .filter(a => a.employeeId === emp.id && a.payrollRunId === runId)
      .reduce((s, a) => s + a.amount, 0);
    const empOneOffs = oneOffs.filter(o => o.employeeId === emp.id);
    const oneOffBenefits = empOneOffs.filter(o => o.type === "benefit").reduce((s, o) => s + o.amount, 0);
    const oneOffDeductions = empOneOffs.filter(o => o.type === "deduction").reduce((s, o) => s + o.amount, 0);
    const separationSettlement = separationMap[emp.id] || 0;
    const isSeparated = !!separationMap[emp.id];
    const totalDeductions = otherDeductions + loanDeduction + oneOffDeductions;
    const net = gross - totalDeductions + approvedExpenses + advanceGiven + oneOffBenefits + separationSettlement;
    const payCurrency = getEmployeePayCurrency(emp);
    return { emp, basic, allowances, gross, loanDeduction, otherDeductions, totalDeductions, expenseReimbursement: approvedExpenses, advanceGiven, oneOffBenefits, oneOffDeductions, separationSettlement, isSeparated, net, payCurrency };
  });
}

function generateAccountingCSV(run: PayrollRun, lines: EmployeePayrollLine[]): string {
  const glRaw = localStorage.getItem("gl_mappings");
  const glMap: Record<string, string> = {};
  if (glRaw) {
    try {
      const parsed = JSON.parse(glRaw) as { entry: string; glCode: string }[];
      parsed.forEach(m => { glMap[m.entry] = m.glCode; });
    } catch {}
  }

  const rows: string[] = ["Date,GL Code,Account,Currency,Debit,Credit,Reporting Currency Amount,Employee,Description"];
  const date = run.runDate || new Date().toISOString().split("T")[0];

  lines.forEach(({ emp, basic, allowances, loanDeduction, otherDeductions, expenseReimbursement, advanceGiven, net, payCurrency }) => {
    const name = `${emp.firstName} ${emp.lastName}`;
    const rate = getToReportingRate(payCurrency);
    const rptAmt = (amt: number) => payCurrency !== REPORTING_CURRENCY ? Math.round(amt * rate).toString() : "";
    rows.push(`${date},${glMap["Basic Salary"] || ""},Basic Salary,${payCurrency},${basic},0,${rptAmt(basic)},${name},${run.month} ${run.year}`);
    if (allowances > 0) rows.push(`${date},${glMap["Housing Allowance"] || ""},Allowances,${payCurrency},${allowances},0,${rptAmt(allowances)},${name},${run.month} ${run.year}`);
    if (otherDeductions > 0) rows.push(`${date},${glMap["GOSI (Employee)"] || ""},Statutory Deductions,${payCurrency},0,${otherDeductions},${rptAmt(otherDeductions)},${name},${run.month} ${run.year}`);
    if (loanDeduction > 0) rows.push(`${date},${glMap["Loan Deduction"] || ""},Loan Deduction,${payCurrency},0,${loanDeduction},${rptAmt(loanDeduction)},${name},${run.month} ${run.year}`);
    if (expenseReimbursement > 0) rows.push(`${date},${glMap["Expense Reimbursement"] || ""},Expense Reimbursement,${payCurrency},${expenseReimbursement},0,${rptAmt(expenseReimbursement)},${name},${run.month} ${run.year}`);
    if (advanceGiven > 0) rows.push(`${date},${glMap["Advance Given"] || ""},Advance Given,${payCurrency},${advanceGiven},0,${rptAmt(advanceGiven)},${name},${run.month} ${run.year}`);
    rows.push(`${date},${glMap["Net Pay"] || ""},Net Pay,${payCurrency},0,${net},${rptAmt(net)},${name},${run.month} ${run.year}`);
  });

  return rows.join("\n");
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PayrollPage() {
  const { employees } = useEmployees();
  const { activeTypes } = useEmployeeTypes();
  const { deductions } = useDeductions();
  const { canUserApprovePayroll } = useApprovals();
  const { currentEmployeeId } = useRole();
  const { advances } = useAdvances();
  const approvedAdvances = advances.filter(a => a.status === "approved").map(a => ({ employeeId: a.employeeId, amount: a.amount, payrollRunId: a.payrollRunId }));
  const [runs, setRuns] = useState<PayrollRun[]>(() => [...payrollRuns]);

  const syncRuns = (updater: (prev: PayrollRun[]) => PayrollRun[]) => {
    setRuns(prev => {
      const next = updater(prev);
      payrollRuns.length = 0;
      next.forEach(r => payrollRuns.push(r));
      return next;
    });
  };
  const { client } = useClient();
  const { separations } = useSeparations();
  const activeEmps = useActiveEmployees();
  const { leaveTypes, balances, initializeBalances, runYearEndCarryforward, completedRollovers } = useLeaveTypes();
  const [newRunOpen, setNewRunOpen] = useState(false);
  const [newRunStep, setNewRunStep] = useState<1 | 2>(1);
  const [newRunPreview, setNewRunPreview] = useState<EmployeePayrollLine[]>([]);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: "approve" | "reject" } | null>(null);
  const [carryforwardOpen, setCarryforwardOpen] = useState(false);
  const [carryforwardPreview, setCarryforwardPreview] = useState<{ employeeId: string; employeeName: string; leaveTypeId: string; leaveTypeName: string; remaining: number; maxCarryforward: number; carryforward: number }[]>([]);
  const [pendingCompleteId, setPendingCompleteId] = useState<string | null>(null);
  const [newMonth, setNewMonth] = useState("April");
  const [newYear, setNewYear] = useState("2025");
  const [newRunEmployeeType, setNewRunEmployeeType] = useState("all");
  const { toast } = useToast();

  const getSepMap = (runId?: string) => {
    const sepMap: Record<string, number> = {};
    separations.forEach(sep => {
      if (sep.status !== "approved") return;
      if (runId) {
        if (sep.payrollRunId === runId) {
          sepMap[sep.employeeId] = sep.totalSettlement;
        }
      } else {
        sepMap[sep.employeeId] = sep.totalSettlement;
      }
    });
    return sepMap;
  };

  const [processedSeps, setProcessedSeps] = useState<Set<string>>(() => {
    const set = new Set<string>();
    const completedRunIds = new Set(payrollRuns.filter(r => r.status === "completed").map(r => r.id));
    separations.forEach(sep => {
      if (sep.status === "approved" && sep.payrollRunId && completedRunIds.has(sep.payrollRunId)) {
        set.add(sep.employeeId);
      }
    });
    return set;
  });

  const [detailSearch, setDetailSearch] = useState("");
  const [oneOffs, setOneOffs] = useState<Record<string, OneOffAdjustment[]>>({});
  const [sheetEmpId, setSheetEmpId] = useState<string | null>(null);
  const [newAdjName, setNewAdjName] = useState("");
  const [newAdjAmount, setNewAdjAmount] = useState("");
  const [newAdjType, setNewAdjType] = useState<"benefit" | "deduction">("benefit");

  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const currentOneOffs = selectedRun ? (oneOffs[selectedRun.id] || []) : [];

  const hasOpenRun = runs.some(r => r.status === "draft" || r.status === "processing");

  const getNextMonth = (month: string, year: number): { month: string; year: number } => {
    const idx = months.indexOf(month);
    if (idx === 11) return { month: "January", year: year + 1 };
    return { month: months[idx + 1], year };
  };

  const handleGeneratePayroll = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasOpenRun) {
      toast({ title: "Cannot Create", description: "Complete the current payroll run before creating a new one.", variant: "destructive" });
      return;
    }
    // Filter employees by type
    const filteredEmployees = newRunEmployeeType === "all" ? employees : employees.filter(emp => emp.category === newRunEmployeeType);
    const breakdown = buildBreakdown(filteredEmployees, deductions, [], {}, processedSeps, undefined, approvedAdvances);
    setNewRunPreview(breakdown);
    setNewRunStep(2);
  };

  const handleSavePayroll = (disburse: boolean) => {
    const totalGross = newRunPreview.reduce((s, l) => s + l.gross, 0);
    const totalDed = newRunPreview.reduce((s, l) => s + l.totalDeductions, 0);
    const newRun: PayrollRun = {
      id: String(Date.now()), month: newMonth, year: Number(newYear),
      status: disburse ? "completed" : "processing",
      totalGross, totalDeductions: totalDed, totalNet: totalGross - totalDed,
      runDate: disburse ? new Date().toISOString().split("T")[0] : "",
      employeeCount: newRunPreview.length,
    };
    syncRuns(prev => [...prev, newRun]);

    if (disburse) {
      // Mark expenses as paid
      const paidDate = new Date().toISOString().split("T")[0];
      expenses.forEach(exp => {
        if (exp.status === "approved" && !exp.payrollRunId) {
          exp.payrollRunId = newRun.id;
          exp.status = "paid";
          exp.paidDate = paidDate;
          exp.paymentMethod = "Payroll";
        }
      });
    }

    setNewRunOpen(false);
    setNewRunStep(1);
    setNewRunPreview([]);
    setNewRunEmployeeType("all");
    toast({
      title: disburse ? "Payroll Saved & Disbursed" : "Payroll Saved",
      description: disburse
        ? `${newMonth} ${newYear} payroll has been disbursed to ${newRunPreview.length} employees.`
        : `${newMonth} ${newYear} payroll saved as pending. You can disburse it later.`,
    });
  };

  const handleProcess = (id: string) => {
    syncRuns(prev => prev.map(r => r.id === id ? { ...r, status: "processing" as const } : r));
    toast({ title: "Processing", description: "Payroll run is now open for processing." });
  };

  const handleComplete = (id: string) => {
    if (!canUserApprovePayroll(currentEmployeeId)) {
      toast({ title: "Not Authorized", description: "Completing payroll requires Payroll approval permissions.", variant: "destructive" });
      return;
    }
    const run = runs.find(r => r.id === id);
    if (!run) return;

    const currentSepMap = getSepMap(run.id);
    const currentBreakdown = buildBreakdown(employees, deductions, oneOffs[run.id] || [], currentSepMap, processedSeps, run.id, approvedAdvances);
    const runEmployeeCount = currentBreakdown.length;
    const runGross = currentBreakdown.reduce((s, l) => s + l.gross, 0);
    const runDed = currentBreakdown.reduce((s, l) => s + l.totalDeductions, 0);

    syncRuns(prev => prev.map(r => r.id === id ? {
      ...r, status: "completed" as const, runDate: new Date().toISOString().split("T")[0],
      employeeCount: runEmployeeCount, totalGross: runGross, totalDeductions: runDed, totalNet: runGross - runDed,
    } : r));

    const paidDate = new Date().toISOString().split("T")[0];
    expenses.forEach(exp => {
      if (exp.payrollRunId === id && exp.status === "approved") {
        exp.status = "paid";
        exp.paidDate = paidDate;
        exp.paymentMethod = "Payroll";
      }
      if (exp.status === "approved" && !exp.payrollRunId) {
        exp.payrollRunId = id;
        exp.status = "paid";
        exp.paidDate = paidDate;
        exp.paymentMethod = "Payroll";
      }
    });

    const sepMap = getSepMap(run.id);
    const updatedProcessedSeps = new Set(processedSeps);
    Object.keys(sepMap).forEach(empId => updatedProcessedSeps.add(empId));
    setProcessedSeps(updatedProcessedSeps);

    const next = getNextMonth(run.month, run.year);
    const breakdown = buildBreakdown(employees, deductions, [], {}, updatedProcessedSeps, undefined, approvedAdvances);
    const totalGross = breakdown.reduce((s, l) => s + l.gross, 0);
    const totalDed = breakdown.reduce((s, l) => s + l.totalDeductions, 0);
    const nextRun: PayrollRun = {
      id: String(Date.now() + 1), month: next.month, year: next.year, status: "processing",
      totalGross, totalDeductions: totalDed, totalNet: totalGross - totalDed,
      runDate: "", employeeCount: breakdown.length,
    };
    syncRuns(prev => [...prev, nextRun]);

    toast({ title: "Payroll Completed", description: `${run.month} ${run.year} is locked. ${next.month} ${next.year} payroll has been opened automatically.` });
    setSelectedRun(null);
  };

  const handleDeleteRun = (id: string) => {
    const run = runs.find(r => r.id === id);
    if (!run || run.status === "completed") return;
    syncRuns(prev => prev.filter(r => r.id !== id));
    toast({ title: "Deleted", description: "Payroll run deleted." });
  };

  const yearEndMonth = getYearEndMonth(client.yearEndDate);
  const currentFY = getCurrentFiscalYear(client.yearEndDate);

  const getNextFY = () => {
    const parts = currentFY.split("-");
    if (parts.length === 2) return `${parts[1]}-${Number(parts[1]) + 1}`;
    return `${Number(parts[0]) + 1}`;
  };

  const isYearEndRun = (run: PayrollRun) => {
    return yearEndMonth && run.month === yearEndMonth && !completedRollovers.includes(currentFY);
  };

  const buildCarryforwardPreview = () => {
    const activeLeaveTypes = leaveTypes.filter(lt => lt.isActive);
    const preview: typeof carryforwardPreview = [];
    for (const emp of activeEmps) {
      for (const lt of activeLeaveTypes) {
        const balance = balances.find(b => b.employeeId === emp.id && b.leaveTypeId === lt.id && b.year === currentFY);
        const remaining = balance ? balance.remaining : lt.defaultDays;
        let carryforward = 0;
        if (remaining > 0 && lt.maxCarryForwardDays > 0) {
          carryforward = Math.min(remaining, lt.maxCarryForwardDays);
        }
        preview.push({
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          leaveTypeId: lt.id,
          leaveTypeName: lt.name,
          remaining,
          maxCarryforward: lt.maxCarryForwardDays,
          carryforward,
        });
      }
    }
    return preview;
  };

  const handleConfirm = () => {
    if (!confirmAction) return;
    if (confirmAction.action === "approve") {
      const run = runs.find(r => r.id === confirmAction.id);
      if (run && isYearEndRun(run)) {
        // Initialize balances first, then show carryforward dialog
        initializeBalances(activeEmps.map(e => e.id), currentFY);
        const preview = buildCarryforwardPreview();
        setCarryforwardPreview(preview);
        setPendingCompleteId(confirmAction.id);
        setConfirmOpen(false);
        setConfirmAction(null);
        setCarryforwardOpen(true);
        return;
      }
      handleComplete(confirmAction.id);
    } else {
      syncRuns(prev => prev.map(r => r.id === confirmAction.id ? { ...r, status: "failed" as const } : r));
      toast({ title: "Rejected", description: "Payroll run has been rejected." });
    }
    setConfirmOpen(false);
    setConfirmAction(null);
  };

  const handleCarryforwardChange = (index: number, value: number) => {
    setCarryforwardPreview(prev => {
      const updated = [...prev];
      const item = updated[index];
      // Clamp between 0 and min(remaining, maxCarryforward) — but allow user to set any value up to remaining
      const maxAllowed = Math.max(0, item.remaining);
      updated[index] = { ...item, carryforward: Math.max(0, Math.min(value, maxAllowed)) };
      return updated;
    });
  };

  const handleConfirmCarryforward = () => {
    if (!pendingCompleteId) return;
    // Run carryforward with custom values
    const nextFY = getNextFY();
    const customValues = carryforwardPreview.map(item => ({
      employeeId: item.employeeId,
      leaveTypeId: item.leaveTypeId,
      carryforward: item.carryforward,
    }));
    runYearEndCarryforward(currentFY, nextFY, activeEmps.map(e => e.id), customValues);
    // Now complete the payroll
    handleComplete(pendingCompleteId);
    setCarryforwardOpen(false);
    setPendingCompleteId(null);
    toast({ title: "Leave Balances Rolled Over", description: `Carryforward applied for ${nextFY}.` });
  };

  const handleDownloadAccounting = (run: PayrollRun) => {
    const breakdown = buildBreakdown(employees, deductions, oneOffs[run.id] || [], getSepMap(run.id), processedSeps, run.id, approvedAdvances);
    const csv = generateAccountingCSV(run, breakdown);
    downloadCSV(csv, `accounting-entry-${run.month}-${run.year}.csv`);
    toast({ title: "Downloaded", description: "Accounting entry CSV downloaded." });
  };

  const handleAddOneOff = () => {
    if (!sheetEmpId || !selectedRun || !newAdjName || !newAdjAmount) return;
    const adj: OneOffAdjustment = {
      id: String(Date.now()),
      employeeId: sheetEmpId,
      type: newAdjType,
      name: newAdjName,
      amount: Number(newAdjAmount),
    };
    setOneOffs(prev => ({
      ...prev,
      [selectedRun.id]: [...(prev[selectedRun.id] || []), adj],
    }));
    setNewAdjName("");
    setNewAdjAmount("");
    toast({ title: "Adjustment Added", description: `One-off ${newAdjType} added.` });
  };

  const handleRemoveOneOff = (adjId: string) => {
    if (!selectedRun) return;
    setOneOffs(prev => ({
      ...prev,
      [selectedRun.id]: (prev[selectedRun.id] || []).filter(a => a.id !== adjId),
    }));
  };

  const isLocked = selectedRun?.status === "completed" || selectedRun?.status === "failed";

  if (selectedRun) {
    const sepMap = getSepMap(selectedRun.id);
    const breakdown = buildBreakdown(employees, deductions, currentOneOffs, sepMap, isLocked ? new Set() : processedSeps, selectedRun.id, approvedAdvances);
    const totalLoan = breakdown.reduce((s, l) => s + l.loanDeduction, 0);
    const totalExpense = breakdown.reduce((s, l) => s + l.expenseReimbursement, 0);
    const totalAdvance = breakdown.reduce((s, l) => s + l.advanceGiven, 0);
    const totalOneOffBen = breakdown.reduce((s, l) => s + l.oneOffBenefits, 0);
    const totalOneOffDed = breakdown.reduce((s, l) => s + l.oneOffDeductions, 0);
    const totalSepSettlement = breakdown.reduce((s, l) => s + l.separationSettlement, 0);

    // Convert totals to reporting currency
    const toReporting = (line: EmployeePayrollLine, val: number) => val * getToReportingRate(line.payCurrency);
    const rptGross = Math.round(breakdown.reduce((s, l) => s + toReporting(l, l.gross), 0));
    const rptDeductions = Math.round(breakdown.reduce((s, l) => s + toReporting(l, l.totalDeductions), 0));
    const rptNet = Math.round(breakdown.reduce((s, l) => s + toReporting(l, l.net), 0));
    const rptLoan = Math.round(breakdown.reduce((s, l) => s + toReporting(l, l.loanDeduction), 0));
    const rptExpense = Math.round(breakdown.reduce((s, l) => s + toReporting(l, l.expenseReimbursement), 0));
    const rptAdvance = Math.round(breakdown.reduce((s, l) => s + toReporting(l, l.advanceGiven), 0));
    const rptOneOffBen = Math.round(breakdown.reduce((s, l) => s + toReporting(l, l.oneOffBenefits), 0));
    const rptOneOffDed = Math.round(breakdown.reduce((s, l) => s + toReporting(l, l.oneOffDeductions), 0));
    const rptSepSettlement = Math.round(breakdown.reduce((s, l) => s + toReporting(l, l.separationSettlement), 0));

    const filteredBreakdown = breakdown.filter(({ emp }) => {
      if (!detailSearch) return true;
      const q = detailSearch.toLowerCase();
      return `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q) ||
        emp.empId.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q) ||
        emp.workLocationCountry.toLowerCase().includes(q);
    });

    // Group by country + pay currency
    const countryGroups = new Map<string, EmployeePayrollLine[]>();
    filteredBreakdown.forEach(line => {
      const key = `${line.emp.workLocationCountry}|||${line.payCurrency}`;
      if (!countryGroups.has(key)) countryGroups.set(key, []);
      countryGroups.get(key)!.push(line);
    });

    const sheetEmp = sheetEmpId ? employees.find(e => e.id === sheetEmpId) : null;
    const sheetOneOffs = sheetEmpId ? currentOneOffs.filter(o => o.employeeId === sheetEmpId) : [];

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { setSelectedRun(null); setDetailSearch(""); }}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-xl font-bold">{selectedRun.month} {selectedRun.year} Payroll</h1>
            <p className="text-sm text-muted-foreground">
              {client.companyName ? `${client.companyName} — ` : ""}Payroll run details
              {isLocked && <span className="ml-2 text-xs text-destructive font-medium">(Locked)</span>}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleDownloadAccounting(selectedRun)}>
              <Download className="h-4 w-4 mr-2" />Accounting Entry
            </Button>
            <StatusBadge status={selectedRun.status} />
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-10 gap-2">
          <StatCard compact title="Employees" value={breakdown.length} icon={Users} variant="info" />
          <StatCard compact title={`Gross (${REPORTING_CURRENCY})`} value={`${rptGross.toLocaleString()}`} icon={DollarSign} variant="primary" />
          <StatCard compact title={`Deductions (${REPORTING_CURRENCY})`} value={`${rptDeductions.toLocaleString()}`} icon={TrendingDown} variant="warning" />
          <StatCard compact title={`Loan Ded. (${REPORTING_CURRENCY})`} value={`${rptLoan.toLocaleString()}`} icon={TrendingDown} variant="warning" />
          <StatCard compact title={`Exp. Reimb. (${REPORTING_CURRENCY})`} value={`${rptExpense.toLocaleString()}`} icon={DollarSign} variant="success" />
          {rptAdvance > 0 && <StatCard compact title={`Advance (${REPORTING_CURRENCY})`} value={`${rptAdvance.toLocaleString()}`} icon={DollarSign} variant="info" />}
          <StatCard compact title={`One-Off + (${REPORTING_CURRENCY})`} value={`${rptOneOffBen.toLocaleString()}`} icon={DollarSign} variant="success" />
          <StatCard compact title={`One-Off - (${REPORTING_CURRENCY})`} value={`${rptOneOffDed.toLocaleString()}`} icon={TrendingDown} variant="warning" />
          {rptSepSettlement > 0 && <StatCard compact title={`Sep. EOS (${REPORTING_CURRENCY})`} value={`${rptSepSettlement.toLocaleString()}`} icon={DollarSign} variant="primary" />}
          <StatCard compact title={`Net Pay (${REPORTING_CURRENCY})`} value={`${rptNet.toLocaleString()}`} icon={DollarSign} variant="success" />
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Run Information</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div><span className="text-muted-foreground">Period:</span> <span className="font-medium">{selectedRun.month} {selectedRun.year}</span></div>
              <div><span className="text-muted-foreground">Run Date:</span> <span className="font-medium">{selectedRun.runDate || "Not processed"}</span></div>
              <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={selectedRun.status} /></div>
              <div><span className="text-muted-foreground">Employees:</span> <span className="font-medium">{breakdown.length}</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Search bar */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, ID, department, country..."
            value={detailSearch}
            onChange={e => setDetailSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="bg-card rounded-xl border overflow-hidden">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Employee</TableHead>
                  <TableHead className="font-semibold">Country</TableHead>
                  <TableHead className="font-semibold">Currency</TableHead>
                  <TableHead className="font-semibold text-right">Basic</TableHead>
                  <TableHead className="font-semibold text-right">Allowances</TableHead>
                  <TableHead className="font-semibold text-right">Gross</TableHead>
                  <TableHead className="font-semibold text-right">Deductions</TableHead>
                  <TableHead className="font-semibold text-right">Loan Ded.</TableHead>
                  <TableHead className="font-semibold text-right">Expense Reimb.</TableHead>
                  <TableHead className="font-semibold text-right">Advance Given</TableHead>
                  <TableHead className="font-semibold text-right">One-Off +/-</TableHead>
                  <TableHead className="font-semibold text-right">EOS Settlement</TableHead>
                  <TableHead className="font-semibold text-right">Net Pay</TableHead>
                  <TableHead className="font-semibold text-right bg-primary/5 text-foreground">Net (Reporting)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from(countryGroups.entries()).map(([groupKey, lines]) => {
                  const [country, groupCurrency] = groupKey.split("|||");
                  const subtotalGross = lines.reduce((s, l) => s + l.gross, 0);
                  const subtotalDeductions = lines.reduce((s, l) => s + l.totalDeductions, 0);
                  const subtotalNet = lines.reduce((s, l) => s + l.net, 0);

                  return (
                    <React.Fragment key={groupKey}>
                      {/* Country + Currency header */}
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={15} className="py-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {country} — Pay Currency: {groupCurrency} ({lines.length} employee{lines.length > 1 ? "s" : ""})
                          </span>
                        </TableCell>
                      </TableRow>
                      {lines.map(({ emp, basic, allowances, gross, otherDeductions, loanDeduction, expenseReimbursement, advanceGiven, oneOffBenefits, oneOffDeductions, separationSettlement, isSeparated, net, payCurrency }) => (
                        <TableRow
                          key={emp.id}
                          className={`hover:bg-muted/30 transition-colors ${!isLocked ? "cursor-pointer" : ""} ${isSeparated ? "bg-destructive/5" : ""}`}
                          onClick={() => !isLocked && setSheetEmpId(emp.id)}
                        >
                          <TableCell className="font-medium">
                            {emp.firstName} {emp.lastName}
                            {isSeparated && <span className="ml-2 text-[10px] font-semibold text-destructive uppercase">Separated</span>}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">{emp.workLocationCountry}</TableCell>
                          <TableCell className="text-xs font-medium">{payCurrency}</TableCell>
                          <TableCell className="text-right">{basic.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{allowances.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{gross.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-destructive">{otherDeductions.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-destructive">{loanDeduction > 0 ? loanDeduction.toLocaleString() : "—"}</TableCell>
                          <TableCell className="text-right text-success">{expenseReimbursement > 0 ? expenseReimbursement.toLocaleString() : "—"}</TableCell>
                          <TableCell className="text-right text-info">{advanceGiven > 0 ? advanceGiven.toLocaleString() : "—"}</TableCell>
                          <TableCell className="text-right">
                            {(oneOffBenefits > 0 || oneOffDeductions > 0) ? (
                              <span>
                                {oneOffBenefits > 0 && <span className="text-success">+{oneOffBenefits.toLocaleString()}</span>}
                                {oneOffBenefits > 0 && oneOffDeductions > 0 && " / "}
                                {oneOffDeductions > 0 && <span className="text-destructive">-{oneOffDeductions.toLocaleString()}</span>}
                              </span>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {separationSettlement > 0 ? (
                              <span className="font-semibold text-primary">{separationSettlement.toLocaleString()}</span>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-right font-semibold">{net.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-semibold bg-primary/5 text-foreground">{Math.round(net * getToReportingRate(payCurrency)).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                      {/* Country subtotal */}
                      <TableRow className="bg-muted/20 border-b-2">
                        <TableCell colSpan={3} className="text-right text-xs font-bold text-muted-foreground">Subtotal {country} — {groupCurrency}</TableCell>
                         <TableCell colSpan={2} />
                         <TableCell className="text-right font-bold text-xs">{subtotalGross.toLocaleString()}</TableCell>
                         <TableCell className="text-right font-bold text-xs text-destructive">{subtotalDeductions.toLocaleString()}</TableCell>
                         <TableCell colSpan={5} />
                         <TableCell className="text-right font-bold text-xs">{subtotalNet.toLocaleString()}</TableCell>
                         <TableCell className="text-right font-bold text-xs bg-primary/5 text-foreground">{Math.round(subtotalNet * getToReportingRate(groupCurrency)).toLocaleString()}</TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}
                {/* Grand total in reporting currency */}
                <TableRow className="bg-primary/10 font-bold">
                  <TableCell colSpan={3} className="text-right text-sm">Grand Total ({REPORTING_CURRENCY})</TableCell>
                   <TableCell colSpan={2} />
                   <TableCell className="text-right text-sm">{rptGross.toLocaleString()}</TableCell>
                   <TableCell className="text-right text-sm text-destructive">{rptDeductions.toLocaleString()}</TableCell>
                   <TableCell colSpan={5} />
                   <TableCell className="text-right text-sm">{rptNet.toLocaleString()}</TableCell>
                   <TableCell className="text-right text-sm font-bold bg-primary/5 text-foreground">{rptNet.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        {selectedRun.status === "processing" && (
          <div className="flex gap-2">
            <Button className="gradient-ey text-primary-foreground font-semibold" onClick={() => { setConfirmAction({ id: selectedRun.id, action: "approve" }); setConfirmOpen(true); }}>
              <CheckCircle2 className="h-4 w-4 mr-2" />Complete & Lock Payroll
            </Button>
            <Button variant="destructive" onClick={() => { setConfirmAction({ id: selectedRun.id, action: "reject" }); setConfirmOpen(true); }}>
              <XCircle className="h-4 w-4 mr-2" />Reject
            </Button>
          </div>
        )}

        {/* One-off adjustment sheet */}
        <Sheet open={!!sheetEmpId} onOpenChange={(open) => { if (!open) setSheetEmpId(null); }}>
          <SheetContent side="right" className="w-[420px] sm:w-[500px] overflow-y-auto">
            {sheetEmp && (() => {
              const empLoans = loans.filter(l => l.employeeId === sheetEmp.id && l.status === "active");
              const empExpenses = expenses.filter(e => e.employeeId === sheetEmp.id);
              const empAdvances = advances.filter(a => a.employeeId === sheetEmp.id && a.status === "approved" && a.payrollRunId === selectedRun.id);
              const empDeductions = Math.round(sheetEmp.salary * 0.15);
              const empPayCurrency = getEmployeePayCurrency(sheetEmp);
              return (
                <>
                  <SheetHeader>
                    <SheetTitle>{sheetEmp.firstName} {sheetEmp.lastName}</SheetTitle>
                    <p className="text-sm text-muted-foreground">{sheetEmp.designation} · {sheetEmp.department} · {sheetEmp.workLocationCountry} ({empPayCurrency}) — {selectedRun.month} {selectedRun.year}</p>
                  </SheetHeader>
                  <ScrollArea className="mt-4 pr-2" style={{ maxHeight: "calc(100vh - 120px)" }}>
                    <div className="space-y-5">
                      {/* Statutory Deductions */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Statutory Deductions</p>
                        <div className="bg-muted/50 rounded-lg px-3 py-2 text-sm flex justify-between">
                          <span>GOSI & Insurance (15%)</span>
                          <span className="font-medium text-destructive">{empPayCurrency} {empDeductions.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Loan Transactions */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Loan Transactions</p>
                        {empLoans.length > 0 ? empLoans.map(loan => (
                          <div key={loan.id} className="bg-muted/50 rounded-lg px-3 py-2 text-sm space-y-1">
                            <div className="flex justify-between">
                              <span>Loan #{loan.id}</span>
                              <StatusBadge status={loan.status} />
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Total: {empPayCurrency} {loan.amount.toLocaleString()}</span>
                              <span>Remaining: {empPayCurrency} {loan.remainingBalance.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>Monthly Deduction</span>
                              <span className="font-medium text-destructive">{empPayCurrency} {loan.monthlyDeduction.toLocaleString()}</span>
                            </div>
                          </div>
                        )) : <p className="text-xs text-muted-foreground">No active loans.</p>}
                      </div>

                      {/* Expense Reimbursements */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expense Reimbursements</p>
                        {empExpenses.filter(e => !e.advanceId).length > 0 ? empExpenses.filter(e => !e.advanceId).map(exp => (
                          <div key={exp.id} className="bg-muted/50 rounded-lg px-3 py-2 text-sm space-y-1">
                            <div className="flex justify-between">
                              <span className="font-medium">{exp.description}</span>
                              <StatusBadge status={exp.status} />
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{exp.category} · {exp.submissionDate}</span>
                              <span className="font-medium text-foreground">
                                {exp.currency && exp.originalAmount ? `${exp.currency} ${exp.originalAmount.toLocaleString()} (${empPayCurrency} ${exp.amount.toLocaleString()})` : `${empPayCurrency} ${exp.amount.toLocaleString()}`}
                              </span>
                            </div>
                          </div>
                        )) : <p className="text-xs text-muted-foreground">No reimbursable expense claims.</p>}
                        {empExpenses.filter(e => e.advanceId).length > 0 && (
                          <div className="mt-2">
                            <p className="text-[10px] font-medium text-muted-foreground mb-1">Deducted from Advance (no payroll impact)</p>
                            {empExpenses.filter(e => e.advanceId).map(exp => (
                              <div key={exp.id} className="bg-muted/30 rounded-lg px-3 py-1.5 text-xs space-y-0.5 mb-1 opacity-70">
                                <div className="flex justify-between">
                                  <span>{exp.description}</span>
                                  <span className="font-medium">{empPayCurrency} {exp.amount.toLocaleString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Advances Given */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Advances Given</p>
                        {empAdvances.length > 0 ? empAdvances.map(adv => (
                          <div key={adv.id} className="bg-muted/50 rounded-lg px-3 py-2 text-sm space-y-1">
                            <div className="flex justify-between">
                              <span className="font-medium">{adv.advanceName}</span>
                              <span className="font-medium text-success">+{empPayCurrency} {adv.amount.toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{adv.purpose}</p>
                          </div>
                        )) : <p className="text-xs text-muted-foreground">No advances for this run.</p>}
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">One-Off Adjustments</p>
                        {sheetOneOffs.length > 0 && sheetOneOffs.map(adj => (
                          <div key={adj.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 text-sm">
                            <div>
                              <span className="font-medium">{adj.name}</span>
                              <span className={`ml-2 text-xs ${adj.type === "benefit" ? "text-success" : "text-destructive"}`}>
                                {adj.type === "benefit" ? "+" : "-"}{empPayCurrency} {adj.amount.toLocaleString()}
                              </span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveOneOff(adj.id)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      {/* Add new adjustment */}
                      <div className="space-y-3 border-t pt-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add Adjustment</p>
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Select value={newAdjType} onValueChange={(v) => setNewAdjType(v as "benefit" | "deduction")}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="benefit">One-Off Benefit (+)</SelectItem>
                              <SelectItem value="deduction">One-Off Deduction (-)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Input placeholder="e.g. Performance Bonus" value={newAdjName} onChange={e => setNewAdjName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Amount ({empPayCurrency})</Label>
                          <Input type="number" placeholder="0" value={newAdjAmount} onChange={e => setNewAdjAmount(e.target.value)} min={1} />
                        </div>
                        <Button className="w-full" onClick={handleAddOneOff} disabled={!newAdjName || !newAdjAmount}>
                          <Plus className="h-4 w-4 mr-2" />Add Adjustment
                        </Button>
                      </div>
                    </div>
                  </ScrollArea>
                </>
              );
            })()}
          </SheetContent>
        </Sheet>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{confirmAction?.action === "approve" ? "Complete Payroll" : "Reject Payroll"}</DialogTitle>
              <DialogDescription>{confirmAction?.action === "approve" ? "This will complete and lock this payroll run. A new payroll run for the next month will be created automatically. Continue?" : "This will reject and cancel this payroll run. Continue?"}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
              <Button variant={confirmAction?.action === "approve" ? "default" : "destructive"} onClick={handleConfirm}>
                {confirmAction?.action === "approve" ? "Process" : "Reject"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Leave Carryforward Dialog */}
        <Dialog open={carryforwardOpen} onOpenChange={setCarryforwardOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Year-End Leave Balance Carryforward</DialogTitle>
              <DialogDescription>
                Review and adjust carryforward days for each employee before completing the payroll. Carryforward values can be edited individually.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[450px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Employee</TableHead>
                    <TableHead className="font-semibold">Leave Type</TableHead>
                    <TableHead className="font-semibold text-right">Remaining</TableHead>
                    <TableHead className="font-semibold text-right">Max Allowed</TableHead>
                    <TableHead className="font-semibold text-right">Carryforward</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {carryforwardPreview.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No leave data available.</TableCell></TableRow>
                  ) : (
                    carryforwardPreview.map((item, i) => (
                      <TableRow key={`${item.employeeId}-${item.leaveTypeId}`} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{item.employeeName}</TableCell>
                        <TableCell>{item.leaveTypeName}</TableCell>
                        <TableCell className="text-right">{item.remaining}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{item.maxCarryforward}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={0}
                            max={item.remaining > 0 ? item.remaining : 0}
                            value={item.carryforward}
                            onChange={e => handleCarryforwardChange(i, Number(e.target.value))}
                            className="w-20 text-right ml-auto h-8"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setCarryforwardOpen(false); setPendingCompleteId(null); }}>Cancel</Button>
              <Button onClick={handleConfirmCarryforward}>Confirm & Complete Payroll</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Payroll Runs" description="Process and manage monthly payroll.">
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={() => setNewRunOpen(true)} disabled={hasOpenRun}>
          <Play className="h-4 w-4 mr-2" />New Payroll Run
        </Button>
      </PageHeader>

      {hasOpenRun && (
        <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-2">
          A payroll run is currently open. Complete or reject it before creating a new one.
        </div>
      )}

      <Tabs defaultValue="processing" className="space-y-4">
        <TabsList>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        {["processing", "completed"].map(tab => {
          const filtered = runs.filter(r => tab === "completed" ? r.status === "completed" : r.status !== "completed");
          return (
            <TabsContent key={tab} value={tab}>
              <div className="bg-card rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Period</TableHead>
                      <TableHead className="font-semibold">Employees</TableHead>
                      <TableHead className="font-semibold text-right">Gross ({REPORTING_CURRENCY})</TableHead>
                      <TableHead className="font-semibold text-right">Deductions ({REPORTING_CURRENCY})</TableHead>
                      <TableHead className="font-semibold text-right">Net ({REPORTING_CURRENCY})</TableHead>
                      <TableHead className="font-semibold">Run Date</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length > 0 ? filtered.map((run) => {
                      const liveBreakdown = run.status !== "completed"
                        ? buildBreakdown(employees, deductions, oneOffs[run.id] || [], getSepMap(run.id), processedSeps, run.id, approvedAdvances)
                        : null;
                      const dispCount = liveBreakdown ? liveBreakdown.length : run.employeeCount;
                      const dispGross = liveBreakdown
                        ? Math.round(liveBreakdown.reduce((s, l) => s + l.gross * getToReportingRate(l.payCurrency), 0))
                        : run.totalGross;
                      const dispDed = liveBreakdown
                        ? Math.round(liveBreakdown.reduce((s, l) => s + l.totalDeductions * getToReportingRate(l.payCurrency), 0))
                        : run.totalDeductions;
                      const dispNet = liveBreakdown
                        ? Math.round(liveBreakdown.reduce((s, l) => s + l.net * getToReportingRate(l.payCurrency), 0))
                        : run.totalNet;
                      return (
                        <TableRow key={run.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelectedRun(run)}>
                          <TableCell className="font-medium">{run.month} {run.year}</TableCell>
                          <TableCell>{dispCount}</TableCell>
                          <TableCell className="text-right">{dispGross.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-destructive">{dispDed.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-semibold">{dispNet.toLocaleString()}</TableCell>
                          <TableCell>{run.runDate || "—"}</TableCell>
                          <TableCell><StatusBadge status={run.status} /></TableCell>
                          <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedRun(run)}><Eye className="h-3.5 w-3.5" /></Button>
                              {run.status === "completed" && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownloadAccounting(run)}>
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {run.status === "completed" && (
                                <Lock className="h-3.5 w-3.5 text-muted-foreground ml-1 mt-2" />
                              )}
                              {(run.status === "processing" || run.status === "draft" || run.status === "failed") && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteRun(run.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    }) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          {tab === "completed" ? "No completed payroll runs yet." : "No processing payroll runs."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      <Dialog open={newRunOpen} onOpenChange={(open) => { setNewRunOpen(open); if (!open) { setNewRunStep(1); setNewRunPreview([]); setNewRunEmployeeType("all"); } }}>
        <DialogContent className={newRunStep === 2 ? "max-w-4xl" : ""}>
          <DialogHeader>
            <DialogTitle>{newRunStep === 1 ? "New Payroll Run — Step 1: Generate" : "Payroll Summary — Step 2: Review"}</DialogTitle>
            <DialogDescription>{newRunStep === 1 ? "Select payroll parameters to generate." : `Review the payroll for ${newMonth} ${newYear} before saving.`}</DialogDescription>
          </DialogHeader>
          {newRunStep === 1 ? (
            <form onSubmit={handleGeneratePayroll} className="space-y-4">
              <div className="space-y-2"><Label>Month</Label>
                <Select value={newMonth} onValueChange={setNewMonth}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Year</Label>
                <Select value={newYear} onValueChange={setNewYear}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="2025">2025</SelectItem><SelectItem value="2026">2026</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Employee Type</Label>
                <Select value={newRunEmployeeType} onValueChange={setNewRunEmployeeType}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {activeTypes.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <p><span className="text-muted-foreground">Employees:</span> <span className="font-medium">{newRunEmployeeType === "all" ? employees.length : employees.filter(e => e.category === newRunEmployeeType).length}</span></p>
                <p><span className="text-muted-foreground">Estimated Gross:</span> <span className="font-medium">{REPORTING_CURRENCY} {(newRunEmployeeType === "all" ? employees : employees.filter(e => e.category === newRunEmployeeType)).reduce((s, e) => s + e.salary, 0).toLocaleString()}</span></p>
              </div>
              <DialogFooter><Button type="button" variant="outline" onClick={() => setNewRunOpen(false)}>Cancel</Button><Button type="submit">Generate Payroll</Button></DialogFooter>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs">Employees</p>
                  <p className="font-bold text-lg">{newRunPreview.length}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs">Total Gross</p>
                  <p className="font-bold text-lg">{REPORTING_CURRENCY} {newRunPreview.reduce((s, l) => s + l.gross, 0).toLocaleString()}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs">Total Net Pay</p>
                  <p className="font-bold text-lg">{REPORTING_CURRENCY} {newRunPreview.reduce((s, l) => s + l.net, 0).toLocaleString()}</p>
                </div>
              </div>
              <ScrollArea className="h-[350px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Employee</TableHead>
                      <TableHead className="font-semibold">ID</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold text-right">Basic</TableHead>
                      <TableHead className="font-semibold text-right">Allowances</TableHead>
                      <TableHead className="font-semibold text-right">Deductions</TableHead>
                      <TableHead className="font-semibold text-right">Net Pay</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newRunPreview.map(({ emp, basic, allowances, totalDeductions, net }) => (
                      <TableRow key={emp.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{emp.firstName} {emp.lastName}</TableCell>
                        <TableCell className="text-xs font-mono">{emp.empId}</TableCell>
                        <TableCell className="text-xs">{getTypeName(emp.category)}</TableCell>
                        <TableCell className="text-right">{basic.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{allowances.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-destructive">{totalDeductions.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-semibold">{net.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              <DialogFooter className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setNewRunStep(1)}>Back</Button>
                <Button type="button" variant="secondary" onClick={() => handleSavePayroll(false)}>
                  Save (Pending)
                </Button>
                <Button type="button" className="gradient-ey text-primary-foreground font-semibold" onClick={() => handleSavePayroll(true)}>
                  Save & Disburse
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmAction?.action === "approve" ? "Complete Payroll" : "Reject Payroll"}</DialogTitle>
            <DialogDescription>{confirmAction?.action === "approve" ? "This will complete and lock this payroll run. A new run for the next month will open automatically. Continue?" : "This will reject and cancel this payroll run. Continue?"}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant={confirmAction?.action === "approve" ? "default" : "destructive"} onClick={handleConfirm}>
              {confirmAction?.action === "approve" ? "Complete" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Carryforward Dialog (list view) */}
      <Dialog open={carryforwardOpen} onOpenChange={setCarryforwardOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Year-End Leave Balance Carryforward</DialogTitle>
            <DialogDescription>
              Review and adjust carryforward days for each employee before completing the payroll. Carryforward values can be edited individually.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[450px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Employee</TableHead>
                  <TableHead className="font-semibold">Leave Type</TableHead>
                  <TableHead className="font-semibold text-right">Remaining</TableHead>
                  <TableHead className="font-semibold text-right">Max Allowed</TableHead>
                  <TableHead className="font-semibold text-right">Carryforward</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carryforwardPreview.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No leave data available.</TableCell></TableRow>
                ) : (
                  carryforwardPreview.map((item, i) => (
                    <TableRow key={`${item.employeeId}-${item.leaveTypeId}`} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{item.employeeName}</TableCell>
                      <TableCell>{item.leaveTypeName}</TableCell>
                      <TableCell className="text-right">{item.remaining}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{item.maxCarryforward}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          max={item.remaining > 0 ? item.remaining : 0}
                          value={item.carryforward}
                          onChange={e => handleCarryforwardChange(i, Number(e.target.value))}
                          className="w-20 text-right ml-auto h-8"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCarryforwardOpen(false); setPendingCompleteId(null); }}>Cancel</Button>
            <Button onClick={handleConfirmCarryforward}>Confirm & Complete Payroll</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
