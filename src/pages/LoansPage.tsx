import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { loans, employees, payrollRuns } from "@/data/mockData";
import { Loan } from "@/types/hcm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, PiggyBank, Search, ArrowLeft, Pencil, Eye } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LoansPage() {
  const [loanList, setLoanList] = useState<Loan[]>(() => [...loans]);
  const [newOpen, setNewOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed" | "defaulted">("all");
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [editing, setEditing] = useState(false);
  const { toast } = useToast();

  // Edit form state
  const [editAmount, setEditAmount] = useState("");
  const [editMonthly, setEditMonthly] = useState("");
  const [editRemaining, setEditRemaining] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

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

  // Check if a loan has deductions in a completed payroll run
  const hasCompletedPayrollDeductions = (loan: Loan) => {
    const completedRuns = payrollRuns.filter(r => r.status === "completed");
    return completedRuns.length > 0 && loan.status === "active";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(em => em.id === newEmployee);
    if (!emp) return;
    const newLoan: Loan = {
      id: String(Date.now()),
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      amount: Number(newAmount),
      remainingBalance: Number(newAmount),
      monthlyDeduction: Number(newMonthly),
      startDate: newStart,
      endDate: newEnd,
      status: "active",
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
              <Button variant="outline" size="sm" onClick={() => openEdit(loan)}>
                <Pencil className="h-4 w-4 mr-2" />Edit
              </Button>
            )}
          </div>
        </div>

        {!editing ? (
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
                <div><span className="text-muted-foreground">Status</span><p><StatusBadge status={loan.status} /></p></div>
              </div>
              {/* Progress bar */}
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
