import { useState, useEffect, lazy, Suspense } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/StatusBadge";
import { expenses, payrollRuns } from "@/data/mockData";
import { useEmployees } from "@/contexts/EmployeeContext";
import { ExpenseReimbursement, Employee } from "@/types/hcm";
import { useApprovals } from "@/contexts/ApprovalContext";
import { useRole } from "@/contexts/RoleContext";
import { useAdvances } from "@/contexts/AdvanceContext";
import { defaultExchangeRates, availableCurrencies } from "@/data/settingsData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  Pencil,
  Trash2,
  FileText,
  Paperclip,
  BarChart3,
  ScanLine,
  Navigation,
  Download,
  Loader2,
} from "lucide-react";
import * as XLSX from "xlsx";
import { AutoScanDialog } from "@/components/expenses/AutoScanDialog";
import { useNavigate } from "react-router-dom";
import ExpenseAnalytics from "@/components/expenses/ExpenseAnalytics";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function getEmployeePayCurrency(employeeId: string, emps: Employee[]): string {
  const emp = emps.find((e) => e.id === employeeId);
  return emp?.payCurrency || "SAR";
}

function getExchangeRate(fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) return 1;
  // Both rates are relative to reporting currency (SAR)
  const fromRate =
    fromCurrency === "SAR"
      ? 1
      : defaultExchangeRates.find((r) => r.fromCurrency === fromCurrency)?.toReportingRate || 1;
  const toRate =
    toCurrency === "SAR" ? 1 : defaultExchangeRates.find((r) => r.fromCurrency === toCurrency)?.toReportingRate || 1;
  return fromRate / toRate;
}

export default function ExpensesPage() {
  const { employees } = useEmployees();
  const { canUserApproveExpense } = useApprovals();
  const { currentEmployeeId } = useRole();
  const { getEmployeeAdvances, useAdvanceAmount } = useAdvances();
  const [expenseList, setExpenseList] = useState<ExpenseReimbursement[]>(expenses);

  // Pick up GPS mileage entries from sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem("newMileageEntry");
    if (raw) {
      sessionStorage.removeItem("newMileageEntry");
      try {
        const entry = JSON.parse(raw);
        const newExp: ExpenseReimbursement = {
          id: String(Date.now()),
          employeeId: entry.employeeId,
          employeeName: entry.employeeName,
          category: "Mileage",
          amount: entry.amount,
          expenseDate: entry.date,
          submissionDate: new Date().toISOString().split("T")[0],
          status: "pending",
          description: `GPS Trip: ${entry.distance} km × SAR ${entry.rate}/km${entry.notes ? ` — ${entry.notes}` : ""}`,
          attachments: [],
        };
        setExpenseList((prev) => {
          // Avoid duplicates on hot-reload
          if (
            prev.some(
              (e) =>
                e.employeeId === newExp.employeeId &&
                e.description === newExp.description &&
                e.expenseDate === newExp.expenseDate,
            )
          )
            return prev;
          expenses.push(newExp);
          return [...prev, newExp];
        });
        toast({ title: "Mileage Claim Added", description: `GPS trip added to your expense claims.` });
      } catch {
        /* ignore parse errors */
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [newOpen, setNewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedExp, setSelectedExp] = useState<ExpenseReimbursement | null>(null);
  const [search, setSearch] = useState("");
  const [autoScanOpen, setAutoScanOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Form state
  const [formEmployee, setFormEmployee] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formExpenseDate, setFormExpenseDate] = useState<Date | undefined>();
  const [formCurrency, setFormCurrency] = useState("");
  const [formExchangeRate, setFormExchangeRate] = useState("");
  const [formAdvanceId, setFormAdvanceId] = useState("");

  const selectedEmployeePayCurrency = formEmployee ? getEmployeePayCurrency(formEmployee, employees) : "SAR";

  const resetForm = () => {
    setFormEmployee("");
    setFormCategory("");
    setFormAmount("");
    setFormDescription("");
    setFormExpenseDate(undefined);
    setFormCurrency("");
    setFormExchangeRate("");
    setFormAdvanceId("");
  };

  // When employee changes, default the expense currency to their pay currency
  const handleEmployeeChange = (empId: string) => {
    setFormEmployee(empId);
    const payCurrency = getEmployeePayCurrency(empId, employees);
    setFormCurrency(payCurrency);
    setFormExchangeRate("1");
    setFormAdvanceId(""); // Reset advance when employee changes
  };

  // When expense currency changes, auto-fill exchange rate
  const handleCurrencyChange = (currency: string) => {
    setFormCurrency(currency);
    const payCurrency = formEmployee ? getEmployeePayCurrency(formEmployee, employees) : "SAR";
    const rate = getExchangeRate(currency, payCurrency);
    setFormExchangeRate(rate.toFixed(4));
  };

  const computeConvertedAmount = (): number => {
    if (!formAmount || !formExchangeRate) return 0;
    return Math.round(Number(formAmount) * Number(formExchangeRate) * 100) / 100;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((em) => em.id === formEmployee);
    if (!emp || !formExpenseDate) return;
    const payCurrency = getEmployeePayCurrency(emp.id, employees);
    const expCurrency = formCurrency || payCurrency;
    const isMultiCurrency = expCurrency !== payCurrency;
    const convertedAmount = isMultiCurrency ? computeConvertedAmount() : Number(formAmount);

    const newExp: ExpenseReimbursement = {
      id: String(Date.now()),
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      category: formCategory,
      amount: convertedAmount, // Amount in pay currency
      expenseDate: formExpenseDate.toISOString().split("T")[0],
      submissionDate: new Date().toISOString().split("T")[0],
      status: "pending",
      description: formDescription,
      attachments: [],
      ...(isMultiCurrency
        ? {
            currency: expCurrency,
            exchangeRate: Number(formExchangeRate),
            originalAmount: Number(formAmount),
          }
        : {}),
      ...(formAdvanceId && formAdvanceId !== "none" ? { advanceId: formAdvanceId } : {}),
    };
    // Update advance used amount
    if (formAdvanceId && formAdvanceId !== "none") {
      useAdvanceAmount(formAdvanceId, convertedAmount);
    }
    setExpenseList((prev) => [...prev, newExp]);
    expenses.push(newExp);
    setNewOpen(false);
    resetForm();
    toast({ title: "Expense Claim Submitted", description: "Your expense claim has been submitted for approval." });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExp) return;
    const emp = employees.find((em) => em.id === formEmployee);
    if (!emp || !formExpenseDate) return;
    const payCurrency = getEmployeePayCurrency(emp.id, employees);
    const expCurrency = formCurrency || payCurrency;
    const isMultiCurrency = expCurrency !== payCurrency;
    const convertedAmount = isMultiCurrency ? computeConvertedAmount() : Number(formAmount);

    const updated: ExpenseReimbursement = {
      ...selectedExp,
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      category: formCategory,
      amount: convertedAmount,
      description: formDescription,
      expenseDate: formExpenseDate.toISOString().split("T")[0],
      ...(isMultiCurrency
        ? {
            currency: expCurrency,
            exchangeRate: Number(formExchangeRate),
            originalAmount: Number(formAmount),
          }
        : {
            currency: undefined,
            exchangeRate: undefined,
            originalAmount: undefined,
          }),
    };
    setExpenseList((prev) => prev.map((ex) => (ex.id === updated.id ? updated : ex)));
    const idx = expenses.findIndex((ex) => ex.id === updated.id);
    if (idx >= 0) expenses[idx] = updated;
    setEditOpen(false);
    resetForm();
    toast({ title: "Expense Updated", description: "Expense claim has been updated." });
  };

  const handleDelete = () => {
    if (!selectedExp) return;
    setExpenseList((prev) => prev.filter((ex) => ex.id !== selectedExp.id));
    const idx = expenses.findIndex((ex) => ex.id === selectedExp.id);
    if (idx >= 0) expenses.splice(idx, 1);
    setDeleteOpen(false);
    setSelectedExp(null);
    toast({ title: "Deleted", description: "Expense claim has been deleted." });
  };

  const handleApprove = (exp: ExpenseReimbursement) => {
    const { allowed, limit } = canUserApproveExpense(currentEmployeeId, exp.amount);
    if (!allowed) {
      if (limit === 0) {
        toast({
          title: "Not Authorized",
          description: "You do not have expense approval permissions.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Limit Exceeded",
          description: `Your approval limit is SAR ${limit.toLocaleString()}. This expense of SAR ${exp.amount.toLocaleString()} requires a higher authority.`,
          variant: "destructive",
        });
      }
      return;
    }
    const openRun = payrollRuns.find((r) => r.status === "processing" || r.status === "draft");
    const updated = { ...exp, status: "approved" as const, payrollRunId: openRun?.id };
    setExpenseList((prev) => prev.map((ex) => (ex.id === exp.id ? updated : ex)));
    const idx = expenses.findIndex((ex) => ex.id === exp.id);
    if (idx >= 0) expenses[idx] = updated;
    toast({
      title: "Approved",
      description: openRun
        ? `Expense approved and linked to ${openRun.month} ${openRun.year} payroll.`
        : "Expense approved. Will be captured in the next payroll run.",
    });
  };

  const handleReject = (exp: ExpenseReimbursement) => {
    const updated = { ...exp, status: "rejected" as const };
    setExpenseList((prev) => prev.map((ex) => (ex.id === exp.id ? updated : ex)));
    const idx = expenses.findIndex((ex) => ex.id === exp.id);
    if (idx >= 0) expenses[idx] = updated;
    toast({ title: "Rejected", description: "Expense claim has been rejected." });
  };

  const openEdit = (exp: ExpenseReimbursement) => {
    setSelectedExp(exp);
    setFormEmployee(exp.employeeId);
    setFormCategory(exp.category);
    setFormAmount(String(exp.originalAmount ?? exp.amount));
    setFormDescription(exp.description);
    setFormExpenseDate(new Date(exp.expenseDate));
    const payCurrency = getEmployeePayCurrency(exp.employeeId, employees);
    setFormCurrency(exp.currency || payCurrency);
    setFormExchangeRate(exp.exchangeRate ? String(exp.exchangeRate) : "1");
    setEditOpen(true);
  };

  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [exporting, setExporting] = useState(false);

  const filtered = expenseList
    .filter((exp) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        exp.employeeName.toLowerCase().includes(q) ||
        exp.category.toLowerCase().includes(q) ||
        exp.description.toLowerCase().includes(q);
      const matchesCategory = filterCategory === "all" || exp.category === filterCategory;
      const matchesStatus = filterStatus === "all" || exp.status === filterStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());

  const handleExport = async () => {
    setExporting(true);
    // Small delay to show loading state
    await new Promise((r) => setTimeout(r, 300));
    try {
      const rows = filtered.map((exp) => {
        const payCurrency = getEmployeePayCurrency(exp.employeeId, employees);
        const amountStr = exp.currency && exp.originalAmount && exp.currency !== payCurrency
          ? `${exp.currency} ${exp.originalAmount} (${payCurrency} ${exp.amount})`
          : `${payCurrency} ${exp.amount}`;
        const payrollLabel = getPayrollLabel(exp.payrollRunId);
        return {
          "Employee": exp.employeeName,
          "Category": exp.category,
          "Description": exp.description,
          "Amount": amountStr,
          "Expense Date": new Date(exp.expenseDate).toLocaleDateString(),
          "Submitted": new Date(exp.submissionDate).toLocaleDateString(),
          "Status": exp.status.charAt(0).toUpperCase() + exp.status.slice(1),
          "Payroll Run": payrollLabel || "—",
          "Paid Date": exp.paidDate ? new Date(exp.paidDate).toLocaleDateString() : "—",
          "Payment Method": exp.paymentMethod || "—",
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Expenses");
      const today = format(new Date(), "yyyy_MM_dd");
      XLSX.writeFile(wb, `Expenses_Export_${today}.xlsx`);
      toast({ title: "Exported", description: `${rows.length} records exported successfully.` });
    } catch {
      toast({ title: "Export Failed", description: "Could not generate the export file.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const getPayrollLabel = (payrollRunId?: string) => {
    if (!payrollRunId) return null;
    const run = payrollRuns.find((r) => r.id === payrollRunId);
    return run ? `${run.month} ${run.year}` : null;
  };

  const formatExpenseAmount = (exp: ExpenseReimbursement) => {
    const payCurrency = getEmployeePayCurrency(exp.employeeId, employees);
    if (exp.currency && exp.originalAmount && exp.currency !== payCurrency) {
      return (
        <span>
          <span className="font-semibold">
            {exp.currency} {exp.originalAmount.toLocaleString()}
          </span>
          <span className="text-muted-foreground text-xs ml-1">
            ({payCurrency} {exp.amount.toLocaleString()})
          </span>
        </span>
      );
    }
    return (
      <span className="font-semibold">
        {payCurrency} {exp.amount.toLocaleString()}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Expense Reimbursement" description="Submit, review, and track expense claims." />

      <div className="flex items-center justify-between">
        <div />
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="gradient-ey text-primary-foreground font-semibold"
            onClick={() => {
              resetForm();
              setNewOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Claim
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAutoScanOpen(true)}>
            <ScanLine className="h-4 w-4 mr-2" />
            Auto Scan
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/expenses/gps")}>
            <Navigation className="h-4 w-4 mr-2" />
            GPS Tracking
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, category, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Travel">Travel</SelectItem>
              <SelectItem value="Client Entertainment">Client Entertainment</SelectItem>
              <SelectItem value="Training">Training</SelectItem>
              <SelectItem value="Equipment">Equipment</SelectItem>
              <SelectItem value="Mileage">Mileage</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
          <div className="sm:ml-auto">
            <Button size="sm" variant="outline" onClick={handleExport} disabled={exporting}>
              {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Export Data
            </Button>
          </div>
        </div>

        {/* Unified Claims List */}
        <div className="bg-card rounded-xl border overflow-hidden">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Employee</TableHead>
                  <TableHead className="font-semibold">Category</TableHead>
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="font-semibold text-right">Amount</TableHead>
                  <TableHead className="font-semibold">Expense Date</TableHead>
                  <TableHead className="font-semibold">Submitted</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Payroll Run</TableHead>
                  <TableHead className="font-semibold text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length > 0 ? (
                  filtered.map((exp) => {
                    const payrollLabel = getPayrollLabel(exp.payrollRunId);
                    const completedRunIds = new Set(
                      payrollRuns.filter((r) => r.status === "completed").map((r) => r.id),
                    );
                    const isInCompletedRun = exp.payrollRunId ? completedRunIds.has(exp.payrollRunId) : false;
                    const isPending = exp.status === "pending";
                    const isMileage = exp.category === "Mileage";
                    return (
                      <TableRow key={exp.id}>
                        <TableCell className="font-medium">{exp.employeeName}</TableCell>
                        <TableCell>
                          {exp.category}
                          {isMileage && (
                            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                              GPS
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[180px] truncate">
                          {exp.description}
                        </TableCell>
                        <TableCell className="text-right">{formatExpenseAmount(exp)}</TableCell>
                        <TableCell>{new Date(exp.expenseDate).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(exp.submissionDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <StatusBadge status={exp.status} />
                        </TableCell>
                        <TableCell>
                          {payrollLabel ? (
                            <Badge variant="outline" className="text-xs">
                              {payrollLabel}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setSelectedExp(exp);
                                setDetailOpen(true);
                              }}
                              title="View Details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {isPending && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-success hover:text-success"
                                  onClick={() => handleApprove(exp)}
                                  title="Approve"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => handleReject(exp)}
                                  title="Reject"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </Button>
                                {!isMileage && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => openEdit(exp)}
                                      title="Edit"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive"
                                      onClick={() => {
                                        setSelectedExp(exp);
                                        setDeleteOpen(true);
                                      }}
                                      title="Delete"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                              </>
                            )}
                            {exp.status === "approved" && !isInCompletedRun && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => handleReject(exp)}
                                title="Reject"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                      No expense claims found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        {/* New Expense Dialog */}
        <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Expense Claim</DialogTitle>
              <DialogDescription>Submit a new expense for reimbursement.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={formEmployee} onValueChange={handleEmployeeChange} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees
                      .filter((e) => e.status === "active" || e.status === "on-leave")
                      .map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.firstName} {e.lastName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {formEmployee && getEmployeeAdvances(formEmployee).length > 0 && (
                <div className="space-y-2">
                  <Label>Against Advance (Optional)</Label>
                  <Select value={formAdvanceId} onValueChange={setFormAdvanceId}>
                    <SelectTrigger>
                      <SelectValue placeholder="None — No advance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None — No advance</SelectItem>
                      {getEmployeeAdvances(formEmployee).map((adv) => (
                        <SelectItem key={adv.id} value={adv.id}>
                          {adv.advanceName} — Remaining: {adv.currency} {(adv.amount - adv.amountUsed).toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formCategory} onValueChange={setFormCategory} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Travel">Travel</SelectItem>
                    <SelectItem value="Client Entertainment">Client Entertainment</SelectItem>
                    <SelectItem value="Training">Training</SelectItem>
                    <SelectItem value="Equipment">Equipment</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Expense Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formExpenseDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formExpenseDate ? format(formExpenseDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formExpenseDate}
                      onSelect={setFormExpenseDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Expense Currency</Label>
                  <Select value={formCurrency} onValueChange={handleCurrencyChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCurrencies.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code} — {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount ({formCurrency || "—"})</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    required
                    min={1}
                  />
                </div>
              </div>
              {formCurrency && formCurrency !== selectedEmployeePayCurrency && (
                <div className="space-y-2">
                  <Label>
                    Exchange Rate (1 {formCurrency} = X {selectedEmployeePayCurrency})
                  </Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={formExchangeRate}
                    onChange={(e) => setFormExchangeRate(e.target.value)}
                    required
                    min={0.0001}
                  />
                  {formAmount && formExchangeRate && (
                    <p className="text-xs text-muted-foreground">
                      Converted: {selectedEmployeePayCurrency} {computeConvertedAmount().toLocaleString()}
                    </p>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Describe the expense..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Receipt / Attachment</Label>
                <Input type="file" accept="image/*,.pdf" multiple />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setNewOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Submit Claim</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Expense Dialog - reuses full create form */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Expense Claim</DialogTitle>
              <DialogDescription>Modify the expense details.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={formEmployee} onValueChange={handleEmployeeChange} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees
                      .filter((e) => e.status === "active" || e.status === "on-leave")
                      .map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.firstName} {e.lastName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {formEmployee && getEmployeeAdvances(formEmployee).length > 0 && (
                <div className="space-y-2">
                  <Label>Against Advance (Optional)</Label>
                  <Select value={formAdvanceId} onValueChange={setFormAdvanceId}>
                    <SelectTrigger>
                      <SelectValue placeholder="None — No advance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None — No advance</SelectItem>
                      {getEmployeeAdvances(formEmployee).map((adv) => (
                        <SelectItem key={adv.id} value={adv.id}>
                          {adv.advanceName} — Remaining: {adv.currency} {(adv.amount - adv.amountUsed).toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formCategory} onValueChange={setFormCategory} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Travel">Travel</SelectItem>
                    <SelectItem value="Client Entertainment">Client Entertainment</SelectItem>
                    <SelectItem value="Training">Training</SelectItem>
                    <SelectItem value="Equipment">Equipment</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Expense Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formExpenseDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formExpenseDate ? format(formExpenseDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formExpenseDate}
                      onSelect={setFormExpenseDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Expense Currency</Label>
                  <Select value={formCurrency} onValueChange={handleCurrencyChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCurrencies.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code} — {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount ({formCurrency || "—"})</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    required
                    min={1}
                  />
                </div>
              </div>
              {formCurrency && formCurrency !== selectedEmployeePayCurrency && (
                <div className="space-y-2">
                  <Label>
                    Exchange Rate (1 {formCurrency} = X {selectedEmployeePayCurrency})
                  </Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={formExchangeRate}
                    onChange={(e) => setFormExchangeRate(e.target.value)}
                    required
                    min={0.0001}
                  />
                  {formAmount && formExchangeRate && (
                    <p className="text-xs text-muted-foreground">
                      Converted: {selectedEmployeePayCurrency} {computeConvertedAmount().toLocaleString()}
                    </p>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Describe the expense..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Receipt / Attachment</Label>
                <Input type="file" accept="image/*,.pdf" multiple />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Expense Claim Details</DialogTitle>
              <DialogDescription>Full details and attachments for this claim.</DialogDescription>
            </DialogHeader>
            {selectedExp && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Employee:</span>
                    <p className="font-medium">{selectedExp.employeeName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <p>
                      <StatusBadge status={selectedExp.status} />
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Category:</span>
                    <p className="font-medium">{selectedExp.category}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Amount:</span>
                    <p className="font-semibold">{formatExpenseAmount(selectedExp)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Expense Date:</span>
                    <p className="font-medium">{new Date(selectedExp.expenseDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Submitted:</span>
                    <p className="font-medium">{new Date(selectedExp.submissionDate).toLocaleDateString()}</p>
                  </div>
                  {selectedExp.currency && selectedExp.exchangeRate && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Exchange Rate:</span>
                      <p className="font-medium">
                        1 {selectedExp.currency} = {selectedExp.exchangeRate}{" "}
                        {getEmployeePayCurrency(selectedExp.employeeId, employees)}
                      </p>
                    </div>
                  )}
                  {selectedExp.payrollRunId && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Payroll Run:</span>
                      <p>
                        <Badge variant="outline">{getPayrollLabel(selectedExp.payrollRunId)}</Badge>
                      </p>
                    </div>
                  )}
                  {selectedExp.paidDate && (
                    <div>
                      <span className="text-muted-foreground">Paid Date:</span>
                      <p className="font-medium">{new Date(selectedExp.paidDate).toLocaleDateString()}</p>
                    </div>
                  )}
                  {selectedExp.paymentMethod && (
                    <div>
                      <span className="text-muted-foreground">Payment Method:</span>
                      <p className="font-medium">{selectedExp.paymentMethod}</p>
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Description:</span>
                  <p className="text-sm mt-1">{selectedExp.description}</p>
                </div>
                {selectedExp.attachments && selectedExp.attachments.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                      <Paperclip className="h-3.5 w-3.5" /> Attachments ({selectedExp.attachments.length})
                    </span>
                    <div className="space-y-1.5">
                      {selectedExp.attachments.map((file, i) => (
                        <Card key={i} className="p-2">
                          <div className="flex items-center gap-2 text-sm">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="truncate">{file}</span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
                {selectedExp.status === "pending" && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        handleApprove(selectedExp);
                        setDetailOpen(false);
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => {
                        handleReject(selectedExp);
                        setDetailOpen(false);
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </div>
                )}
                {selectedExp.status === "approved" &&
                  (() => {
                    const openRun = payrollRuns.find((r) => r.status === "processing" || r.status === "draft");
                    const isInCurrentRun =
                      selectedExp.payrollRunId && openRun && selectedExp.payrollRunId === openRun.id;
                    const isUnlinked = !selectedExp.payrollRunId;
                    const canModify = isInCurrentRun || isUnlinked;
                    return canModify ? (
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            openEdit(selectedExp);
                            setDetailOpen(false);
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          onClick={() => {
                            handleReject(selectedExp);
                            setDetailOpen(false);
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </div>
                    ) : null;
                  })()}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Expense Claim</DialogTitle>
              <DialogDescription>
                This action cannot be undone. Are you sure you want to delete this expense claim?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AutoScanDialog
          open={autoScanOpen}
          onOpenChange={setAutoScanOpen}
          employees={employees}
          onSubmit={(data) => {
            const emp = employees.find((e) => e.id === data.employeeId);
            if (!emp) return;
            const newExp: ExpenseReimbursement = {
              id: String(Date.now()),
              employeeId: emp.id,
              employeeName: `${emp.firstName} ${emp.lastName}`,
              category: data.category,
              amount: Number(data.amount),
              expenseDate: data.date.toISOString().split("T")[0],
              submissionDate: new Date().toISOString().split("T")[0],
              status: "pending",
              description: data.description,
              attachments: [],
              ...(data.currency && data.currency !== (emp.payCurrency || "SAR")
                ? {
                    currency: data.currency,
                    originalAmount: Number(data.amount),
                    exchangeRate: 1,
                  }
                : {}),
            };
            setExpenseList((prev) => [...prev, newExp]);
            expenses.push(newExp);
            toast({
              title: "Expense Claim Submitted",
              description: "Auto-scanned expense claim submitted for approval.",
            });
          }}
        />
      </div>
    </div>
  );
}
