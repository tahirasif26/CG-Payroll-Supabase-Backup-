import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useRole } from "@/contexts/RoleContext";
import { useClient } from "@/contexts/ClientContext";
import { payrollRuns, loans, expenses } from "@/data/mockData";
import { useAdvances } from "@/contexts/AdvanceContext";
import { useEmployees } from "@/contexts/EmployeeContext";
import { defaultExchangeRates } from "@/data/settingsData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, Eye, FileText, Search } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { eosBenefitConfigs, calculateEOSBenefit } from "@/pages/settings/EOSBenefitsPage";
import { useSeparations } from "@/contexts/SeparationContext";

const REPORTING_CURRENCY = "SAR";

function getEmployeePayCurrency(emp: { payCurrency?: string }): string {
  return emp.payCurrency || REPORTING_CURRENCY;
}

function getToReportingRate(fromCurrency: string): number {
  if (fromCurrency === REPORTING_CURRENCY) return 1;
  return defaultExchangeRates.find(r => r.fromCurrency === fromCurrency)?.toReportingRate || 1;
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
}

export default function PayslipsPage() {
  const { employees } = useEmployees();
  const { role, currentEmployeeId } = useRole();
  const currentEmployee = employees.find(e => e.id === currentEmployeeId);
  const completedRuns = payrollRuns.filter(r => r.status === "completed");
  const [viewPayslip, setViewPayslip] = useState<PayslipDetail | null>(null);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const handleDownload = (name: string, period: string) => {
    toast({ title: "Downloading Payslip", description: `Payslip for ${name} — ${period} will be downloaded.` });
  };

  if (role === "employee" && currentEmployee) {
    const monthlySalary = currentEmployee.salary;
    const deductions = Math.round(monthlySalary * 0.15);
    const netPay = monthlySalary - deductions;
    const payCurrency = getEmployeePayCurrency(currentEmployee);

    return (
      <div className="space-y-6">
        <PageHeader title="My Payslips" description="View and download your monthly payslips." />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title={`Gross Salary (${payCurrency})`} value={`${payCurrency} ${monthlySalary.toLocaleString()}`} icon={FileText} variant="primary" />
          <StatCard title={`Total Deductions (${payCurrency})`} value={`${payCurrency} ${deductions.toLocaleString()}`} icon={FileText} variant="warning" />
          <StatCard title={`Net Pay (${payCurrency})`} value={`${payCurrency} ${netPay.toLocaleString()}`} icon={FileText} variant="success" />
        </div>
        <div className="bg-card rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Period</TableHead>
                <TableHead className="font-semibold text-right">Gross ({payCurrency})</TableHead>
                <TableHead className="font-semibold text-right">Deductions ({payCurrency})</TableHead>
                <TableHead className="font-semibold text-right">Net Pay ({payCurrency})</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {completedRuns.map(run => (
                <TableRow key={run.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">{run.month} {run.year}</TableCell>
                  <TableCell className="text-right">{monthlySalary.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-destructive">{deductions.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-semibold">{netPay.toLocaleString()}</TableCell>
                  <TableCell><StatusBadge status="completed" /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setViewPayslip({
                        employeeName: `${currentEmployee.firstName} ${currentEmployee.lastName}`,
                        empId: currentEmployee.empId, department: currentEmployee.department,
                        designation: currentEmployee.designation, joiningDate: currentEmployee.joiningDate,
                        period: `${run.month} ${run.year}`,
                        gross: monthlySalary, deductions, net: netPay,
                        employeeId: currentEmployee.id,
                        payCurrency,
                        workLocationCountry: currentEmployee.workLocationCountry,
                      })}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDownload(`${currentEmployee.firstName} ${currentEmployee.lastName}`, `${run.month} ${run.year}`)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <PayslipDialog payslip={viewPayslip} onClose={() => setViewPayslip(null)} onDownload={handleDownload} />
      </div>
    );
  }

  const allPayslips = completedRuns.flatMap(run =>
    employees.map(emp => {
      const deductions = Math.round(emp.salary * 0.15);
      const net = emp.salary - deductions;
      const payCurrency = getEmployeePayCurrency(emp);
      return { run, emp, deductions, net, payCurrency };
    })
  );

  const filtered = allPayslips.filter(({ emp, run }) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q) ||
      emp.empId.toLowerCase().includes(q) ||
      emp.department.toLowerCase().includes(q) ||
      `${run.month} ${run.year}`.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Payslips" description="View and manage employee payslips for completed payroll runs." />
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
              <TableHead className="font-semibold">Currency</TableHead>
              <TableHead className="font-semibold text-right">Gross</TableHead>
              <TableHead className="font-semibold text-right">Net</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(({ run, emp, deductions, net, payCurrency }) => (
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
                <TableCell className="text-xs font-medium">{payCurrency}</TableCell>
                <TableCell className="text-right">{emp.salary.toLocaleString()}</TableCell>
                <TableCell className="text-right font-semibold">{net.toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setViewPayslip({
                      employeeName: `${emp.firstName} ${emp.lastName}`,
                      empId: emp.empId, department: emp.department,
                      designation: emp.designation, joiningDate: emp.joiningDate,
                      period: `${run.month} ${run.year}`,
                      gross: emp.salary, deductions, net,
                      employeeId: emp.id,
                      payCurrency,
                      workLocationCountry: emp.workLocationCountry,
                    })}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDownload(`${emp.firstName} ${emp.lastName}`, `${run.month} ${run.year}`)}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <PayslipDialog payslip={viewPayslip} onClose={() => setViewPayslip(null)} onDownload={handleDownload} />
    </div>
  );
}

function PayslipDialog({ payslip, onClose, onDownload }: { payslip: PayslipDetail | null; onClose: () => void; onDownload: (name: string, period: string) => void }) {
  const { employees } = useEmployees();
  const { client } = useClient();
  const { separations } = useSeparations();
  if (!payslip) return null;

  const payCurrency = payslip.payCurrency || REPORTING_CURRENCY;
  const isMultiCurrency = payCurrency !== REPORTING_CURRENCY;
  const toReportingRate = getToReportingRate(payCurrency);
  const sepRecord = separations.find(s => s.employeeId === payslip.employeeId);

  const components = [
    { label: "Basic Salary", amount: Math.round(payslip.gross * 0.6) },
    { label: "Housing Allowance", amount: Math.round(payslip.gross * 0.25) },
    { label: "Travel Allowance", amount: Math.round(payslip.gross * 0.05) },
    { label: "Medical Allowance", amount: Math.round(payslip.gross * 0.05) },
    { label: "Other Allowances", amount: Math.round(payslip.gross * 0.05) },
  ];

  const gosiDeduction = payslip.deductions;
  const empLoans = loans.filter(l => l.employeeId === payslip.employeeId);
  const activeLoan = empLoans.find(l => l.status === "active");
  const loanDeduction = activeLoan ? activeLoan.monthlyDeduction : 0;
  const totalDeductions = gosiDeduction + loanDeduction;
  const adjustedNet = payslip.gross - totalDeductions;

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

          <Separator />

          {/* Two-column: Earnings | Deductions */}
          <div className="grid grid-cols-2 gap-6">
            {/* Earnings (Left) */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Earnings</p>
              <div className="bg-muted/30 rounded-lg overflow-hidden">
                {components.map((c, i) => (
                  <div key={i} className={`flex justify-between text-sm px-3 py-2 ${i < components.length - 1 ? 'border-b border-border/50' : ''}`}>
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

            {/* Deductions (Right) */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deductions</p>
              <div className="bg-muted/30 rounded-lg overflow-hidden">
                <div className="flex justify-between text-sm px-3 py-2 border-b border-border/50">
                  <span>GOSI & Insurance</span>
                  <span className="font-medium text-destructive">{payCurrency} {gosiDeduction.toLocaleString()}</span>
                </div>
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

          <Separator />

          {/* Separation Settlement (if applicable) */}
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
                  <div className="flex justify-between px-3 py-2 border-b border-border/50">
                    <span>Leave Encashment</span>
                    <span className="font-medium">{payCurrency} {sepRecord.leaveEncashment.toLocaleString()}</span>
                  </div>
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

          {/* Reporting currency equivalent note */}
          {isMultiCurrency && (
            <div className="bg-muted/30 rounded-lg px-4 py-2 text-xs text-muted-foreground">
              <span className="font-medium">Reporting currency equivalent:</span> {REPORTING_CURRENCY} {Math.round((adjustedNet + (sepRecord?.totalSettlement || 0)) * toReportingRate).toLocaleString()}
              <span className="ml-2">(Rate: 1 {payCurrency} = {toReportingRate} {REPORTING_CURRENCY})</span>
            </div>
          )}

          {/* EOS Accumulated Balances */}
          {(() => {
            const emp = employees.find(e => e.empId === payslip.empId);
            if (!emp) return null;
            const yearsOfService = (Date.now() - new Date(emp.joiningDate).getTime()) / (1000 * 60 * 60 * 24 * 365);
            const basicSalary = emp.compensation?.find(c => c.type === "base")?.amount || Math.round(emp.salary * 0.6);
            const applicableEOS = eosBenefitConfigs.filter(c => c.isActive && (c.appliesTo === "all" || c.appliesTo === emp.category));
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
          <Button onClick={() => { onDownload(payslip.employeeName, payslip.period); onClose(); }}>
            <Download className="h-4 w-4 mr-2" />Download PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
