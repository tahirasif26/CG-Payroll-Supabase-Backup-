import React, { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { useEffect } from "react";
import { useLoans } from "@/hooks/queries/useLoans";
import { useExpenses } from "@/hooks/queries/useExpenses";
import { usePayrollRuns, type PayrollRunRow } from "@/hooks/queries/usePayroll";
import { useGLMappings } from "@/hooks/queries/useGLMappings";

// Tax configs are now sourced from PayrollSetup.taxRules per run; the legacy
// global TaxConfig[] path is unused so we default it to empty.
const initialTaxConfigs: any[] = [];

// Module-level refs hydrated by the PayrollPage component via React Query.
// The breakdown helper functions read from these so we don't have to change
// their signatures or thread the data through every call-site.
let loans: any[] = [];
let expenses: any[] = [];

function adaptPayrollRun(r: PayrollRunRow): PayrollRun {
  return {
    id: r.id,
    month: r.month,
    year: r.year,
    status: (r.status as PayrollRun["status"]) ?? "draft",
    totalGross: Number(r.total_gross) || 0,
    totalDeductions: Number(r.total_deductions) || 0,
    totalNet: Number(r.total_net) || 0,
    runDate: r.run_date,
    employeeCount: r.employee_count ?? 0,
    payrollSetupId: r.payroll_setup_id ?? undefined,
  };
}
import { useEmployees } from "@/contexts/EmployeeContext";
import { PayrollRun, OneOffAdjustment, Employee, Deduction, TaxConfig } from "@/types/hcm";
import { useEmployeeTypes } from "@/contexts/EmployeeTypeContext";
import { defaultExchangeRates } from "@/data/settingsData";
import { useAdvances } from "@/contexts/AdvanceContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSeparations } from "@/contexts/SeparationContext";
import { Button } from "@/components/ui/button";
import { Play, Eye, CheckCircle2, XCircle, ArrowLeft, Download, Search, Plus, X, Lock, Trash2, ChevronsUpDown, Check, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useCanApprove } from "@/hooks/useCanApprove";
import { useRole } from "@/contexts/RoleContext";
import { usePayrollSetups } from "@/contexts/PayrollSetupContext";

import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

const REPORTING_CURRENCY = "SAR";

function getDaysUntil(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
}

function LivePayrollCard({
  run,
  setupName,
  currency,
  onProcess,
}: {
  run: PayrollRunRow;
  setupName: string;
  currency: string;
  onProcess: (run: PayrollRunRow) => void;
}) {
  const daysLeft = getDaysUntil(run.run_date);
  const isUrgent = daysLeft <= 3;
  return (
    <Card className={`border-2 ${isUrgent ? "border-destructive/50 bg-destructive/5" : "border-primary/30 bg-primary/5"}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-sm font-semibold">{setupName}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{currency} · {run.month} {run.year}</p>
          </div>
          <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">● Live</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3">
          <p className={`text-3xl font-bold ${isUrgent ? "text-destructive" : "text-primary"}`}>{daysLeft}</p>
          <p className="text-xs text-muted-foreground">
            days until pay date ({run.run_date ? new Date(run.run_date).toLocaleDateString() : "—"})
          </p>
        </div>
        <Button size="sm" className="w-full" variant={isUrgent ? "destructive" : "default"} onClick={() => onProcess(run)}>
          Process Payroll
        </Button>
      </CardContent>
    </Card>
  );
}

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

import { PayrollSetup } from "@/types/payrollSetup";

function buildBreakdown(allEmployees: Employee[], allDeductions: Deduction[], allTaxConfigs: TaxConfig[], oneOffs: OneOffAdjustment[], separationMap: Record<string, number>, processedSepIds: Set<string>, runId?: string, advancesData?: { employeeId: string; amount: number; payrollRunId?: string }[]): EmployeePayrollLine[] {
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
      if (d.appliesTo && d.appliesTo.length > 0 && !d.appliesTo.includes(emp.category)) return false;
      if (d.appliesToCountries && d.appliesToCountries.length > 0 && !d.appliesToCountries.includes(emp.workLocationCountry)) return false;
      return true;
    });
    const otherDeductions = applicableDeductions.reduce((sum, d) => {
      if (d.percentage) return sum + Math.round(gross * d.percentage / 100);
      if (d.fixedAmount) return sum + d.fixedAmount;
      return sum;
    }, 0);
    const applicableTaxes = allTaxConfigs.filter(t => {
      if (!t.isActive) return false;
      if (t.appliesTo && t.appliesTo.length > 0 && !t.appliesTo.includes(emp.category)) return false;
      if (t.appliesToCountries && t.appliesToCountries.length > 0 && !t.appliesToCountries.includes(emp.workLocationCountry)) return false;
      return true;
    });
    const taxDeductions = applicableTaxes.reduce((sum, t) => sum + Math.round(gross * t.rate / 100), 0);
    const approvedExpenses = expenses
      .filter(e => e.employeeId === emp.id && e.status === "approved" && e.payrollRunId === runId && !e.advanceId)
      .reduce((s, e) => s + e.amount, 0);
    const advanceGiven = (advancesData || [])
      .filter(a => a.employeeId === emp.id && a.payrollRunId === runId)
      .reduce((s, a) => s + a.amount, 0);
    const empOneOffs = oneOffs.filter(o => o.employeeId === emp.id);
    const oneOffBenefits = empOneOffs.filter(o => o.type === "benefit").reduce((s, o) => s + o.amount, 0);
    const oneOffDeductions = empOneOffs.filter(o => o.type === "deduction").reduce((s, o) => s + o.amount, 0);
    const separationSettlement = separationMap[emp.id] || 0;
    const isSeparated = !!separationMap[emp.id];
    const totalDeductions = otherDeductions + taxDeductions + loanDeduction + oneOffDeductions;
    const net = gross - totalDeductions + approvedExpenses + advanceGiven + oneOffBenefits + separationSettlement;
    const payCurrency = getEmployeePayCurrency(emp);
    return { emp, basic, allowances, gross, loanDeduction, otherDeductions: otherDeductions + taxDeductions, totalDeductions, expenseReimbursement: approvedExpenses, advanceGiven, oneOffBenefits, oneOffDeductions, separationSettlement, isSeparated, net, payCurrency };
  });
}

function buildBreakdownFromSetup(allEmployees: Employee[], setup: PayrollSetup | undefined, oneOffs: OneOffAdjustment[], separationMap: Record<string, number>, processedSepIds: Set<string>, runId?: string, advancesData?: { employeeId: string; amount: number; payrollRunId?: string }[]): EmployeePayrollLine[] {
  const activeEmployees = allEmployees.filter(emp => !processedSepIds.has(emp.id));
  const isBasicComp = (c: any) => c.id === "comp-basic-salary" || (c.name || "").toLowerCase() === "basic salary";
  return activeEmployees.map(emp => {
    // emp.salary represents the Basic Salary. Earning components from the
    // setup are ADDED on top of basic to form the gross. Deductions and tax
    // are computed against basic (matching AddEmployeeWizard).
    const basic = emp.salary;
    const activeEarnings = setup?.payslipComponents.filter(c => c.type === "earning" && c.status === "active" && !isBasicComp(c)) || [];
    const activeDeductionComponents = setup?.payslipComponents.filter(c => c.type === "deduction" && c.status === "active") || [];

    let allowances = 0;
    activeEarnings.forEach(comp => {
      allowances += comp.calculationType === "percentage" ? Math.round(basic * comp.value / 100) : comp.value;
    });
    const gross = basic + allowances;

    // Loan deduction
    const activeLoan = loans.find(l => l.employeeId === emp.id && l.status === "active");
    const loanDeduction = activeLoan ? activeLoan.monthlyDeduction : 0;

    // Deductions from setup components — % is of basic
    let setupDeductions = 0;
    activeDeductionComponents.forEach(comp => {
      setupDeductions += comp.calculationType === "percentage" ? Math.round(basic * comp.value / 100) : comp.value;
    });

    // Tax from setup's taxRules
    let taxDeductions = 0;
    if (setup?.options.enableTaxCalculation && setup.taxRules.length > 0) {
      const taxBase = (setup as any).taxBasis === "basic" ? basic : gross;
      const annualBase = taxBase * 12;
      setup.taxRules.forEach(slab => {
        if (annualBase > slab.incomeFrom) {
          const taxableInSlab = Math.min(annualBase, slab.incomeTo) - slab.incomeFrom;
          if (taxableInSlab > 0) {
            taxDeductions += Math.round((taxableInSlab * slab.percentage / 100) / 12);
          }
        }
      });
    }

    // Auto deductions from setup
    let autoDeductions = 0;
    if (setup?.autoDeductions.latePenaltyEnabled) {
      // Applied per occurrence — skip for now (no attendance data)
    }
    setup?.autoDeductions.customRules.forEach(rule => {
      if (rule.enabled) autoDeductions += rule.amount;
    });

    // Expenses
    const approvedExpenses = expenses
      .filter(e => e.employeeId === emp.id && e.status === "approved" && e.payrollRunId === runId && !e.advanceId)
      .reduce((s, e) => s + e.amount, 0);

    const advanceGiven = (advancesData || [])
      .filter(a => a.employeeId === emp.id && a.payrollRunId === runId)
      .reduce((s, a) => s + a.amount, 0);

    const empOneOffs = oneOffs.filter(o => o.employeeId === emp.id);
    const oneOffBenefits = empOneOffs.filter(o => o.type === "benefit").reduce((s, o) => s + o.amount, 0);
    const oneOffDeductions = empOneOffs.filter(o => o.type === "deduction").reduce((s, o) => s + o.amount, 0);
    const separationSettlement = separationMap[emp.id] || 0;
    const isSeparated = !!separationMap[emp.id];
    const otherDeductions = setupDeductions + taxDeductions + autoDeductions;
    const totalDeductions = otherDeductions + loanDeduction + oneOffDeductions;
    const net = gross - totalDeductions + approvedExpenses + advanceGiven + oneOffBenefits + separationSettlement;
    const payCurrency = getEmployeePayCurrency(emp);
    return { emp, basic, allowances, gross, loanDeduction, otherDeductions, totalDeductions, expenseReimbursement: approvedExpenses, advanceGiven, oneOffBenefits, oneOffDeductions, separationSettlement, isSeparated, net, payCurrency };
  });
}

function generateAccountingCSV(
  run: PayrollRun,
  lines: EmployeePayrollLine[],
  glMappings: Array<{ entry_name: string; gl_code: string }> = []
): string {
  const glMap: Record<string, string> = {};
  glMappings.forEach((m) => { glMap[m.entry_name] = m.gl_code; });


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
  const { activeTypes, getTypeName } = useEmployeeTypes();
  const canApprovePayroll = useCanApprove("payroll");
  const { currentEmployeeId, clientId } = useRole();
  const queryClient = useQueryClient();
  const { advances } = useAdvances();
  const { setups, getSetupById } = usePayrollSetups();
  const activeSetups = setups.filter(s => s.status === "active");
  const approvedAdvances = advances.filter(a => a.status === "approved").map(a => ({ employeeId: a.employeeId, amount: a.amount, payrollRunId: a.payrollRunId }));
  const { data: dbRuns = [] } = usePayrollRuns();
  const { data: glMappings = [] } = useGLMappings();

  // Hydrate module-level loans/expenses caches from real DB queries so the
  // breakdown helpers (which run outside React) see live data.
  const { data: dbLoans = [] } = useLoans();
  const { data: dbExpenses = [] } = useExpenses();
  useEffect(() => {
    loans = (dbLoans as any[]).map(l => ({
      id: l.id,
      employeeId: l.employee_id,
      status: l.status,
      monthlyDeduction: Number(l.monthly_deduction) || 0,
      remainingBalance: Number(l.remaining_balance) || 0,
    }));
  }, [dbLoans]);
  useEffect(() => {
    expenses = (dbExpenses as any[]).map(e => ({
      id: e.id,
      employeeId: e.employee_id,
      status: e.status,
      amount: Number(e.amount) || 0,
      payrollRunId: e.payroll_run_id ?? undefined,
      advanceId: e.advance_id ?? undefined,
    }));
  }, [dbExpenses]);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  // Keep local `runs` state continuously in sync with the DB so newly-created
  // draft runs (one per payroll setup) appear immediately in the Processing tab.
  React.useEffect(() => {
    setRuns(prev => {
      const dbAdapted = dbRuns.map(adaptPayrollRun);
      const dbIds = new Set(dbAdapted.map(r => r.id));
      // Preserve any local-only runs (e.g. just-created in-memory) that haven't
      // been persisted yet, then layer DB runs on top as the source of truth.
      const localOnly = prev.filter(r => !dbIds.has(r.id));
      return [...dbAdapted, ...localOnly];
    });
  }, [dbRuns]);

  // Ensure every ACTIVE payroll setup has at least one open (non-completed)
  // payroll run. If a setup has no open run, auto-create a draft for the
  // current month so it shows up in the Processing tab + Live cards.
  const autoCreateAttemptedRef = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    if (!clientId || activeSetups.length === 0) return;
    const openSetupIds = new Set(
      dbRuns
        .filter(r => r.status !== "completed" && r.status !== "failed" && r.payroll_setup_id)
        .map(r => r.payroll_setup_id as string)
    );
    const missing = activeSetups.filter(s => !openSetupIds.has(s.id) && !autoCreateAttemptedRef.current.has(s.id));
    if (missing.length === 0) return;
    void (async () => {
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
      ];
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;
      const now = new Date();
      for (const setup of missing) {
        autoCreateAttemptedRef.current.add(setup.id);
        try {
          const payDate = parseInt(setup.paySchedule?.payDate ?? "25", 10) || 25;
          const advance = now.getDate() > payDate;
          const targetIdx = advance ? (now.getMonth() + 1) % 12 : now.getMonth();
          const targetYear = advance && now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
          await supabase.from("payroll_runs").insert({
            client_id: clientId,
            payroll_setup_id: setup.id,
            month: monthNames[targetIdx],
            year: targetYear,
            run_date: `${targetYear}-${String(targetIdx + 1).padStart(2, "0")}-${String(payDate).padStart(2, "0")}`,
            status: "draft",
            created_by: user.id,
          });
        } catch {
          // Non-fatal — user can still create runs manually.
        }
      }
      queryClient.invalidateQueries({ queryKey: ["payroll_runs"] });
    })();
  }, [activeSetups, dbRuns, clientId, queryClient]);

  const syncRuns = (updater: (prev: PayrollRun[]) => PayrollRun[]) => {
    setRuns(updater);
  };
  const { client } = useClient();
  const { separations } = useSeparations();
  const activeEmps = useActiveEmployees();
  const { leaveTypes, balances, initializeBalances, runYearEndCarryforward, completedRollovers } = useLeaveTypes();
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: "approve" | "reject" } | null>(null);
  const [carryforwardOpen, setCarryforwardOpen] = useState(false);
  const [carryforwardPreview, setCarryforwardPreview] = useState<{ employeeId: string; employeeName: string; leaveTypeId: string; leaveTypeName: string; remaining: number; maxCarryforward: number; carryforward: number }[]>([]);
  const [pendingCompleteId, setPendingCompleteId] = useState<string | null>(null);
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
    const completedRunIds = new Set(runs.filter(r => r.status === "completed").map(r => r.id));
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

  const getOpenRunSetups = (): Set<string> => {
    const setupIds = new Set<string>();
    runs.filter(r => r.status === "draft" || r.status === "processing").forEach(r => {
      if (r.payrollSetupId) setupIds.add(r.payrollSetupId);
    });
    return setupIds;
  };

  const handleProcess = (id: string) => {
    syncRuns(prev => prev.map(r => r.id === id ? { ...r, status: "processing" as const } : r));
    toast({ title: "Processing", description: "Payroll run is now open for processing." });
  };

  const handleComplete = (id: string) => {
    if (!canApprovePayroll) {
      toast({ title: "Not Authorized", description: "Completing payroll requires Payroll approval permissions.", variant: "destructive" });
      return;
    }
    const run = runs.find(r => r.id === id);
    if (!run) return;

    const currentSepMap = getSepMap(run.id);
    const runFilteredEmps = run.payrollSetupId ? employees.filter(e => e.payrollSetupId === run.payrollSetupId) : (run.employeeTypes && run.employeeTypes.length > 0 ? employees.filter(e => run.employeeTypes!.includes(e.category)) : employees);
    const runSetup = run.payrollSetupId ? getSetupById(run.payrollSetupId) : undefined;
    const currentBreakdown = runSetup ? buildBreakdownFromSetup(runFilteredEmps, runSetup, oneOffs[run.id] || [], currentSepMap, processedSeps, run.id, approvedAdvances) : buildBreakdown(runFilteredEmps, [] as Deduction[], initialTaxConfigs, oneOffs[run.id] || [], currentSepMap, processedSeps, run.id, approvedAdvances);
    const runEmployeeCount = currentBreakdown.length;
    const runGross = currentBreakdown.reduce((s, l) => s + l.gross, 0);
    const runDed = currentBreakdown.reduce((s, l) => s + l.totalDeductions, 0);

    const completedDate = new Date().toISOString().split("T")[0];
    syncRuns(prev => prev.map(r => r.id === id ? {
      ...r, status: "completed" as const, runDate: completedDate,
      employeeCount: runEmployeeCount, totalGross: runGross, totalDeductions: runDed, totalNet: runGross - runDed,
    } : r));

    // Persist completion to DB so it survives reloads and frees the setup for the next run.
    void (async () => {
      try {
        await supabase.from("payroll_runs").update({
          status: "completed",
          run_date: completedDate,
          completed_at: new Date().toISOString(),
          employee_count: runEmployeeCount,
          total_gross: runGross,
          total_deductions: runDed,
          total_net: runGross - runDed,
        }).eq("id", id);
        queryClient.invalidateQueries({ queryKey: ["payroll_runs"] });
      } catch {
        // Non-fatal — UI already reflects completion locally.
      }
    })();

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


    const setupName = run.payrollSetupId ? (getSetupById(run.payrollSetupId)?.name || "Unknown") : (run.employeeTypes?.map(t => getTypeName(t)).join(", ") || "all");
    toast({ title: "Payroll Completed", description: `${run.month} ${run.year} payroll for ${setupName} is locked.` });
    setSelectedRun(null);

    // Auto-create the next month's draft run for this setup so the live cards
    // pipeline keeps rolling forward.
    void (async () => {
      try {
        if (!run.payrollSetupId || !clientId) return;
        const setup = getSetupById(run.payrollSetupId);
        if (!setup) return;
        const monthNames = [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December",
        ];
        const curIdx = monthNames.indexOf(run.month);
        const baseIdx = curIdx >= 0 ? curIdx : new Date().getMonth();
        const nextIdx = (baseIdx + 1) % 12;
        const nextYear = baseIdx === 11 ? run.year + 1 : run.year;
        const payDate = parseInt(setup.paySchedule?.payDate ?? "25", 10) || 25;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) return;
        await supabase.from("payroll_runs").insert({
          client_id: clientId,
          payroll_setup_id: setup.id,
          month: monthNames[nextIdx],
          year: nextYear,
          run_date: `${nextYear}-${String(nextIdx + 1).padStart(2, "0")}-${String(payDate).padStart(2, "0")}`,
          status: "draft",
          created_by: user.id,
        });
        queryClient.invalidateQueries({ queryKey: ["payroll_runs"] });
      } catch {
        // Non-fatal: next run can be added manually if this fails.
      }
    })();
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
    const runFilteredEmps = run.payrollSetupId ? employees.filter(e => e.payrollSetupId === run.payrollSetupId) : (run.employeeTypes && run.employeeTypes.length > 0 ? employees.filter(e => run.employeeTypes!.includes(e.category)) : employees);
    const runSetup = run.payrollSetupId ? getSetupById(run.payrollSetupId) : undefined;
    const breakdown = runSetup ? buildBreakdownFromSetup(runFilteredEmps, runSetup, oneOffs[run.id] || [], getSepMap(run.id), processedSeps, run.id, approvedAdvances) : buildBreakdown(runFilteredEmps, [] as Deduction[], initialTaxConfigs, oneOffs[run.id] || [], getSepMap(run.id), processedSeps, run.id, approvedAdvances);
    const csv = generateAccountingCSV(run, breakdown, glMappings);
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
    const runFilteredEmps = selectedRun.payrollSetupId ? employees.filter(e => e.payrollSetupId === selectedRun.payrollSetupId) : (selectedRun.employeeTypes && selectedRun.employeeTypes.length > 0 ? employees.filter(e => selectedRun.employeeTypes!.includes(e.category)) : employees);
    const runSetup = selectedRun.payrollSetupId ? getSetupById(selectedRun.payrollSetupId) : undefined;
    const breakdown = runSetup ? buildBreakdownFromSetup(runFilteredEmps, runSetup, currentOneOffs, sepMap, isLocked ? new Set() : processedSeps, selectedRun.id, approvedAdvances) : buildBreakdown(runFilteredEmps, [] as Deduction[], initialTaxConfigs, currentOneOffs, sepMap, isLocked ? new Set() : processedSeps, selectedRun.id, approvedAdvances);
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

        {(selectedRun.status === "draft" || selectedRun.status === "processing") && (
          <div className="flex gap-2">
            {selectedRun.status === "draft" && (
              <Button variant="outline" onClick={() => handleProcess(selectedRun.id)}>
                Start Processing
              </Button>
            )}
            <Button className="gradient-ey text-primary-foreground font-semibold" onClick={() => { setConfirmAction({ id: selectedRun.id, action: "approve" }); setConfirmOpen(true); }}>
              <CheckCircle2 className="h-4 w-4 mr-2" />Run & Complete Payroll
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
              <DialogDescription>{confirmAction?.action === "approve" ? "This will complete and lock this payroll run. Continue?" : "This will reject and cancel this payroll run. Continue?"}</DialogDescription>
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
      <PageHeader title="Payroll Runs" description="Process and manage monthly payroll." />

      {(() => {
        const unassignedEmps = activeEmps.filter(e => !e.payrollSetupId);
        if (unassignedEmps.length > 0) return (
          <div className="flex items-center gap-2 bg-destructive/10 text-destructive rounded-lg px-4 py-2 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span><strong>{unassignedEmps.length} employee{unassignedEmps.length > 1 ? "s" : ""}</strong> not assigned to any payroll setup: {unassignedEmps.slice(0, 3).map(e => `${e.firstName} ${e.lastName}`).join(", ")}{unassignedEmps.length > 3 ? ` and ${unassignedEmps.length - 3} more` : ""}. They won't be included in payroll runs.</span>
          </div>
        );
        return null;
      })()}

      {/* Live Payrolls — auto-created, in-progress runs */}
      {(() => {
        const liveRuns = dbRuns.filter(r => r.status !== "completed" && r.status !== "failed");
        if (liveRuns.length === 0) return null;
        return (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Live Payrolls</span>
              <Badge variant="secondary">{liveRuns.length}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveRuns.map(r => {
                const setup = getSetupById(r.payroll_setup_id ?? "");
                return (
                  <LivePayrollCard
                    key={r.id}
                    run={r}
                    setupName={setup?.name ?? "Payroll"}
                    currency={setup?.currency ?? REPORTING_CURRENCY}
                    onProcess={(row) => {
                      const localRun = runs.find(x => x.id === row.id) ?? adaptPayrollRun(row);
                      setSelectedRun(localRun);
                    }}
                  />
                );
              })}
            </div>
          </div>
        );
      })()}

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
                      <TableHead className="font-semibold">Payroll Setup</TableHead>
                      <TableHead className="font-semibold">Employees</TableHead>
                      <TableHead className="font-semibold">Currency</TableHead>
                      <TableHead className="font-semibold text-right">Gross</TableHead>
                      <TableHead className="font-semibold text-right">Deductions</TableHead>
                      <TableHead className="font-semibold text-right">Net</TableHead>
                      <TableHead className="font-semibold">Run Date</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length > 0 ? filtered.map((run) => {
                      const runEmps = run.payrollSetupId ? employees.filter(e => e.payrollSetupId === run.payrollSetupId) : (run.employeeTypes && run.employeeTypes.length > 0 ? employees.filter(e => run.employeeTypes!.includes(e.category)) : employees);
                      const runSetup = run.payrollSetupId ? getSetupById(run.payrollSetupId) : undefined;
                      const runCurrency = runSetup?.currency || runEmps[0]?.payCurrency || REPORTING_CURRENCY;
                      const liveBreakdown = run.status !== "completed"
                        ? (runSetup ? buildBreakdownFromSetup(runEmps, runSetup, oneOffs[run.id] || [], getSepMap(run.id), processedSeps, run.id, approvedAdvances) : buildBreakdown(runEmps, [] as Deduction[], initialTaxConfigs, oneOffs[run.id] || [], getSepMap(run.id), processedSeps, run.id, approvedAdvances))
                        : null;
                      const dispCount = liveBreakdown ? liveBreakdown.length : run.employeeCount;
                      const dispGross = liveBreakdown
                        ? Math.round(liveBreakdown.reduce((s, l) => s + l.gross, 0))
                        : run.totalGross;
                      const dispDed = liveBreakdown
                        ? Math.round(liveBreakdown.reduce((s, l) => s + l.totalDeductions, 0))
                        : run.totalDeductions;
                      const dispNet = liveBreakdown
                        ? Math.round(liveBreakdown.reduce((s, l) => s + l.net, 0))
                        : run.totalNet;
                      return (
                        <TableRow key={run.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelectedRun(run)}>
                          <TableCell className="font-medium">{run.month} {run.year}</TableCell>
                          <TableCell className="text-xs">{run.payrollSetupId ? (getSetupById(run.payrollSetupId)?.name || "—") : (run.employeeTypes?.map(t => getTypeName(t)).join(", ") || "All")}</TableCell>
                          <TableCell>{dispCount}</TableCell>
                          <TableCell className="font-medium text-xs">{runCurrency}</TableCell>
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
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
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

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmAction?.action === "approve" ? "Complete Payroll" : "Reject Payroll"}</DialogTitle>
            <DialogDescription>{confirmAction?.action === "approve" ? "This will complete and lock this payroll run. Continue?" : "This will reject and cancel this payroll run. Continue?"}</DialogDescription>
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
