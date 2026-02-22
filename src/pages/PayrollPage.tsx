import React, { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { payrollRuns, employees, loans, expenses } from "@/data/mockData";
import { PayrollRun, OneOffAdjustment } from "@/types/hcm";
import { defaultCountryCurrencyMappings, defaultExchangeRates } from "@/data/settingsData";
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

const REPORTING_CURRENCY = "SAR";

function getEmployeePayCurrency(workLocationCountry: string): string {
  const mapping = defaultCountryCurrencyMappings.find(m => m.country === workLocationCountry);
  return mapping?.currencyCode || REPORTING_CURRENCY;
}

function getToReportingRate(fromCurrency: string): number {
  if (fromCurrency === REPORTING_CURRENCY) return 1;
  return defaultExchangeRates.find(r => r.fromCurrency === fromCurrency)?.toReportingRate || 1;
}

interface EmployeePayrollLine {
  emp: typeof employees[0];
  basic: number;
  allowances: number;
  gross: number;
  loanDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  expenseReimbursement: number;
  oneOffBenefits: number;
  oneOffDeductions: number;
  separationSettlement: number;
  isSeparated: boolean;
  net: number;
  payCurrency: string;
}

function buildBreakdown(oneOffs: OneOffAdjustment[], separationMap: Record<string, number>, processedSepIds: Set<string>, runId?: string): EmployeePayrollLine[] {
  const activeEmployees = employees.filter(emp => {
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
    const otherDeductions = Math.round(gross * 0.15);
    const approvedExpenses = expenses
      .filter(e => e.employeeId === emp.id && e.status === "approved" && e.payrollRunId === runId)
      .reduce((s, e) => s + e.amount, 0);
    const empOneOffs = oneOffs.filter(o => o.employeeId === emp.id);
    const oneOffBenefits = empOneOffs.filter(o => o.type === "benefit").reduce((s, o) => s + o.amount, 0);
    const oneOffDeductions = empOneOffs.filter(o => o.type === "deduction").reduce((s, o) => s + o.amount, 0);
    const separationSettlement = separationMap[emp.id] || 0;
    const isSeparated = !!separationMap[emp.id];
    const totalDeductions = otherDeductions + loanDeduction + oneOffDeductions;
    const net = gross - totalDeductions + approvedExpenses + oneOffBenefits + separationSettlement;
    const payCurrency = getEmployeePayCurrency(emp.workLocationCountry);
    return { emp, basic, allowances, gross, loanDeduction, otherDeductions, totalDeductions, expenseReimbursement: approvedExpenses, oneOffBenefits, oneOffDeductions, separationSettlement, isSeparated, net, payCurrency };
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

  lines.forEach(({ emp, basic, allowances, loanDeduction, otherDeductions, expenseReimbursement, net, payCurrency }) => {
    const name = `${emp.firstName} ${emp.lastName}`;
    const rate = getToReportingRate(payCurrency);
    const rptAmt = (amt: number) => payCurrency !== REPORTING_CURRENCY ? Math.round(amt * rate).toString() : "";
    rows.push(`${date},${glMap["Basic Salary"] || ""},Basic Salary,${payCurrency},${basic},0,${rptAmt(basic)},${name},${run.month} ${run.year}`);
    if (allowances > 0) rows.push(`${date},${glMap["Housing Allowance"] || ""},Allowances,${payCurrency},${allowances},0,${rptAmt(allowances)},${name},${run.month} ${run.year}`);
    if (otherDeductions > 0) rows.push(`${date},${glMap["GOSI (Employee)"] || ""},Statutory Deductions,${payCurrency},0,${otherDeductions},${rptAmt(otherDeductions)},${name},${run.month} ${run.year}`);
    if (loanDeduction > 0) rows.push(`${date},${glMap["Loan Deduction"] || ""},Loan Deduction,${payCurrency},0,${loanDeduction},${rptAmt(loanDeduction)},${name},${run.month} ${run.year}`);
    if (expenseReimbursement > 0) rows.push(`${date},${glMap["Expense Reimbursement"] || ""},Expense Reimbursement,${payCurrency},${expenseReimbursement},0,${rptAmt(expenseReimbursement)},${name},${run.month} ${run.year}`);
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
  const [newRunOpen, setNewRunOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: "approve" | "reject" } | null>(null);
  const [newMonth, setNewMonth] = useState("April");
  const [newYear, setNewYear] = useState("2025");
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

  const handleNewRun = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasOpenRun) {
      toast({ title: "Cannot Create", description: "Complete the current payroll run before creating a new one.", variant: "destructive" });
      return;
    }
    const breakdown = buildBreakdown([], {}, processedSeps);
    const totalGross = breakdown.reduce((s, l) => s + l.gross, 0);
    const totalDed = breakdown.reduce((s, l) => s + l.totalDeductions, 0);
    const newRun: PayrollRun = {
      id: String(Date.now()), month: newMonth, year: Number(newYear), status: "processing",
      totalGross, totalDeductions: totalDed, totalNet: totalGross - totalDed,
      runDate: "", employeeCount: employees.length,
    };
    syncRuns(prev => [...prev, newRun]);
    setNewRunOpen(false);
    toast({ title: "Payroll Run Created", description: `${newMonth} ${newYear} payroll run is now open for processing.` });
  };

  const handleProcess = (id: string) => {
    syncRuns(prev => prev.map(r => r.id === id ? { ...r, status: "processing" as const } : r));
    toast({ title: "Processing", description: "Payroll run is now open for processing." });
  };

  const handleComplete = (id: string) => {
    const run = runs.find(r => r.id === id);
    if (!run) return;

    const currentSepMap = getSepMap(run.id);
    const currentBreakdown = buildBreakdown(oneOffs[run.id] || [], currentSepMap, processedSeps, run.id);
    const runEmployeeCount = currentBreakdown.length;
    const runGross = currentBreakdown.reduce((s, l) => s + l.gross, 0);
    const runDed = currentBreakdown.reduce((s, l) => s + l.totalDeductions, 0);

    syncRuns(prev => prev.map(r => r.id === id ? {
      ...r, status: "completed" as const, runDate: new Date().toISOString().split("T")[0],
      employeeCount: runEmployeeCount, totalGross: runGross, totalDeductions: runDed, totalNet: runGross - runDed,
    } : r));

    expenses.forEach(exp => {
      if (exp.status === "approved" && !exp.payrollRunId) {
        exp.payrollRunId = id;
      }
    });

    const sepMap = getSepMap(run.id);
    const updatedProcessedSeps = new Set(processedSeps);
    Object.keys(sepMap).forEach(empId => updatedProcessedSeps.add(empId));
    setProcessedSeps(updatedProcessedSeps);

    const next = getNextMonth(run.month, run.year);
    const breakdown = buildBreakdown([], {}, updatedProcessedSeps);
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

  const handleConfirm = () => {
    if (!confirmAction) return;
    if (confirmAction.action === "approve") {
      handleComplete(confirmAction.id);
    } else {
      syncRuns(prev => prev.map(r => r.id === confirmAction.id ? { ...r, status: "failed" as const } : r));
      toast({ title: "Rejected", description: "Payroll run has been rejected." });
    }
    setConfirmOpen(false);
    setConfirmAction(null);
  };

  const handleDownloadAccounting = (run: PayrollRun) => {
    const breakdown = buildBreakdown(oneOffs[run.id] || [], getSepMap(run.id), processedSeps, run.id);
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
    const breakdown = buildBreakdown(currentOneOffs, sepMap, isLocked ? new Set() : processedSeps, selectedRun.id);
    const totalLoan = breakdown.reduce((s, l) => s + l.loanDeduction, 0);
    const totalExpense = breakdown.reduce((s, l) => s + l.expenseReimbursement, 0);
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

    // Group by country
    const countryGroups = new Map<string, EmployeePayrollLine[]>();
    filteredBreakdown.forEach(line => {
      const country = line.emp.workLocationCountry;
      if (!countryGroups.has(country)) countryGroups.set(country, []);
      countryGroups.get(country)!.push(line);
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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-4">
          <StatCard title="Employees" value={breakdown.length} icon={Users} variant="info" />
          <StatCard title={`Total Gross (${REPORTING_CURRENCY})`} value={`${REPORTING_CURRENCY} ${rptGross.toLocaleString()}`} icon={DollarSign} variant="primary" />
          <StatCard title={`Deductions (${REPORTING_CURRENCY})`} value={`${REPORTING_CURRENCY} ${rptDeductions.toLocaleString()}`} icon={TrendingDown} variant="warning" />
          <StatCard title={`Loan Ded. (${REPORTING_CURRENCY})`} value={`${REPORTING_CURRENCY} ${rptLoan.toLocaleString()}`} icon={TrendingDown} variant="warning" />
          <StatCard title={`Expense Reimb. (${REPORTING_CURRENCY})`} value={`${REPORTING_CURRENCY} ${rptExpense.toLocaleString()}`} icon={DollarSign} variant="success" />
          <StatCard title={`One-Off + (${REPORTING_CURRENCY})`} value={`${REPORTING_CURRENCY} ${rptOneOffBen.toLocaleString()}`} icon={DollarSign} variant="success" />
          <StatCard title={`One-Off - (${REPORTING_CURRENCY})`} value={`${REPORTING_CURRENCY} ${rptOneOffDed.toLocaleString()}`} icon={TrendingDown} variant="warning" />
          {rptSepSettlement > 0 && <StatCard title={`Separation EOS (${REPORTING_CURRENCY})`} value={`${REPORTING_CURRENCY} ${rptSepSettlement.toLocaleString()}`} icon={DollarSign} variant="primary" />}
          <StatCard title={`Total Net (${REPORTING_CURRENCY})`} value={`${REPORTING_CURRENCY} ${rptNet.toLocaleString()}`} icon={DollarSign} variant="success" />
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
                  <TableHead className="font-semibold text-right">One-Off +/-</TableHead>
                  <TableHead className="font-semibold text-right">EOS Settlement</TableHead>
                  <TableHead className="font-semibold text-right">Net Pay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from(countryGroups.entries()).map(([country, lines]) => {
                  const countryCurrency = lines[0]?.payCurrency || REPORTING_CURRENCY;
                  const subtotalGross = lines.reduce((s, l) => s + l.gross, 0);
                  const subtotalDeductions = lines.reduce((s, l) => s + l.totalDeductions, 0);
                  const subtotalNet = lines.reduce((s, l) => s + l.net, 0);

                  return (
                    <React.Fragment key={country}>
                      {/* Country header */}
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={12} className="py-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {country} ({lines.length} employee{lines.length > 1 ? "s" : ""}) — Pay Currency: {countryCurrency}
                          </span>
                        </TableCell>
                      </TableRow>
                      {lines.map(({ emp, basic, allowances, gross, otherDeductions, loanDeduction, expenseReimbursement, oneOffBenefits, oneOffDeductions, separationSettlement, isSeparated, net, payCurrency }) => (
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
                        </TableRow>
                      ))}
                      {/* Country subtotal */}
                      <TableRow className="bg-muted/20 border-b-2">
                        <TableCell colSpan={3} className="text-right text-xs font-bold text-muted-foreground">Subtotal {countryCurrency}</TableCell>
                        <TableCell colSpan={2} />
                        <TableCell className="text-right font-bold text-xs">{subtotalGross.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold text-xs text-destructive">{subtotalDeductions.toLocaleString()}</TableCell>
                        <TableCell colSpan={4} />
                        <TableCell className="text-right font-bold text-xs">{subtotalNet.toLocaleString()}</TableCell>
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
                  <TableCell colSpan={4} />
                  <TableCell className="text-right text-sm">{rptNet.toLocaleString()}</TableCell>
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
              const empDeductions = Math.round(sheetEmp.salary * 0.15);
              const empPayCurrency = getEmployeePayCurrency(sheetEmp.workLocationCountry);
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
                        {empExpenses.length > 0 ? empExpenses.map(exp => (
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
                        )) : <p className="text-xs text-muted-foreground">No expense claims.</p>}
                      </div>

                      {/* One-Off Adjustments */}
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
                        ? buildBreakdown(oneOffs[run.id] || [], getSepMap(run.id), processedSeps, run.id)
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

      <Dialog open={newRunOpen} onOpenChange={setNewRunOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Payroll Run</DialogTitle><DialogDescription>Create a new monthly payroll run.</DialogDescription></DialogHeader>
          <form onSubmit={handleNewRun} className="space-y-4">
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
            <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
              <p><span className="text-muted-foreground">Employees:</span> <span className="font-medium">{employees.length}</span></p>
              <p><span className="text-muted-foreground">Estimated Gross:</span> <span className="font-medium">{REPORTING_CURRENCY} {employees.reduce((s, e) => s + e.salary, 0).toLocaleString()}</span></p>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setNewRunOpen(false)}>Cancel</Button><Button type="submit">Create Run</Button></DialogFooter>
          </form>
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
    </div>
  );
}
