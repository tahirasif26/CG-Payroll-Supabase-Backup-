import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { usePayrollRuns } from "@/hooks/queries/usePayroll";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyTableRow } from "@/components/EmptyState";
import { Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Plus, PiggyBank, Search, ArrowLeft, Pencil, Eye, RefreshCw, PauseCircle, PlayCircle, Loader2 } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCanApprove } from "@/hooks/useCanApprove";
import { useRole } from "@/contexts/RoleContext";
import { useViewScope } from "@/contexts/ViewScopeContext";
import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";
import { useLoans, useLoanTransactions, useCreateLoan, useUpdateLoan, useAddLoanTransaction, type DbLoan } from "@/hooks/queries/useLoans";
import { useEmployees } from "@/hooks/queries/useEmployees";
import { startWorkflow } from "@/lib/workflow";

type FilterTab = "all" | "active" | "completed" | "defaulted";

const empName = (l: DbLoan) =>
  [l.employees?.first_name, l.employees?.last_name].filter(Boolean).join(" ") || "—";

export default function LoansPage() {
  const canApproveLoans = useCanApprove("loans");
  const { currentEmployeeId, hasFeature, appRole } = useRole();
  const { data: currentEmpRow } = useCurrentEmployee();
  const isEmployeeRole = appRole === "employee";
  const { toast } = useToast();
  const { scope } = useViewScope();

  const scopeEmployeeId = scope === "me" ? currentEmpRow?.id : undefined;
  const { data: loanList = [], isLoading } = useLoans({ employee_id: scopeEmployeeId });
  const { data: employeesData = [] } = useEmployees();
  const { data: payrollRuns = [] } = usePayrollRuns();
  const createLoan = useCreateLoan();
  const updateLoan = useUpdateLoan();
  const addTxn = useAddLoanTransaction();

  const [newOpen, setNewOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [emiAdjustOpen, setEmiAdjustOpen] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);

  const selectedLoan = useMemo(
    () => loanList.find((l) => l.id === selectedLoanId) ?? null,
    [loanList, selectedLoanId],
  );
  const { data: transactions = [] } = useLoanTransactions(selectedLoanId ?? undefined);

  const hrCheck = (): boolean => {
    if (!canApproveLoans) {
      toast({ title: "Not Authorized", description: "This action requires HR approval permissions.", variant: "destructive" });
      return false;
    }
    return true;
  };

  // Edit form state
  const [editAmount, setEditAmount] = useState("");
  const [editMonthly, setEditMonthly] = useState("");
  const [editRemaining, setEditRemaining] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

  // EMI adjustment
  const [newEmi, setNewEmi] = useState("");
  const [emiReason, setEmiReason] = useState("");

  // Pause EMI
  const [pauseMonths, setPauseMonths] = useState("1");
  const [pauseReason, setPauseReason] = useState("");

  // New loan — industry-standard fields
  const [newEmployee, setNewEmployee] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newTenure, setNewTenure] = useState("12"); // months
  const [newReason, setNewReason] = useState("");
  const [newAck, setNewAck] = useState(false);

  // Auto-fill loan request to the current user (self-service only)
  useEffect(() => {
    if (currentEmpRow?.id) setNewEmployee(currentEmpRow.id);
  }, [currentEmpRow?.id]);

  // Derived: monthly EMI, end date
  const principalNum = Number(newAmount) || 0;
  const tenureNum = Math.max(1, Number(newTenure) || 1);
  const totalPayable = principalNum;
  const monthlyEmi = tenureNum > 0 ? Math.ceil(totalPayable / tenureNum) : 0;
  const todayIso = new Date().toISOString().slice(0, 10);
  const computedEndDate = (() => {
    const d = new Date(todayIso);
    if (isNaN(d.getTime())) return "";
    d.setMonth(d.getMonth() + tenureNum);
    return d.toISOString().slice(0, 10);
  })();

  const activeLoans = loanList.filter((l) => l.status === "active");
  const totalOutstanding = activeLoans.reduce((s, l) => s + (l.remaining_balance || 0), 0);

  const hasCompletedPayrollDeductions = (loan: DbLoan) => {
    const completedRuns = payrollRuns.filter((r) => r.status === "completed");
    return completedRuns.length > 0 && loan.status === "active";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = currentEmpRow;
    if (!emp) {
      toast({ title: "Profile not found", description: "Your employee profile could not be loaded.", variant: "destructive" });
      return;
    }
    if (!newAck) {
      toast({ title: "Please confirm", description: "Acknowledge the deduction terms before submitting.", variant: "destructive" });
      return;
    }
    const principal = principalNum;
    const reasonText = newReason.trim();
    const created = await createLoan.mutateAsync({
      employee_id: emp.id,
      principal,
      monthly_deduction: monthlyEmi,
      start_date: todayIso,
      end_date: computedEndDate,
      reason: reasonText,
    });
    setNewOpen(false);
    setNewAmount(""); setNewTenure("12");
    setNewReason(""); setNewAck(false);
    toast({ title: "Loan Created", description: "The loan has been successfully created." });

    // Start unified approval workflow
    try {
      const submitterName = [currentEmpRow?.first_name, currentEmpRow?.last_name].filter(Boolean).join(" ") || "An employee";
      const createdClientId = (created as any)?.client_id ?? null;
      if (createdClientId && (created as any)?.id) {
        await startWorkflow({
          clientId: createdClientId,
          module: "loan",
          entityId: (created as any).id,
          requesterEmployeeId: emp.id,
          value: Math.round(principal * 100), // halalas
          valueUnit: "halalas",
          category: "loans",
          notification: {
            title: "New loan approval request",
            body: `${submitterName} requested a loan of SAR ${principal.toLocaleString()}`,
            category: "loan",
            severity: "warning",
            entityType: "loan",
            entityId: (created as any).id,
            actionUrl: "/loans",
          },
        });
      }
    } catch (err) {
      console.warn("[loan] workflow start failed:", err);
    }
  };

  const openEdit = (loan: DbLoan) => {
    setEditAmount(String(loan.principal));
    setEditMonthly(String(loan.monthly_deduction));
    setEditRemaining(String(loan.remaining_balance));
    setEditStart(loan.start_date);
    setEditEnd(loan.end_date ?? "");
    setEditing(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hrCheck() || !selectedLoan) return;
    await updateLoan.mutateAsync({
      id: selectedLoan.id,
      principal: Number(editAmount),
      monthly_deduction: Number(editMonthly),
      remaining_balance: Number(editRemaining),
      end_date: editEnd,
    });
    setEditing(false);
    toast({ title: "Loan Updated", description: "Loan details have been saved." });
  };

  const handleEmiAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hrCheck() || !selectedLoan) return;
    const emiValue = Number(newEmi);
    if (emiValue <= 0 || emiValue > selectedLoan.remaining_balance) {
      toast({ title: "Invalid EMI", description: "EMI must be greater than 0 and not exceed remaining balance.", variant: "destructive" });
      return;
    }
    const processingRun = payrollRuns.find((r) => r.status === "processing");
    const runLabel = processingRun ? `${processingRun.month} ${processingRun.year}` : "—";

    await updateLoan.mutateAsync({ id: selectedLoan.id, monthly_deduction: emiValue });
    await addTxn.mutateAsync({
      loan_id: selectedLoan.id,
      type: "emi_change",
      amount: emiValue,
      balance_after: selectedLoan.remaining_balance,
      emi_at_time: emiValue,
      date: new Date().toISOString().split("T")[0],
      note: emiReason || `EMI changed from SAR ${selectedLoan.monthly_deduction.toLocaleString()} to SAR ${emiValue.toLocaleString()} (effective ${runLabel})`,
    });
    setEmiAdjustOpen(false);
    setNewEmi(""); setEmiReason("");
    toast({ title: "EMI Updated", description: `Monthly deduction changed to SAR ${emiValue.toLocaleString()}.` });
  };

  const handlePauseEmi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hrCheck() || !selectedLoan) return;
    const processingRun = payrollRuns.find((r) => r.status === "processing");
    if (!processingRun) {
      toast({ title: "No Active Payroll", description: "EMI can only be paused when a payroll run is in processing status.", variant: "destructive" });
      return;
    }
    const months = Number(pauseMonths);
    const monthIdx = ["January","February","March","April","May","June","July","August","September","October","November","December"].indexOf(processingRun.month);
    const periodDate = new Date(processingRun.year, monthIdx, 1);
    const pausedUntilDate = new Date(periodDate);
    pausedUntilDate.setMonth(pausedUntilDate.getMonth() + months);
    const pausedUntil = pausedUntilDate.toISOString().split("T")[0];

    const currentEnd = new Date(selectedLoan.end_date ?? new Date().toISOString());
    currentEnd.setMonth(currentEnd.getMonth() + months);
    const newEndDate = currentEnd.toISOString().split("T")[0];
    const runLabel = `${processingRun.month} ${processingRun.year}`;

    await updateLoan.mutateAsync({
      id: selectedLoan.id,
      monthly_deduction: 0,
      pre_pause_emi: selectedLoan.monthly_deduction,
      paused_until: pausedUntil,
      end_date: newEndDate,
    });
    await addTxn.mutateAsync({
      loan_id: selectedLoan.id,
      type: "emi_pause",
      amount: 0,
      balance_after: selectedLoan.remaining_balance,
      emi_at_time: 0,
      date: periodDate.toISOString().split("T")[0],
      note: `EMI paused for ${months} month(s) starting ${runLabel} until ${new Date(pausedUntil).toLocaleDateString()}. Original EMI: SAR ${selectedLoan.monthly_deduction.toLocaleString()}${pauseReason ? `. Reason: ${pauseReason}` : ""}`,
    });
    setPauseOpen(false);
    setPauseMonths("1"); setPauseReason("");
    toast({ title: "EMI Paused", description: `EMI paused for ${months} month(s) until ${new Date(pausedUntil).toLocaleDateString()}.` });
  };

  const handleResumeEmi = async () => {
    if (!hrCheck() || !selectedLoan) return;
    const processingRun = payrollRuns.find((r) => r.status === "processing");
    if (!processingRun) {
      toast({ title: "No Active Payroll", description: "EMI can only be resumed when a payroll run is in processing status.", variant: "destructive" });
      return;
    }
    const originalEmi = selectedLoan.pre_pause_emi || 0;

    await updateLoan.mutateAsync({
      id: selectedLoan.id,
      monthly_deduction: originalEmi,
      pre_pause_emi: null,
      paused_until: null,
    });
    await addTxn.mutateAsync({
      loan_id: selectedLoan.id,
      type: "emi_resume",
      amount: 0,
      balance_after: selectedLoan.remaining_balance,
      emi_at_time: originalEmi,
      date: new Date().toISOString().split("T")[0],
      note: `EMI resumed. Monthly deduction restored to SAR ${originalEmi.toLocaleString()}.`,
    });
    toast({ title: "EMI Resumed", description: `Monthly deduction restored to SAR ${originalEmi.toLocaleString()}.` });
  };

  const filtered = loanList.filter((loan) => {
    // People = approval inbox: hide loans this user created (those live in Me).
    if (scope === "people" && currentEmpRow?.id && loan.employee_id === currentEmpRow.id) return false;
    if (filter !== "all" && loan.status !== filter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return empName(loan).toLowerCase().includes(q) || loan.status.toLowerCase().includes(q);
  });

  const isCompleted = selectedLoan?.status === "completed";
  const lockedFields = selectedLoan ? hasCompletedPayrollDeductions(selectedLoan) : false;

  // Detail view
  if (selectedLoan) {
    const loan = selectedLoan;
    const paidAmount = loan.principal - loan.remaining_balance;
    const progress = loan.principal > 0 ? Math.round((paidAmount / loan.principal) * 100) : 0;
    const remainingMonths = loan.monthly_deduction > 0 ? Math.ceil(loan.remaining_balance / loan.monthly_deduction) : 0;
    const isPaused = !!loan.paused_until;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { setSelectedLoanId(null); setEditing(false); }}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Loan — {empName(loan)}</h1>
            <p className="text-sm text-muted-foreground">Loan #{loan.id.slice(0, 8)} details</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <StatusBadge status={loan.status as any} />
            {isPaused && (
              <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                <PauseCircle className="h-3 w-3 mr-1" />EMI Paused
              </Badge>
            )}
            {!isCompleted && !editing && (
              <>
                {isPaused ? (
                  <Button variant="outline" size="sm" className="border-green-300 text-green-700 hover:bg-green-50" onClick={handleResumeEmi}>
                    <PlayCircle className="h-4 w-4 mr-2" />Resume EMI
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => setPauseOpen(true)}>
                    <PauseCircle className="h-4 w-4 mr-2" />Pause EMI
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => { setNewEmi(String(loan.monthly_deduction)); setEmiAdjustOpen(true); }}>
                  <RefreshCw className="h-4 w-4 mr-2" />Adjust EMI
                </Button>
                <Button variant="outline" size="sm" onClick={() => openEdit(loan)}>
                  <Pencil className="h-4 w-4 mr-2" />Edit
                </Button>
              </>
            )}
          </div>
        </div>

        {!editing ? (
          <>
            {isPaused && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2 text-sm">
                <PauseCircle className="h-4 w-4 text-amber-600" />
                <span className="text-amber-800 font-medium">
                  EMI paused until {new Date(loan.paused_until!).toLocaleDateString()} — Original EMI: SAR {loan.pre_pause_emi?.toLocaleString()}
                </span>
              </div>
            )}
            <Card>
              <CardHeader><CardTitle className="text-base">Loan Details</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Employee</span><p className="font-medium">{empName(loan)}</p></div>
                  <div><span className="text-muted-foreground">Loan Amount</span><p className="font-semibold">SAR {loan.principal.toLocaleString()}</p></div>
                  <div><span className="text-muted-foreground">Monthly EMI</span><p className="font-medium">SAR {loan.monthly_deduction.toLocaleString()}</p></div>
                  <div><span className="text-muted-foreground">Remaining Balance</span><p className="font-semibold text-destructive">SAR {loan.remaining_balance.toLocaleString()}</p></div>
                  <div><span className="text-muted-foreground">Amount Paid</span><p className="font-semibold text-green-600">SAR {paidAmount.toLocaleString()}</p></div>
                  <div><span className="text-muted-foreground">Progress</span><p className="font-medium">{progress}%</p></div>
                  <div><span className="text-muted-foreground">Start Date</span><p className="font-medium">{new Date(loan.start_date).toLocaleDateString()}</p></div>
                  <div><span className="text-muted-foreground">End Date</span><p className="font-medium">{loan.end_date ? new Date(loan.end_date).toLocaleDateString() : "—"}</p></div>
                  <div><span className="text-muted-foreground">Est. Months Remaining</span><p className="font-medium">{remainingMonths}</p></div>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">SAR {paidAmount.toLocaleString()} of SAR {loan.principal.toLocaleString()} repaid</p>
                </div>
                {lockedFields && (
                  <p className="text-xs text-muted-foreground mt-3 bg-muted/50 rounded p-2">
                    ⚠ Some deductions are already part of completed payroll runs. The loan amount cannot be reduced below the already deducted total.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Transaction History</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold text-right">Amount (SAR)</TableHead>
                      <TableHead className="font-semibold text-right">EMI at Time</TableHead>
                      <TableHead className="font-semibold text-right">Balance After</TableHead>
                      <TableHead className="font-semibold">Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No transactions recorded</TableCell></TableRow>
                    ) : (
                      transactions.map((txn) => (
                        <TableRow key={txn.id}>
                          <TableCell className="text-sm">{new Date(txn.date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge
                              variant={txn.type === "disbursement" ? "default" : txn.type === "emi_change" ? "secondary" : "outline"}
                              className={`text-xs ${txn.type === "emi_pause" ? "bg-amber-100 text-amber-800 border-amber-300" : txn.type === "emi_resume" ? "bg-green-100 text-green-800 border-green-300" : ""}`}
                            >
                              {txn.type === "disbursement" ? "Disbursement" : txn.type === "emi_change" ? "EMI Change" : txn.type === "emi_pause" ? "EMI Paused" : txn.type === "emi_resume" ? "EMI Resumed" : "Deduction"}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right font-medium ${txn.type === "disbursement" ? "text-primary" : txn.type === "deduction" ? "text-destructive" : "text-muted-foreground"}`}>
                            {txn.type === "disbursement" ? "+" : txn.type === "deduction" ? "−" : ""}{txn.amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-sm">{txn.emi_at_time.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-medium text-sm">{txn.balance_after.toLocaleString()}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{txn.note || "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardHeader><CardTitle className="text-base">Edit Loan</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Loan Amount (SAR)</Label>
                    <Input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} required min={1} />
                  </div>
                  <div className="space-y-2">
                    <Label>Monthly Deduction (SAR)</Label>
                    <Input type="number" value={editMonthly} onChange={e => setEditMonthly(e.target.value)} required min={1} />
                  </div>
                  <div className="space-y-2">
                    <Label>Remaining Balance (SAR)</Label>
                    <Input type="number" value={editRemaining} onChange={e => setEditRemaining(e.target.value)} required min={0} />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input type="date" value={editEnd} onChange={e => setEditEnd(e.target.value)} required />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                  <Button type="submit" disabled={updateLoan.isPending}>Save Changes</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* EMI Adjustment Dialog */}
        <Dialog open={emiAdjustOpen} onOpenChange={setEmiAdjustOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adjust Monthly EMI</DialogTitle>
              <DialogDescription>
                Change the monthly deduction on the remaining balance of SAR {loan.remaining_balance.toLocaleString()}.
                Current EMI: SAR {loan.monthly_deduction.toLocaleString()}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEmiAdjust} className="space-y-4">
              <div className="space-y-2">
                <Label>New Monthly EMI (SAR)</Label>
                <Input type="number" placeholder="0" value={newEmi} onChange={e => setNewEmi(e.target.value)} required min={1} max={loan.remaining_balance} />
                {Number(newEmi) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Est. {Math.ceil(loan.remaining_balance / Number(newEmi))} months remaining at this rate
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Reason for Change</Label>
                <Textarea placeholder="e.g. Employee requested reduced deduction due to..." value={emiReason} onChange={e => setEmiReason(e.target.value)} rows={2} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEmiAdjustOpen(false)}>Cancel</Button>
                <Button type="submit">Update EMI</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Pause EMI Dialog */}
        <Dialog open={pauseOpen} onOpenChange={setPauseOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pause EMI Deduction</DialogTitle>
              <DialogDescription>
                Temporarily pause the monthly EMI deduction for this loan. The end date will be extended accordingly.
                Current EMI: SAR {loan.monthly_deduction.toLocaleString()}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handlePauseEmi} className="space-y-4">
              <div className="space-y-2">
                <Label>Number of Months to Pause</Label>
                <Select value={pauseMonths} onValueChange={setPauseMonths}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map(m => (
                      <SelectItem key={m} value={String(m)}>{m} month{m > 1 ? "s" : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reason (optional)</Label>
                <Textarea placeholder="e.g. Employee on unpaid leave" value={pauseReason} onChange={e => setPauseReason(e.target.value)} rows={2} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPauseOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">Pause EMI</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={scope === "me" ? "My Loans" : "Employee Loans"}
        description={scope === "me"
          ? "View your active loans and repayment schedule."
          : "Track and manage employee loan disbursements."}
      >
        {scope === "me" && hasFeature("loans.request") && (
          <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />New Loan
          </Button>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard title="Active Loans" value={activeLoans.length} icon={PiggyBank} variant="warning" />
        <StatCard title="Total Outstanding" value={`SAR ${totalOutstanding.toLocaleString()}`} icon={PiggyBank} variant="info" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by employee name or status..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="defaulted">Defaulted</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Employee</TableHead>
              <TableHead className="font-semibold text-right">Loan Amount</TableHead>
              <TableHead className="font-semibold text-right">Remaining</TableHead>
              <TableHead className="font-semibold text-right">Monthly EMI</TableHead>
              <TableHead className="font-semibold">Start</TableHead>
              <TableHead className="font-semibold">End</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin inline" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <EmptyTableRow colSpan={8} icon={Banknote} title="No loans yet" description="Approved employee loans will appear here." />
            ) : filtered.map((loan) => (
              <TableRow key={loan.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedLoanId(loan.id)}>
                <TableCell className="font-medium">{empName(loan)}</TableCell>
                <TableCell className="text-right">SAR {loan.principal.toLocaleString()}</TableCell>
                <TableCell className="text-right font-semibold">SAR {loan.remaining_balance.toLocaleString()}</TableCell>
                <TableCell className="text-right">SAR {loan.monthly_deduction.toLocaleString()}</TableCell>
                <TableCell>{new Date(loan.start_date).toLocaleDateString()}</TableCell>
                <TableCell>{loan.end_date ? new Date(loan.end_date).toLocaleDateString() : "—"}</TableCell>
                <TableCell className="flex items-center gap-1">
                  <StatusBadge status={loan.status as any} />
                  {loan.paused_until && (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                      <PauseCircle className="h-3 w-3 mr-1" />Paused
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedLoanId(loan.id)} title="View">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {loan.status !== "completed" && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedLoanId(loan.id); openEdit(loan); }} title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Loan Request</DialogTitle>
            <DialogDescription>Submit a loan request. Repayment will be deducted from your monthly payroll.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Applicant</Label>
              <Input
                value={
                  currentEmpRow
                    ? `${currentEmpRow.first_name ?? ""} ${currentEmpRow.last_name ?? ""}`.trim()
                    : ""
                }
                disabled
                readOnly
              />
              <p className="text-xs text-muted-foreground">Loan requests are always submitted under your own account.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Loan Amount (SAR)</Label>
                <Input type="number" placeholder="0" value={newAmount}
                  onChange={e => setNewAmount(e.target.value)} required min={1} step="1" />
              </div>
              <div className="space-y-2">
                <Label>Tenure (months)</Label>
                <Input type="number" value={newTenure}
                  onChange={e => setNewTenure(e.target.value)} required min={1} max={120} step="1" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reason / Purpose</Label>
              <Textarea placeholder="Brief reason for the loan request..."
                value={newReason} onChange={e => setNewReason(e.target.value)} required maxLength={500} />
            </div>

            {/* Summary */}
            <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly EMI</span>
                <span className="font-semibold">SAR {monthlyEmi.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Payable</span>
                <span>SAR {Math.round(totalPayable).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Repayment Ends</span>
                <span>{computedEndDate || "—"}</span>
              </div>
            </div>

            <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={newAck}
                onChange={e => setNewAck(e.target.checked)}
                className="mt-0.5"
              />
              <span>I authorize the company to deduct the monthly EMI shown above from my salary until the loan is fully repaid.</span>
            </label>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createLoan.isPending || !newAck || principalNum <= 0}>
                {createLoan.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
