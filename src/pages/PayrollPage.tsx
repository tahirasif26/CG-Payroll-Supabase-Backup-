import { useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { payrollRuns, employees, loans, expenses } from "@/data/mockData";
import { PayrollRun, OneOffAdjustment } from "@/types/hcm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSeparations } from "@/contexts/SeparationContext";
import { Button } from "@/components/ui/button";
import { Play, Eye, CheckCircle2, XCircle, ArrowLeft, Download, Search, Plus, X } from "lucide-react";
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
}

function buildBreakdown(oneOffs: OneOffAdjustment[], separationMap: Record<string, number>, processedSepIds: Set<string>): EmployeePayrollLine[] {
  // Filter out employees whose separation was already processed in a completed run
  const activeEmployees = employees.filter(emp => {
    if (processedSepIds.has(emp.id)) return false; // Already settled in a previous run
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
      .filter(e => e.employeeId === emp.id && e.status === "approved")
      .reduce((s, e) => s + e.amount, 0);
    const empOneOffs = oneOffs.filter(o => o.employeeId === emp.id);
    const oneOffBenefits = empOneOffs.filter(o => o.type === "benefit").reduce((s, o) => s + o.amount, 0);
    const oneOffDeductions = empOneOffs.filter(o => o.type === "deduction").reduce((s, o) => s + o.amount, 0);
    const separationSettlement = separationMap[emp.id] || 0;
    const isSeparated = !!separationMap[emp.id];
    const totalDeductions = otherDeductions + loanDeduction + oneOffDeductions;
    const net = gross - totalDeductions + approvedExpenses + oneOffBenefits + separationSettlement;
    return { emp, basic, allowances, gross, loanDeduction, otherDeductions, totalDeductions, expenseReimbursement: approvedExpenses, oneOffBenefits, oneOffDeductions, separationSettlement, isSeparated, net };
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

  const rows: string[] = ["Date,GL Code,Account,Debit,Credit,Employee,Description"];
  const date = run.runDate || new Date().toISOString().split("T")[0];

  lines.forEach(({ emp, basic, allowances, loanDeduction, otherDeductions, expenseReimbursement, net }) => {
    const name = `${emp.firstName} ${emp.lastName}`;
    rows.push(`${date},${glMap["Basic Salary"] || ""},Basic Salary,${basic},0,${name},${run.month} ${run.year}`);
    if (allowances > 0) rows.push(`${date},${glMap["Housing Allowance"] || ""},Allowances,${allowances},0,${name},${run.month} ${run.year}`);
    if (otherDeductions > 0) rows.push(`${date},${glMap["GOSI (Employee)"] || ""},Statutory Deductions,0,${otherDeductions},${name},${run.month} ${run.year}`);
    if (loanDeduction > 0) rows.push(`${date},${glMap["Loan Deduction"] || ""},Loan Deduction,0,${loanDeduction},${name},${run.month} ${run.year}`);
    if (expenseReimbursement > 0) rows.push(`${date},${glMap["Expense Reimbursement"] || ""},Expense Reimbursement,${expenseReimbursement},0,${name},${run.month} ${run.year}`);
    rows.push(`${date},${glMap["Net Pay"] || ""},Net Pay,0,${net},${name},${run.month} ${run.year}`);
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
  const [runs, setRuns] = useState<PayrollRun[]>(payrollRuns);
  const { client } = useClient();
  const { separations } = useSeparations();
  const [newRunOpen, setNewRunOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: "approve" | "reject" } | null>(null);
  const [newMonth, setNewMonth] = useState("April");
  const [newYear, setNewYear] = useState("2025");
  const { toast } = useToast();

  // Build separation map for current run period
  const getSepMap = (month?: string, year?: number) => {
    const sepMap: Record<string, number> = {};
    separations.forEach(sep => {
      if (month && year) {
        if (sep.payrollMonth === month && sep.payrollYear === year) {
          sepMap[sep.employeeId] = sep.totalSettlement;
        }
      } else {
        sepMap[sep.employeeId] = sep.totalSettlement;
      }
    });
    return sepMap;
  };

  // Track which separations were already processed in completed runs
  const [processedSeps, setProcessedSeps] = useState<Set<string>>(new Set());

  // Search state for detail view
  const [detailSearch, setDetailSearch] = useState("");

  // One-off adjustments
  const [oneOffs, setOneOffs] = useState<Record<string, OneOffAdjustment[]>>({});
  const [sheetEmpId, setSheetEmpId] = useState<string | null>(null);
  const [newAdjName, setNewAdjName] = useState("");
  const [newAdjAmount, setNewAdjAmount] = useState("");
  const [newAdjType, setNewAdjType] = useState<"benefit" | "deduction">("benefit");

  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const currentOneOffs = selectedRun ? (oneOffs[selectedRun.id] || []) : [];

  const handleNewRun = (e: React.FormEvent) => {
    e.preventDefault();
    const breakdown = buildBreakdown([], {}, processedSeps);
    const totalGross = breakdown.reduce((s, l) => s + l.gross, 0);
    const totalDed = breakdown.reduce((s, l) => s + l.totalDeductions, 0);
    const newRun: PayrollRun = {
      id: String(Date.now()), month: newMonth, year: Number(newYear), status: "draft",
      totalGross, totalDeductions: totalDed, totalNet: totalGross - totalDed,
      runDate: "", employeeCount: employees.length,
    };
    setRuns(prev => [...prev, newRun]);
    setNewRunOpen(false);
    toast({ title: "Payroll Run Created", description: `${newMonth} ${newYear} payroll run created as draft.` });
  };

  const handleProcess = (id: string) => {
    const run = runs.find(r => r.id === id);
    setRuns(prev => prev.map(r => r.id === id ? { ...r, status: "processing" as const } : r));
    toast({ title: "Processing", description: "Payroll is being processed..." });
    setTimeout(() => {
      setRuns(prev => prev.map(r => r.id === id ? { ...r, status: "completed" as const, runDate: new Date().toISOString().split("T")[0] } : r));
      // Mark approved expenses as linked to this payroll run
      expenses.forEach(exp => {
        if (exp.status === "approved" && !exp.payrollRunId) {
          exp.payrollRunId = id;
        }
      });
      // Mark separated employees in this run as processed so they won't appear in future runs
      if (run) {
        const sepMap = getSepMap(run.month, run.year);
        setProcessedSeps(prev => {
          const next = new Set(prev);
          Object.keys(sepMap).forEach(empId => next.add(empId));
          return next;
        });
      }
      toast({ title: "Completed", description: "Payroll processing completed. This run is now locked." });
    }, 2000);
  };

  const handleConfirm = () => {
    if (!confirmAction) return;
    if (confirmAction.action === "approve") {
      handleProcess(confirmAction.id);
    } else {
      setRuns(prev => prev.map(r => r.id === confirmAction.id ? { ...r, status: "failed" as const } : r));
      toast({ title: "Rejected", description: "Payroll run has been rejected." });
    }
    setConfirmOpen(false);
    setConfirmAction(null);
  };

  const handleDownloadAccounting = (run: PayrollRun) => {
    const breakdown = buildBreakdown(oneOffs[run.id] || [], getSepMap(run.month, run.year), processedSeps);
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
    const sepMap = getSepMap(selectedRun.month, selectedRun.year);
    const breakdown = buildBreakdown(currentOneOffs, sepMap, isLocked ? new Set() : processedSeps);
    const totalLoan = breakdown.reduce((s, l) => s + l.loanDeduction, 0);
    const totalExpense = breakdown.reduce((s, l) => s + l.expenseReimbursement, 0);
    const totalOneOffBen = breakdown.reduce((s, l) => s + l.oneOffBenefits, 0);
    const totalOneOffDed = breakdown.reduce((s, l) => s + l.oneOffDeductions, 0);
    const totalSepSettlement = breakdown.reduce((s, l) => s + l.separationSettlement, 0);

    const filteredBreakdown = breakdown.filter(({ emp }) => {
      if (!detailSearch) return true;
      const q = detailSearch.toLowerCase();
      return `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q) ||
        emp.empId.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q);
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
          <StatCard title="Employees" value={selectedRun.employeeCount} icon={Users} variant="info" />
          <StatCard title="Total Gross" value={`SAR ${selectedRun.totalGross.toLocaleString()}`} icon={DollarSign} variant="primary" />
          <StatCard title="Other Deductions" value={`SAR ${selectedRun.totalDeductions.toLocaleString()}`} icon={TrendingDown} variant="warning" />
          <StatCard title="Loan Deductions" value={`SAR ${totalLoan.toLocaleString()}`} icon={TrendingDown} variant="warning" />
          <StatCard title="Expense Reimb." value={`SAR ${totalExpense.toLocaleString()}`} icon={DollarSign} variant="success" />
          <StatCard title="One-Off Benefits" value={`SAR ${totalOneOffBen.toLocaleString()}`} icon={DollarSign} variant="success" />
          <StatCard title="One-Off Deductions" value={`SAR ${totalOneOffDed.toLocaleString()}`} icon={TrendingDown} variant="warning" />
          {totalSepSettlement > 0 && <StatCard title="Separation EOS" value={`SAR ${totalSepSettlement.toLocaleString()}`} icon={DollarSign} variant="primary" />}
          <StatCard title="Total Net" value={`SAR ${breakdown.reduce((s, l) => s + l.net, 0).toLocaleString()}`} icon={DollarSign} variant="success" />
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Run Information</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div><span className="text-muted-foreground">Period:</span> <span className="font-medium">{selectedRun.month} {selectedRun.year}</span></div>
              <div><span className="text-muted-foreground">Run Date:</span> <span className="font-medium">{selectedRun.runDate || "Not processed"}</span></div>
              <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={selectedRun.status} /></div>
              <div><span className="text-muted-foreground">Employees:</span> <span className="font-medium">{selectedRun.employeeCount}</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Search bar */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, ID, department..."
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
                  <TableHead className="font-semibold">Department</TableHead>
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
                {filteredBreakdown.map(({ emp, basic, allowances, gross, otherDeductions, loanDeduction, expenseReimbursement, oneOffBenefits, oneOffDeductions, separationSettlement, isSeparated, net }) => (
                  <TableRow
                    key={emp.id}
                    className={`hover:bg-muted/30 transition-colors ${!isLocked ? "cursor-pointer" : ""} ${isSeparated ? "bg-destructive/5" : ""}`}
                    onClick={() => !isLocked && setSheetEmpId(emp.id)}
                  >
                    <TableCell className="font-medium">
                      {emp.firstName} {emp.lastName}
                      {isSeparated && <span className="ml-2 text-[10px] font-semibold text-destructive uppercase">Separated</span>}
                    </TableCell>
                    <TableCell>{emp.department}</TableCell>
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
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        {!isLocked && (selectedRun.status === "draft" || selectedRun.status === "processing") && (
          <div className="flex gap-2">
            {selectedRun.status === "draft" && (
              <>
                <Button className="gradient-ey text-primary-foreground font-semibold" onClick={() => { setConfirmAction({ id: selectedRun.id, action: "approve" }); setConfirmOpen(true); }}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />Process Payroll
                </Button>
                <Button variant="destructive" onClick={() => { setConfirmAction({ id: selectedRun.id, action: "reject" }); setConfirmOpen(true); }}>
                  <XCircle className="h-4 w-4 mr-2" />Reject
                </Button>
              </>
            )}
          </div>
        )}

        {/* One-off adjustment sheet */}
        <Sheet open={!!sheetEmpId} onOpenChange={(open) => { if (!open) setSheetEmpId(null); }}>
          <SheetContent side="right" className="w-[420px] sm:w-[500px] overflow-y-auto">
            {sheetEmp && (() => {
              const empLoans = loans.filter(l => l.employeeId === sheetEmp.id && l.status === "active");
              const empExpenses = expenses.filter(e => e.employeeId === sheetEmp.id);
              const empDeductions = Math.round(sheetEmp.salary * 0.15);
              return (
                <>
                  <SheetHeader>
                    <SheetTitle>{sheetEmp.firstName} {sheetEmp.lastName}</SheetTitle>
                    <p className="text-sm text-muted-foreground">{sheetEmp.designation} · {sheetEmp.department} — {selectedRun.month} {selectedRun.year}</p>
                  </SheetHeader>
                  <ScrollArea className="mt-4 pr-2" style={{ maxHeight: "calc(100vh - 120px)" }}>
                    <div className="space-y-5">
                      {/* Statutory Deductions */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Statutory Deductions</p>
                        <div className="bg-muted/50 rounded-lg px-3 py-2 text-sm flex justify-between">
                          <span>GOSI & Insurance (15%)</span>
                          <span className="font-medium text-destructive">SAR {empDeductions.toLocaleString()}</span>
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
                              <span>Total: SAR {loan.amount.toLocaleString()}</span>
                              <span>Remaining: SAR {loan.remainingBalance.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span>Monthly Deduction</span>
                              <span className="font-medium text-destructive">SAR {loan.monthlyDeduction.toLocaleString()}</span>
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
                              <span className="font-medium text-foreground">SAR {exp.amount.toLocaleString()}</span>
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
                                {adj.type === "benefit" ? "+" : "-"}SAR {adj.amount.toLocaleString()}
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
                          <Label>Amount (SAR)</Label>
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
              <DialogTitle>{confirmAction?.action === "approve" ? "Process Payroll" : "Reject Payroll"}</DialogTitle>
              <DialogDescription>{confirmAction?.action === "approve" ? "This will process and lock payroll for all employees. It cannot be changed after. Continue?" : "This will reject and cancel this payroll run. Continue?"}</DialogDescription>
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
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={() => setNewRunOpen(true)}>
          <Play className="h-4 w-4 mr-2" />New Payroll Run
        </Button>
      </PageHeader>

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Period</TableHead>
              <TableHead className="font-semibold">Employees</TableHead>
              <TableHead className="font-semibold text-right">Gross (SAR)</TableHead>
              <TableHead className="font-semibold text-right">Deductions (SAR)</TableHead>
              <TableHead className="font-semibold text-right">Net (SAR)</TableHead>
              <TableHead className="font-semibold">Run Date</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((run) => (
              <TableRow key={run.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelectedRun(run)}>
                <TableCell className="font-medium">{run.month} {run.year}</TableCell>
                <TableCell>{run.employeeCount}</TableCell>
                <TableCell className="text-right">{run.totalGross.toLocaleString()}</TableCell>
                <TableCell className="text-right text-destructive">{run.totalDeductions.toLocaleString()}</TableCell>
                <TableCell className="text-right font-semibold">{run.totalNet.toLocaleString()}</TableCell>
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
                    {run.status === "draft" && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-success" onClick={() => { setConfirmAction({ id: run.id, action: "approve" }); setConfirmOpen(true); }}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
              <p><span className="text-muted-foreground">Estimated Gross:</span> <span className="font-medium">SAR {employees.reduce((s, e) => s + e.salary, 0).toLocaleString()}</span></p>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setNewRunOpen(false)}>Cancel</Button><Button type="submit">Create Run</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmAction?.action === "approve" ? "Process Payroll" : "Reject Payroll"}</DialogTitle>
            <DialogDescription>{confirmAction?.action === "approve" ? "This will process and lock payroll for all employees. It cannot be changed after. Continue?" : "This will reject and cancel this payroll run. Continue?"}</DialogDescription>
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
