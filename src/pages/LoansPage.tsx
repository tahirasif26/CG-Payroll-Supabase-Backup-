import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { loans, employees, payrollRuns } from "@/data/mockData";
import { Loan, LoanTransaction } from "@/types/hcm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, PiggyBank, Search, ArrowLeft, Pencil, Eye, RefreshCw } from "lucide-react";
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

export default function LoansPage() {
  const [loanList, setLoanList] = useState<Loan[]>(() => [...loans]);
  const [newOpen, setNewOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed" | "defaulted">("all");
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [editing, setEditing] = useState(false);
  const [emiAdjustOpen, setEmiAdjustOpen] = useState(false);
  const { toast } = useToast();

  // Edit form state
  const [editAmount, setEditAmount] = useState("");
  const [editMonthly, setEditMonthly] = useState("");
  const [editRemaining, setEditRemaining] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

  // EMI adjustment state
  const [newEmi, setNewEmi] = useState("");
  const [emiReason, setEmiReason] = useState("");

  // New loan form state
  const [newEmployee, setNewEmployee] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newMonthly, setNewMonthly] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");

  const syncLoans = (updater: (prev: Loan[]) => Loan[]) => {
    setLoanList(prev => {
      const next = updater(prev);
      loans.length = 0;
      next.forEach(l => loans.push(l));
      return next;
    });
  };

  const activeLoans = loanList.filter((l) => l.status === "active");
  const totalOutstanding = activeLoans.reduce((s, l) => s + l.remainingBalance, 0);

  const hasCompletedPayrollDeductions = (loan: Loan) => {
    const completedRuns = payrollRuns.filter(r => r.status === "completed");
    return completedRuns.length > 0 && loan.status === "active";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(em => em.id === newEmployee);
    if (!emp) return;
    const loanAmount = Number(newAmount);
    const newLoan: Loan = {
      id: String(Date.now()),
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      amount: loanAmount,
      remainingBalance: loanAmount,
      monthlyDeduction: Number(newMonthly),
      startDate: newStart,
      endDate: newEnd,
      status: "active",
      transactions: [{
        id: `t-${Date.now()}`,
        payrollRunId: "0",
        payrollLabel: new Date(newStart).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        type: "disbursement",
        amount: loanAmount,
        balanceAfter: loanAmount,
        emiAtTime: Number(newMonthly),
        date: newStart,
        note: "Loan disbursed",
      }],
    };
    syncLoans(prev => [...prev, newLoan]);
    setNewOpen(false);
    setNewEmployee(""); setNewAmount(""); setNewMonthly(""); setNewStart(""); setNewEnd("");
    toast({ title: "Loan Created", description: "The loan has been successfully created." });
  };

  const openEdit = (loan: Loan) => {
    setEditAmount(String(loan.amount));
    setEditMonthly(String(loan.monthlyDeduction));
    setEditRemaining(String(loan.remainingBalance));
    setEditStart(loan.startDate);
    setEditEnd(loan.endDate);
    setEditing(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;
    syncLoans(prev => prev.map(l => l.id === selectedLoan.id ? {
      ...l,
      amount: Number(editAmount),
      monthlyDeduction: Number(editMonthly),
      remainingBalance: Number(editRemaining),
      startDate: editStart,
      endDate: editEnd,
    } : l));
    setSelectedLoan(prev => prev ? {
      ...prev,
      amount: Number(editAmount),
      monthlyDeduction: Number(editMonthly),
      remainingBalance: Number(editRemaining),
      startDate: editStart,
      endDate: editEnd,
    } : null);
    setEditing(false);
    toast({ title: "Loan Updated", description: "Loan details have been saved." });
  };

  const handleEmiAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;
    const emiValue = Number(newEmi);
    if (emiValue <= 0 || emiValue > selectedLoan.remainingBalance) {
      toast({ title: "Invalid EMI", description: "EMI must be greater than 0 and not exceed remaining balance.", variant: "destructive" });
      return;
    }

    const txn: LoanTransaction = {
      id: `t-${Date.now()}`,
      payrollRunId: "0",
      payrollLabel: "—",
      type: "emi_change",
      amount: emiValue,
      balanceAfter: selectedLoan.remainingBalance,
      emiAtTime: emiValue,
      date: new Date().toISOString().split("T")[0],
      note: emiReason || `EMI changed from SAR ${selectedLoan.monthlyDeduction.toLocaleString()} to SAR ${emiValue.toLocaleString()}`,
    };

    syncLoans(prev => prev.map(l => l.id === selectedLoan.id ? {
      ...l,
      monthlyDeduction: emiValue,
      transactions: [...(l.transactions || []), txn],
    } : l));
    setSelectedLoan(prev => prev ? {
      ...prev,
      monthlyDeduction: emiValue,
      transactions: [...(prev.transactions || []), txn],
    } : null);

    setEmiAdjustOpen(false);
    setNewEmi("");
    setEmiReason("");
    toast({ title: "EMI Updated", description: `Monthly deduction changed to SAR ${emiValue.toLocaleString()}.` });
  };

  const filtered = loanList.filter(loan => {
    if (filter !== "all" && loan.status !== filter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return loan.employeeName.toLowerCase().includes(q) ||
      loan.status.toLowerCase().includes(q);
  });

  const isCompleted = selectedLoan?.status === "completed";
  const lockedFields = selectedLoan ? hasCompletedPayrollDeductions(selectedLoan) : false;

  // Detail view
  if (selectedLoan) {
    const loan = loanList.find(l => l.id === selectedLoan.id) || selectedLoan;
    const paidAmount = loan.amount - loan.remainingBalance;
    const progress = loan.amount > 0 ? Math.round((paidAmount / loan.amount) * 100) : 0;
    const transactions = loan.transactions || [];
    const remainingMonths = loan.monthlyDeduction > 0 ? Math.ceil(loan.remainingBalance / loan.monthlyDeduction) : 0;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { setSelectedLoan(null); setEditing(false); }}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Loan — {loan.employeeName}</h1>
            <p className="text-sm text-muted-foreground">Loan #{loan.id} details</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <StatusBadge status={loan.status} />
            {!isCompleted && !editing && (
              <>
                <Button variant="outline" size="sm" onClick={() => { setNewEmi(String(loan.monthlyDeduction)); setEmiAdjustOpen(true); }}>
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
            <Card>
              <CardHeader><CardTitle className="text-base">Loan Details</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Employee</span><p className="font-medium">{loan.employeeName}</p></div>
                  <div><span className="text-muted-foreground">Loan Amount</span><p className="font-semibold">SAR {loan.amount.toLocaleString()}</p></div>
                  <div><span className="text-muted-foreground">Monthly EMI</span><p className="font-medium">SAR {loan.monthlyDeduction.toLocaleString()}</p></div>
                  <div><span className="text-muted-foreground">Remaining Balance</span><p className="font-semibold text-destructive">SAR {loan.remainingBalance.toLocaleString()}</p></div>
                  <div><span className="text-muted-foreground">Amount Paid</span><p className="font-semibold text-green-600">SAR {paidAmount.toLocaleString()}</p></div>
                  <div><span className="text-muted-foreground">Progress</span><p className="font-medium">{progress}%</p></div>
                  <div><span className="text-muted-foreground">Start Date</span><p className="font-medium">{new Date(loan.startDate).toLocaleDateString()}</p></div>
                  <div><span className="text-muted-foreground">End Date</span><p className="font-medium">{new Date(loan.endDate).toLocaleDateString()}</p></div>
                  <div><span className="text-muted-foreground">Est. Months Remaining</span><p className="font-medium">{remainingMonths}</p></div>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">SAR {paidAmount.toLocaleString()} of SAR {loan.amount.toLocaleString()} repaid</p>
                </div>
                {lockedFields && (
                  <p className="text-xs text-muted-foreground mt-3 bg-muted/50 rounded p-2">
                    ⚠ Some deductions are already part of completed payroll runs. The loan amount cannot be reduced below the already deducted total.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Transaction History */}
            <Card>
              <CardHeader><CardTitle className="text-base">Transaction History</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Payroll Period</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold text-right">Amount (SAR)</TableHead>
                      <TableHead className="font-semibold text-right">EMI at Time</TableHead>
                      <TableHead className="font-semibold text-right">Balance After</TableHead>
                      <TableHead className="font-semibold">Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No transactions recorded</TableCell></TableRow>
                    ) : (
                      transactions.map((txn) => (
                        <TableRow key={txn.id}>
                          <TableCell className="text-sm">{new Date(txn.date).toLocaleDateString()}</TableCell>
                          <TableCell className="text-sm font-medium">{txn.payrollLabel}</TableCell>
                          <TableCell>
                            <Badge variant={txn.type === "disbursement" ? "default" : txn.type === "emi_change" ? "secondary" : "outline"} className="text-xs">
                              {txn.type === "disbursement" ? "Disbursement" : txn.type === "emi_change" ? "EMI Change" : "Deduction"}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right font-medium ${txn.type === "disbursement" ? "text-primary" : txn.type === "deduction" ? "text-destructive" : "text-muted-foreground"}`}>
                            {txn.type === "disbursement" ? "+" : txn.type === "deduction" ? "−" : ""}{txn.amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-sm">{txn.emiAtTime.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-medium text-sm">{txn.balanceAfter.toLocaleString()}</TableCell>
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
                    <Label>Start Date</Label>
                    <Input type="date" value={editStart} onChange={e => setEditStart(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input type="date" value={editEnd} onChange={e => setEditEnd(e.target.value)} required />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                  <Button type="submit">Save Changes</Button>
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
                Change the monthly deduction on the remaining balance of SAR {loan.remainingBalance.toLocaleString()}.
                Current EMI: SAR {loan.monthlyDeduction.toLocaleString()}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEmiAdjust} className="space-y-4">
              <div className="space-y-2">
                <Label>New Monthly EMI (SAR)</Label>
                <Input type="number" placeholder="0" value={newEmi} onChange={e => setNewEmi(e.target.value)} required min={1} max={loan.remainingBalance} />
                {Number(newEmi) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Est. {Math.ceil(loan.remainingBalance / Number(newEmi))} months remaining at this rate
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Employee Loans" description="Track and manage employee loan disbursements.">
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />New Loan
        </Button>
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
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
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
            {filtered.map((loan) => (
              <TableRow key={loan.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedLoan(loan)}>
                <TableCell className="font-medium">{loan.employeeName}</TableCell>
                <TableCell className="text-right">SAR {loan.amount.toLocaleString()}</TableCell>
                <TableCell className="text-right font-semibold">SAR {loan.remainingBalance.toLocaleString()}</TableCell>
                <TableCell className="text-right">SAR {loan.monthlyDeduction.toLocaleString()}</TableCell>
                <TableCell>{new Date(loan.startDate).toLocaleDateString()}</TableCell>
                <TableCell>{new Date(loan.endDate).toLocaleDateString()}</TableCell>
                <TableCell><StatusBadge status={loan.status} /></TableCell>
                <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedLoan(loan)} title="View">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {loan.status !== "completed" && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedLoan(loan); openEdit(loan); }} title="Edit">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Employee Loan</DialogTitle>
            <DialogDescription>Create a new loan for an employee.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={newEmployee} onValueChange={setNewEmployee} required>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Loan Amount (SAR)</Label>
              <Input type="number" placeholder="0" value={newAmount} onChange={e => setNewAmount(e.target.value)} required min={1} />
            </div>
            <div className="space-y-2">
              <Label>Monthly Deduction (SAR)</Label>
              <Input type="number" placeholder="0" value={newMonthly} onChange={e => setNewMonthly(e.target.value)} required min={1} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={newStart} onChange={e => setNewStart(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)} required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
              <Button type="submit">Create Loan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
