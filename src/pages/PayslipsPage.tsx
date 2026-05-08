import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useRole } from "@/contexts/RoleContext";
import { useViewScope } from "@/contexts/ViewScopeContext";
import { useClient } from "@/contexts/ClientContext";
// Note: loans and expenses are intentionally not surfaced on the payslip view —
// payslip deductions/reimbursements are derived from the payroll run line items.
const loans: any[] = [];
const expenses: any[] = [];
import { usePayrollRuns } from "@/hooks/queries/usePayroll";
import { useAdvances } from "@/contexts/AdvanceContext";
import { useEmployees } from "@/contexts/EmployeeContext";
import { usePayrollSetups } from "@/contexts/PayrollSetupContext";
import { defaultExchangeRates } from "@/data/settingsData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, Eye, FileText, Search, AlertTriangle, Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { eosBenefitConfigs, calculateEOSBenefit } from "@/pages/settings/EOSBenefitsPage";
import { useSeparations } from "@/contexts/SeparationContext";
import { useDownloadPayslip } from "@/hooks/useDownloadPayslip";
import type { Employee } from "@/types/hcm";
import type { PayrollSetup } from "@/types/payrollSetup";
import { EmptyTableRow } from "@/components/EmptyState";

const REPORTING_CURRENCY = "SAR";

function getEmployeePayCurrency(emp: { payCurrency?: string }): string {
  return emp.payCurrency || REPORTING_CURRENCY;
}

function getToReportingRate(fromCurrency: string): number {
  if (fromCurrency === REPORTING_CURRENCY) return 1;
  return defaultExchangeRates.find(r => r.fromCurrency === fromCurrency)?.toReportingRate || 1;
}

// Build payslip earnings/deductions from PayrollSetup.
// Convention: emp.salary = Basic Salary. Earning components are ADDED on top
// of basic. Deductions and tax are computed against basic (matching the
// AddEmployeeWizard live breakdown).
function buildPayslipFromSetup(emp: Employee, setup: PayrollSetup | undefined) {
  const basic = emp.salary;
  const earnings: { label: string; amount: number }[] = [{ label: "Basic Salary", amount: basic }];
  const deductions: { label: string; amount: number }[] = [];

  if (setup) {
    const isBasicComp = (c: any) => c.id === "comp-basic-salary" || (c.name || "").toLowerCase() === "basic salary";
    const activeEarnings = setup.payslipComponents.filter(c => c.type === "earning" && c.status === "active" && !isBasicComp(c));
    const activeDeductions = setup.payslipComponents.filter(c => c.type === "deduction" && c.status === "active");

    activeEarnings.forEach(comp => {
      const val = comp.calculationType === "percentage" ? Math.round(basic * comp.value / 100) : comp.value;
      earnings.push({ label: comp.name, amount: val });
    });

    activeDeductions.forEach(comp => {
      const val = comp.calculationType === "percentage" ? Math.round(basic * comp.value / 100) : comp.value;
      deductions.push({ label: comp.name, amount: val });
    });

    const totalEarningsForGross = earnings.reduce((s, e) => s + e.amount, 0);

    // Tax from setup's taxRules
    if (setup.options.enableTaxCalculation && setup.taxRules.length > 0) {
      const taxBase = (setup as any).taxBasis === "basic" ? basic : totalEarningsForGross;
      const annualBase = taxBase * 12;
      let totalTax = 0;
      setup.taxRules.forEach(slab => {
        if (annualBase > slab.incomeFrom) {
          const taxableInSlab = Math.min(annualBase, slab.incomeTo) - slab.incomeFrom;
          if (taxableInSlab > 0) {
            totalTax += Math.round((taxableInSlab * slab.percentage / 100) / 12);
          }
        }
      });
      if (totalTax > 0) {
        deductions.push({ label: "Income Tax", amount: totalTax });
      }
    }

    // Auto deductions custom rules
    setup.autoDeductions.customRules.forEach(rule => {
      if (rule.enabled) {
        deductions.push({ label: rule.name, amount: rule.amount });
      }
    });
  }

  const totalEarnings = earnings.reduce((s, e) => s + e.amount, 0);
  const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);
  const gross = totalEarnings;

  return { earnings, deductions, totalEarnings, totalDeductions, gross, basic };
}

interface PayslipDetail {
  employeeName: string;
  empId: string;
  department: string;
  designation: string;
  joiningDate: string;
  period: string;
  gross: number;
  deductions: number;
  net: number;
  employeeId: string;
  payCurrency: string;
  workLocationCountry: string;
  payrollSetupId?: string;
  payrollRunId?: string;
}

export default function PayslipsPage() {
  const { employees } = useEmployees();
  const { role, currentEmployeeId, user } = useRole();
  const { scope, hasPeopleAccess } = useViewScope();
  const { setups, getSetupById } = usePayrollSetups();
  const currentEmployee =
    employees.find(e => e.id === currentEmployeeId) ||
    employees.find(e => e.empId === currentEmployeeId) ||
    (user ? employees.find(e => e.userId === user.id) : undefined);
  const { data: dbRuns = [] } = usePayrollRuns({ status: "completed" });
  const completedRuns = dbRuns.map(r => ({
    id: r.id,
    month: r.month,
    year: r.year,
    status: r.status as "draft" | "processing" | "completed" | "failed",
    totalGross: Number(r.total_gross) || 0,
    totalDeductions: Number(r.total_deductions) || 0,
    totalNet: Number(r.total_net) || 0,
    runDate: r.run_date,
    employeeCount: r.employee_count ?? 0,
    payrollSetupId: r.payroll_setup_id ?? undefined,
  }));
  const [viewPayslip, setViewPayslip] = useState<PayslipDetail | null>(null);
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const { download: downloadPayslip, loading: downloadingKey } = useDownloadPayslip();

  const handleDownload = async (runId: string, employeeId: string) => {
    await downloadPayslip({ payrollRunId: runId, employeeId });
  };

  // Show "my payslips" view when scope is "me" or user has no people access
  const showMyView = (scope === "me" || !hasPeopleAccess) && currentEmployee;
  if (showMyView) {
    const setup = getSetupById(currentEmployee.payrollSetupId || "");
    const { earnings, deductions: dedItems, totalDeductions, gross } = buildPayslipFromSetup(currentEmployee, setup);
    const monthlySalary = gross;
    const netPay = monthlySalary - totalDeductions;
    const payCurrency = getEmployeePayCurrency(currentEmployee);

    // Only show runs matching employee's setup
    const myRuns = completedRuns.filter(r => r.payrollSetupId === currentEmployee.payrollSetupId);

    return (
      <div className="space-y-6">
        <PageHeader title="My Payslips" description="View and download your monthly payslips." />
        {!currentEmployee.payrollSetupId && (
          <div className="flex items-center gap-2 bg-destructive/10 text-destructive rounded-lg px-4 py-2 text-sm">
            <AlertTriangle className="h-4 w-4" />
            No payroll setup assigned. Contact HR.
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title={`Gross Salary (${payCurrency})`} value={`${payCurrency} ${monthlySalary.toLocaleString()}`} icon={FileText} variant="primary" />
          <StatCard title={`Total Deductions (${payCurrency})`} value={`${payCurrency} ${totalDeductions.toLocaleString()}`} icon={FileText} variant="warning" />
          <StatCard title={`Net Pay (${payCurrency})`} value={`${payCurrency} ${netPay.toLocaleString()}`} icon={FileText} variant="success" />
        </div>
        <div className="bg-card rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Period</TableHead>
                <TableHead className="font-semibold">Setup</TableHead>
                <TableHead className="font-semibold text-right">Gross ({payCurrency})</TableHead>
                <TableHead className="font-semibold text-right">Deductions ({payCurrency})</TableHead>
                <TableHead className="font-semibold text-right">Net Pay ({payCurrency})</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myRuns.length === 0 ? (
                <EmptyTableRow
                  colSpan={7}
                  icon={FileText}
                  title="No payslips yet"
                  description="Your payslips will appear here once payroll runs are processed."
                />
              ) : myRuns.map(run => (
                <TableRow key={run.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">{run.month} {run.year}</TableCell>
                  <TableCell className="text-xs">{setup?.name || "—"}</TableCell>
                  <TableCell className="text-right">{monthlySalary.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-destructive">{totalDeductions.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-semibold">{netPay.toLocaleString()}</TableCell>
                  <TableCell><StatusBadge status="completed" /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setViewPayslip({
                        employeeName: `${currentEmployee.firstName} ${currentEmployee.lastName}`,
                        empId: currentEmployee.empId, department: currentEmployee.department,
                        designation: currentEmployee.designation, joiningDate: currentEmployee.joiningDate,
                        period: `${run.month} ${run.year}`,
                        gross: monthlySalary, deductions: totalDeductions, net: netPay,
                        employeeId: currentEmployee.id, payCurrency,
                        workLocationCountry: currentEmployee.workLocationCountry,
                        payrollSetupId: currentEmployee.payrollSetupId,
                        payrollRunId: run.id,
                      })}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" disabled={downloadingKey === `${run.id}:${currentEmployee.id}`} onClick={() => handleDownload(run.id, currentEmployee.id)}>
                        {downloadingKey === `${run.id}:${currentEmployee.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <PayslipDialog payslip={viewPayslip} onClose={() => setViewPayslip(null)} onDownload={(p) => handleDownload(p.payrollRunId!, p.employeeId)} />
      </div>
    );
  }

  // Admin view — only show employees that belong to a completed run's setup
  const allPayslips = completedRuns.flatMap(run => {
    const runEmps = run.payrollSetupId
      ? employees.filter(e => e.payrollSetupId === run.payrollSetupId)
      : employees;
    return runEmps.map(emp => {
      const setup = getSetupById(emp.payrollSetupId || "");
      const { totalDeductions, gross } = buildPayslipFromSetup(emp, setup);
      const net = gross - totalDeductions;
      const payCurrency = getEmployeePayCurrency(emp);
      return { run, emp, gross, deductions: totalDeductions, net, payCurrency, setup };
    });
  });

  const scopeFiltered = scope === "me"
    ? allPayslips.filter(({ emp }) => emp.id === currentEmployeeId)
    : allPayslips;

  const filtered = scopeFiltered.filter(({ emp, run }) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q) ||
      emp.empId.toLowerCase().includes(q) ||
      emp.department.toLowerCase().includes(q) ||
      `${run.month} ${run.year}`.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <PageHeader title={scope === "me" ? "My Payslips" : "Payslips"} description={scope === "me" ? "Your personal payslips for completed payroll runs." : "View and manage employee payslips for completed payroll runs."} />
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name, ID, period..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Employee</TableHead>
              <TableHead className="font-semibold">Period</TableHead>
              <TableHead className="font-semibold">Payroll Setup</TableHead>
              <TableHead className="font-semibold">Currency</TableHead>
              <TableHead className="font-semibold text-right">Gross</TableHead>
              <TableHead className="font-semibold text-right">Deductions</TableHead>
              <TableHead className="font-semibold text-right">Net</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <EmptyTableRow
                colSpan={8}
                icon={FileText}
                title={search ? "No payslips match your search" : "No payslips yet"}
                description={search ? "Try a different name, ID, or period." : "Process a payroll run to generate payslips."}
              />
            ) : filtered.map(({ run, emp, deductions, net, payCurrency, setup }) => (
              <TableRow key={`${run.id}-${emp.id}`} className="hover:bg-muted/30 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-secondary-foreground">{emp.firstName[0]}{emp.lastName[0]}</span>
                    </div>
                    <span className="text-sm font-medium">{emp.firstName} {emp.lastName}</span>
                  </div>
                </TableCell>
                <TableCell>{run.month} {run.year}</TableCell>
                <TableCell className="text-xs">{setup?.name || "—"}</TableCell>
                <TableCell className="text-xs font-medium">{payCurrency}</TableCell>
                <TableCell className="text-right">{emp.salary.toLocaleString()}</TableCell>
                <TableCell className="text-right text-destructive">{deductions.toLocaleString()}</TableCell>
                <TableCell className="text-right font-semibold">{net.toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setViewPayslip({
                      employeeName: `${emp.firstName} ${emp.lastName}`,
                      empId: emp.empId, department: emp.department,
                      designation: emp.designation, joiningDate: emp.joiningDate,
                      period: `${run.month} ${run.year}`,
                      gross: emp.salary, deductions, net,
                      employeeId: emp.id, payCurrency,
                      workLocationCountry: emp.workLocationCountry,
                      payrollSetupId: emp.payrollSetupId,
                      payrollRunId: run.id,
                    })}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" disabled={downloadingKey === `${run.id}:${emp.id}`} onClick={() => handleDownload(run.id, emp.id)}>
                      {downloadingKey === `${run.id}:${emp.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <PayslipDialog payslip={viewPayslip} onClose={() => setViewPayslip(null)} onDownload={(p) => handleDownload(p.payrollRunId!, p.employeeId)} />
    </div>
  );
}

function PayslipDialog({ payslip, onClose, onDownload }: { payslip: PayslipDetail | null; onClose: () => void; onDownload: (p: PayslipDetail) => void }) {
  const { employees } = useEmployees();
  const { client } = useClient();
  const { separations } = useSeparations();
  const { advances } = useAdvances();
  const { getSetupById } = usePayrollSetups();
  if (!payslip) return null;

  const emp = employees.find(e => e.empId === payslip.empId);
  const setup = getSetupById(payslip.payrollSetupId || emp?.payrollSetupId || "");
  const payCurrency = payslip.payCurrency || REPORTING_CURRENCY;
  const isMultiCurrency = payCurrency !== REPORTING_CURRENCY;
  const toReportingRate = getToReportingRate(payCurrency);
  const sepRecord = separations.find(s => s.employeeId === payslip.employeeId);

  // Build earnings & deductions from setup
  const empData = emp || { salary: payslip.gross, payrollSetupId: payslip.payrollSetupId } as Employee;
  const { earnings, deductions: setupDeductions } = buildPayslipFromSetup(empData, setup);

  // Loan deduction
  const empLoans = loans.filter(l => l.employeeId === payslip.employeeId);
  const activeLoan = empLoans.find(l => l.status === "active");
  const loanDeduction = activeLoan ? activeLoan.monthlyDeduction : 0;

  // Expense reimbursement
  const expenseReimbursement = expenses
    .filter(e => e.employeeId === payslip.employeeId && e.status === "paid" && !e.advanceId)
    .reduce((s, e) => s + e.amount, 0);

  // Advance given
  const advanceGiven = advances
    .filter(a => a.employeeId === payslip.employeeId && a.status === "approved" && a.payrollRunId)
    .reduce((s, a) => s + a.amount, 0);

  const totalEarnings = earnings.reduce((s, e) => s + e.amount, 0);
  const totalSetupDeductions = setupDeductions.reduce((s, d) => s + d.amount, 0);
  const totalDeductions = totalSetupDeductions + loanDeduction;
  const adjustedNet = payslip.gross - totalDeductions + expenseReimbursement + advanceGiven;

  const companyName = client.companyName || "Your Company";

  return (
    <Dialog open={!!payslip} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="bg-primary px-6 py-5 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
                <span className="text-lg font-bold">{companyName.charAt(0)}</span>
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight">{companyName}</h2>
                <p className="text-xs text-primary-foreground/70">Pay Statement</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">{payslip.period}</p>
              <p className="text-xs text-primary-foreground/70">Payslip · {payCurrency}</p>
              {setup && <p className="text-xs text-primary-foreground/60 mt-0.5">{setup.name}</p>}
            </div>
          </div>
        </div>

        <ScrollArea className="max-h-[calc(90vh-160px)]">
        <div className="px-6 py-5 space-y-5">
          {/* Employee Details */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Employee Name</p>
              <p className="font-semibold">{payslip.employeeName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Employee ID</p>
              <p className="font-semibold">{payslip.empId}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Department</p>
              <p className="font-medium">{payslip.department}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Job Title</p>
              <p className="font-medium">{payslip.designation}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Joining Date</p>
              <p className="font-medium">{new Date(payslip.joiningDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pay Period</p>
              <p className="font-medium">{payslip.period}</p>
            </div>
          </div>

          {setup && (
            <div className="bg-muted/30 rounded-lg px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium">Payroll Setup:</span> {setup.name} · {setup.country} · {setup.currency} · {setup.paySchedule.payFrequency}
            </div>
          )}

          <Separator />

          {/* Two-column: Earnings | Deductions */}
          <div className="grid grid-cols-2 gap-6">
            {/* Earnings */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Earnings</p>
              <div className="bg-muted/30 rounded-lg overflow-hidden">
                {earnings.map((c, i) => (
                  <div key={i} className={`flex justify-between text-sm px-3 py-2 ${i < earnings.length - 1 ? 'border-b border-border/50' : ''}`}>
                    <span>{c.label}</span>
                    <span className="font-medium">{payCurrency} {c.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-sm font-bold px-3 pt-1">
                <span>Total Gross</span>
                <span>{payCurrency} {payslip.gross.toLocaleString()}</span>
              </div>
            </div>

            {/* Deductions */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deductions</p>
              <div className="bg-muted/30 rounded-lg overflow-hidden">
                {setupDeductions.map((d, i) => (
                  <div key={i} className={`flex justify-between text-sm px-3 py-2 ${i < setupDeductions.length - 1 || loanDeduction > 0 ? 'border-b border-border/50' : ''}`}>
                    <span>{d.label}</span>
                    <span className="font-medium text-destructive">{payCurrency} {d.amount.toLocaleString()}</span>
                  </div>
                ))}
                {loanDeduction > 0 && (
                  <div className="flex justify-between text-sm px-3 py-2">
                    <span>Loan Repayment</span>
                    <span className="font-medium text-destructive">{payCurrency} {loanDeduction.toLocaleString()}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between text-sm font-bold px-3 pt-1">
                <span>Total Deductions</span>
                <span className="text-destructive">{payCurrency} {totalDeductions.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Additions */}
          {(expenseReimbursement > 0 || advanceGiven > 0) && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Additions</p>
                <div className="bg-muted/30 rounded-lg overflow-hidden">
                  {expenseReimbursement > 0 && (
                    <div className="flex justify-between text-sm px-3 py-2 border-b border-border/50 last:border-0">
                      <span>Expense Reimbursement</span>
                      <span className="font-medium text-success">{payCurrency} {expenseReimbursement.toLocaleString()}</span>
                    </div>
                  )}
                  {advanceGiven > 0 && (
                    <div className="flex justify-between text-sm px-3 py-2 border-b border-border/50 last:border-0">
                      <span>Advance Given</span>
                      <span className="font-medium text-success">{payCurrency} {advanceGiven.toLocaleString()}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between text-sm font-bold px-3 pt-1">
                  <span>Total Additions</span>
                  <span className="text-success">{payCurrency} {(expenseReimbursement + advanceGiven).toLocaleString()}</span>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Separation Settlement */}
          {sepRecord && (
            <>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-destructive uppercase tracking-wider">⚠ Separation Settlement</p>
                <div className="bg-destructive/5 rounded-lg overflow-hidden text-sm">
                  <div className="flex justify-between px-3 py-2 border-b border-border/50">
                    <span>Unpaid Salary</span>
                    <span className="font-medium">{payCurrency} {sepRecord.unpaidSalary.toLocaleString()}</span>
                  </div>
                  {sepRecord.eosBreakdown.map((eos, i) => (
                    <div key={i} className="flex justify-between px-3 py-2 border-b border-border/50">
                      <span>{eos.name}</span>
                      <span className="font-medium">{payCurrency} {eos.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  {sepRecord.noticePeriodPay > 0 && (
                    <div className="flex justify-between px-3 py-2 border-b border-border/50">
                      <span>Notice Period Pay</span>
                      <span className="font-medium">{payCurrency} {sepRecord.noticePeriodPay.toLocaleString()}</span>
                    </div>
                  )}
                  {sepRecord.loanDeduction > 0 && (
                    <div className="flex justify-between px-3 py-2 border-b border-border/50 text-destructive">
                      <span>Outstanding Loan Deduction</span>
                      <span className="font-medium">- {payCurrency} {sepRecord.loanDeduction.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between px-3 py-2 font-bold bg-primary/10">
                    <span>Total Settlement</span>
                    <span className="text-primary">{payCurrency} {sepRecord.totalSettlement.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Net Pay */}
          <div className="flex justify-between items-center bg-primary/10 rounded-lg px-4 py-3">
            <span className="text-base font-bold">Net Pay {sepRecord ? "(incl. Settlement)" : ""}</span>
            <span className="text-lg font-bold text-primary">{payCurrency} {(adjustedNet + (sepRecord?.totalSettlement || 0)).toLocaleString()}</span>
          </div>

          {/* Reporting currency */}
          {isMultiCurrency && (
            <div className="bg-muted/30 rounded-lg px-4 py-2 text-xs text-muted-foreground">
              <span className="font-medium">Reporting currency equivalent:</span> {REPORTING_CURRENCY} {Math.round((adjustedNet + (sepRecord?.totalSettlement || 0)) * toReportingRate).toLocaleString()}
              <span className="ml-2">(Rate: 1 {payCurrency} = {toReportingRate} {REPORTING_CURRENCY})</span>
            </div>
          )}

          {/* EOS Accumulated Balances */}
          {(() => {
            if (!emp) return null;
            const yearsOfService = (Date.now() - new Date(emp.joiningDate).getTime()) / (1000 * 60 * 60 * 24 * 365);
            const basicSalary = emp.compensation?.find(c => c.type === "base")?.amount || Math.round(emp.salary * 0.6);
            const applicableEOS = eosBenefitConfigs.filter(c => c.isActive && (c.appliesTo.length === 0 || c.appliesTo.includes(emp.category)));
            if (applicableEOS.length === 0) return null;
            return (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">End of Service Benefits (Accumulated)</p>
                  <div className="bg-muted/30 rounded-lg overflow-hidden">
                    {applicableEOS.map(config => {
                      const basis = config.calculationBasis === "basic_salary" ? basicSalary : emp.salary;
                      const amount = calculateEOSBenefit(config, yearsOfService, basis);
                      return (
                        <div key={config.id} className="px-3 py-2 text-sm border-b border-border/50 last:border-0">
                          <div className="flex justify-between">
                            <span className="font-medium">{config.name}</span>
                            <span className="font-semibold">{payCurrency} {amount.toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{yearsOfService.toFixed(1)} years of service · Based on {config.calculationBasis.replace("_", " ")}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            );
          })()}

          {/* Loan Summary */}
          {empLoans.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Loan Information</p>
                <div className="bg-muted/30 rounded-lg overflow-hidden">
                  {empLoans.map(loan => (
                    <div key={loan.id} className="px-3 py-2 text-sm border-b border-border/50 last:border-0">
                      <div className="flex justify-between">
                        <span className="font-medium">Loan #{loan.id}</span>
                        <StatusBadge status={loan.status} />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Total: {payCurrency} {loan.amount.toLocaleString()}</span>
                        <span>Remaining: {payCurrency} {loan.remainingBalance.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{loan.startDate} → {loan.endDate}</span>
                        <span>Monthly: {payCurrency} {loan.monthlyDeduction.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <p className="text-[10px] text-muted-foreground text-center">
            This is a computer-generated payslip. If you have any queries, please contact the HR department.
          </p>
        </div>
        </ScrollArea>
        <div className="px-6 pb-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => { onDownload(payslip); onClose(); }}>
            <Download className="h-4 w-4 mr-2" />Download PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
