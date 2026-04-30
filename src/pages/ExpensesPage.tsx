import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { usePayrollRuns } from "@/hooks/queries/usePayroll";
import { useEmployees } from "@/contexts/EmployeeContext";
import { Employee } from "@/types/hcm";
import { useCanApprove } from "@/hooks/useCanApprove";
import { useRole } from "@/contexts/RoleContext";
import { useViewScope } from "@/contexts/ViewScopeContext";
import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";
import { useAdvances } from "@/contexts/AdvanceContext";
import {
  useExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useExpenseCategories,
  useCreateMileageEntry,
} from "@/hooks/queries/useExpenses";
import { defaultExchangeRates, availableCurrencies } from "@/data/settingsData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Plus, Search, Eye, CheckCircle2, XCircle, Pencil, Trash2,
  FileText, Paperclip, ScanLine, Navigation, Download, Loader2,
} from "lucide-react";
// xlsx is dynamically imported in handleExport to keep it out of the initial bundle
import { AutoScanDialog } from "@/components/expenses/AutoScanDialog";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { routeApprovalRequest } from "@/lib/approvalRouting";

// ----- Helpers -----
function getEmployeePayCurrency(employeeId: string, emps: Employee[]): string {
  const emp = emps.find((e) => e.id === employeeId);
  return emp?.payCurrency || "SAR";
}

function getExchangeRate(fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) return 1;
  const fromRate = fromCurrency === "SAR" ? 1
    : defaultExchangeRates.find((r) => r.fromCurrency === fromCurrency)?.toReportingRate || 1;
  const toRate = toCurrency === "SAR" ? 1
    : defaultExchangeRates.find((r) => r.fromCurrency === toCurrency)?.toReportingRate || 1;
  return fromRate / toRate;
}

// UI shape used throughout the page
interface UiExpense {
  id: string;
  employeeId: string;
  employeeName: string;
  category: string;
  categoryId: string | null;
  amount: number;          // amount in pay currency
  expenseDate: string;
  submissionDate: string;
  status: "pending" | "approved" | "rejected" | "paid" | "draft";
  description: string;
  attachments: string[];
  payrollRunId?: string;
  currency?: string;        // original currency (if multi)
  exchangeRate?: number;
  originalAmount?: number;
  advanceId?: string;
  paidDate?: string;
  paymentMethod?: string;
}

export default function ExpensesPage() {
  const { employees } = useEmployees();
  const canApproveExpense = useCanApprove("expenses");
  const { currentEmployeeId, clientId, hasFeature, appRole, hasPeopleFeature } = useRole();
  const { scope } = useViewScope();
  const { data: currentEmpRow } = useCurrentEmployee();
  const isEmployeeRole = appRole === "employee";
  const { getEmployeeAdvances, useAdvanceAmount } = useAdvances();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Scope-based filtering: "me" → only current user's expenses; "people" → all
  const scopeEmployeeId = scope === "me" ? currentEmpRow?.id : undefined;
  const { data: rawExpenses = [] } = useExpenses({ employee_id: scopeEmployeeId });
  const { data: categories = [] } = useExpenseCategories();
  const { data: payrollRuns = [] } = usePayrollRuns();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const createMileage = useCreateMileageEntry();

  // Map DB rows -> UI shape
  const expenseList: UiExpense[] = useMemo(() => {
    return (rawExpenses as any[]).map((r) => {
      const emp = employees.find((e) => e.id === r.employee_id);
      const empName = emp ? `${emp.firstName} ${emp.lastName}` : "Unknown";
      return {
        id: r.id,
        employeeId: r.employee_id,
        employeeName: empName,
        category: r.expense_categories?.name ?? "Other",
        categoryId: r.category_id ?? null,
        amount: Number(r.amount ?? 0),
        expenseDate: r.expense_date,
        submissionDate: r.submission_date ?? r.created_at?.slice(0, 10) ?? r.expense_date,
        status: r.status,
        description: r.description ?? "",
        attachments: r.receipt_url ? [r.receipt_url] : [],
        payrollRunId: r.payroll_run_id ?? undefined,
        currency: r.original_currency ?? undefined,
        exchangeRate: r.exchange_rate != null ? Number(r.exchange_rate) : undefined,
        originalAmount: r.original_amount != null ? Number(r.original_amount) : undefined,
        advanceId: r.advance_id ?? undefined,
        paidDate: r.paid_date ?? undefined,
        paymentMethod: r.payment_method ?? undefined,
      };
    });
  }, [rawExpenses, employees]);

  // Mileage handoff from GPS page (creates a mileage_entries row)
  useEffect(() => {
    const raw = sessionStorage.getItem("newMileageEntry");
    if (!raw || !clientId) return;
    sessionStorage.removeItem("newMileageEntry");
    try {
      const entry = JSON.parse(raw);
      createMileage.mutate({
        client_id: clientId,
        employee_id: entry.employeeId,
        date: entry.date,
        distance: entry.distance,
        rate: entry.rate,
        amount: Math.round(entry.amount),
        notes: entry.notes ?? null,
        status: "pending",
      });
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  // ----- Dialog state -----
  const [newOpen, setNewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedExp, setSelectedExp] = useState<UiExpense | null>(null);
  const [search, setSearch] = useState("");
  const [autoScanOpen, setAutoScanOpen] = useState(false);

  // ----- Form state -----
  const [formEmployee, setFormEmployee] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formExpenseDate, setFormExpenseDate] = useState<Date | undefined>();
  const [formCurrency, setFormCurrency] = useState("");
  const [formExchangeRate, setFormExchangeRate] = useState("");
  const [formAdvanceId, setFormAdvanceId] = useState("");

  const selectedEmployeePayCurrency = formEmployee
    ? getEmployeePayCurrency(formEmployee, employees)
    : "SAR";

  const resetForm = () => {
    setFormEmployee(""); setFormCategoryId(""); setFormAmount("");
    setFormDescription(""); setFormExpenseDate(undefined);
    setFormCurrency(""); setFormExchangeRate(""); setFormAdvanceId("");
  };

  const handleEmployeeChange = (empId: string) => {
    setFormEmployee(empId);
    const payCurrency = getEmployeePayCurrency(empId, employees);
    setFormCurrency(payCurrency);
    setFormExchangeRate("1");
    setFormAdvanceId("");
  };

  // Auto-fill employee for non-admin/HR users when the new-expense dialog opens
  useEffect(() => {
    if (newOpen && isEmployeeRole && currentEmpRow?.id && !formEmployee) {
      handleEmployeeChange(currentEmpRow.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newOpen, isEmployeeRole, currentEmpRow?.id]);

  const handleCurrencyChange = (currency: string) => {
    setFormCurrency(currency);
    const payCurrency = formEmployee ? getEmployeePayCurrency(formEmployee, employees) : "SAR";
    setFormExchangeRate(getExchangeRate(currency, payCurrency).toFixed(4));
  };

  const computeConvertedAmount = (): number => {
    if (!formAmount || !formExchangeRate) return 0;
    return Math.round(Number(formAmount) * Number(formExchangeRate) * 100) / 100;
  };

  const buildPayload = () => {
    const emp = employees.find((em) => em.id === formEmployee);
    if (!emp || !formExpenseDate || !clientId) return null;
    const payCurrency = getEmployeePayCurrency(emp.id, employees);
    const expCurrency = formCurrency || payCurrency;
    const isMulti = expCurrency !== payCurrency;
    const convertedAmount = isMulti ? computeConvertedAmount() : Number(formAmount);
    const advanceId = formAdvanceId && formAdvanceId !== "none" ? formAdvanceId : null;
    return {
      client_id: clientId,
      employee_id: emp.id,
      category_id: formCategoryId || null,
      amount: Math.round(convertedAmount),
      expense_date: format(formExpenseDate, "yyyy-MM-dd"),
      submission_date: format(new Date(), "yyyy-MM-dd"),
      status: "pending" as const,
      description: formDescription,
      currency: payCurrency,
      original_currency: isMulti ? expCurrency : null,
      original_amount: isMulti ? Math.round(Number(formAmount)) : null,
      exchange_rate: isMulti ? Number(formExchangeRate) : null,
      advance_id: advanceId,
      convertedAmount, // local-only
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = buildPayload();
    if (!payload) return;
    const { convertedAmount, ...dbPayload } = payload;
    createExpense.mutate(dbPayload, {
      onSuccess: async (created: any) => {
        if (payload.advance_id) useAdvanceAmount(payload.advance_id, convertedAmount);
        setNewOpen(false);
        resetForm();

        // Route approval request to configured approvers (Step 11)
        try {
          const cat = categories.find((c) => c.id === payload.category_id);
          const catKey = `expenses_${(cat?.name ?? "other").toLowerCase().replace(/\s+/g, "_")}`;
          const submitterName = [currentEmpRow?.first_name, currentEmpRow?.last_name].filter(Boolean).join(" ") || "An employee";
          const result = await routeApprovalRequest({
            clientId,
            category: catKey,
            value: payload.amount, // already in halalas
            notification: {
              title: "New expense approval request",
              body: `${submitterName} submitted an expense of ${payload.currency} ${(payload.amount / 100).toLocaleString()}`,
              category: "expense",
              severity: "warning",
              entityType: "expense",
              entityId: created?.id,
              actionUrl: "/expenses",
            },
          });
          if (result.routedTo === "admins") {
            toast({ title: "Routed to company admin for approval" });
          }
        } catch (err) {
          console.warn("[expense] approval routing failed:", err);
        }
      },
    });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExp) return;
    const payload = buildPayload();
    if (!payload) return;
    const { convertedAmount, client_id, submission_date, status, ...patch } = payload;
    updateExpense.mutate({ id: selectedExp.id, ...patch }, {
      onSuccess: () => { setEditOpen(false); resetForm(); },
    });
  };

  const handleDelete = () => {
    if (!selectedExp) return;
    deleteExpense.mutate(selectedExp.id, {
      onSuccess: () => { setDeleteOpen(false); setSelectedExp(null); },
    });
  };

  const handleApprove = (exp: UiExpense) => {
    const { allowed, limit } = canUserApproveExpense(currentEmployeeId, exp.amount);
    if (!allowed) {
      toast({
        title: limit === 0 ? "Not Authorized" : "Limit Exceeded",
        description: limit === 0
          ? "You do not have expense approval permissions."
          : `Your approval limit is SAR ${limit.toLocaleString()}. This expense of SAR ${exp.amount.toLocaleString()} requires a higher authority.`,
        variant: "destructive",
      });
      return;
    }
    const openRun = payrollRuns.find((r) => r.status === "processing" || r.status === "draft");
    updateExpense.mutate({
      id: exp.id,
      status: "approved",
      payroll_run_id: openRun?.id ?? null,
      approved_at: new Date().toISOString(),
    }, {
      onSuccess: () => toast({
        title: "Approved",
        description: openRun
          ? `Expense approved and linked to ${openRun.month} ${openRun.year} payroll.`
          : "Expense approved. Will be captured in the next payroll run.",
      }),
    });
  };

  const handleReject = (exp: UiExpense) => {
    updateExpense.mutate({ id: exp.id, status: "rejected" }, {
      onSuccess: () => toast({ title: "Rejected", description: "Expense claim has been rejected." }),
    });
  };

  const openEdit = (exp: UiExpense) => {
    setSelectedExp(exp);
    setFormEmployee(exp.employeeId);
    setFormCategoryId(exp.categoryId ?? "");
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
      const matchesSearch = !q
        || exp.employeeName.toLowerCase().includes(q)
        || exp.category.toLowerCase().includes(q)
        || exp.description.toLowerCase().includes(q);
      const matchesCategory = filterCategory === "all" || exp.category === filterCategory;
      const matchesStatus = filterStatus === "all" || exp.status === filterStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime());

  const getPayrollLabel = (id?: string) => {
    if (!id) return null;
    const run = payrollRuns.find((r) => r.id === id);
    return run ? `${run.month} ${run.year}` : null;
  };

  const formatExpenseAmount = (exp: UiExpense) => {
    const payCurrency = getEmployeePayCurrency(exp.employeeId, employees);
    if (exp.currency && exp.originalAmount && exp.currency !== payCurrency) {
      return (
        <span>
          <span className="font-semibold">{exp.currency} {exp.originalAmount.toLocaleString()}</span>
          <span className="text-muted-foreground text-xs ml-1">
            ({payCurrency} {exp.amount.toLocaleString()})
          </span>
        </span>
      );
    }
    return <span className="font-semibold">{payCurrency} {exp.amount.toLocaleString()}</span>;
  };

  const handleExport = async () => {
    setExporting(true);
    await new Promise((r) => setTimeout(r, 200));
    try {
      const rows = filtered.map((exp) => {
        const payCurrency = getEmployeePayCurrency(exp.employeeId, employees);
        const amountStr = exp.currency && exp.originalAmount && exp.currency !== payCurrency
          ? `${exp.currency} ${exp.originalAmount} (${payCurrency} ${exp.amount})`
          : `${payCurrency} ${exp.amount}`;
        return {
          Employee: exp.employeeName,
          Category: exp.category,
          Description: exp.description,
          Amount: amountStr,
          "Expense Date": new Date(exp.expenseDate).toLocaleDateString(),
          Submitted: new Date(exp.submissionDate).toLocaleDateString(),
          Status: exp.status.charAt(0).toUpperCase() + exp.status.slice(1),
          "Payroll Run": getPayrollLabel(exp.payrollRunId) || "—",
          "Paid Date": exp.paidDate ? new Date(exp.paidDate).toLocaleDateString() : "—",
          "Payment Method": exp.paymentMethod || "—",
        };
      });
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Expenses");
      XLSX.writeFile(wb, `Expenses_Export_${format(new Date(), "yyyy_MM_dd")}.xlsx`);
      toast({ title: "Exported", description: `${rows.length} records exported.` });
    } catch {
      toast({ title: "Export Failed", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={scope === "me" ? "My Expenses" : "Team Expenses"}
        description={scope === "me"
          ? "Submit and track your expense claims."
          : "Review, approve, and export company-wide expense claims."}
      />

      <div className="flex items-center justify-between">
        <div />
        <div className="flex items-center gap-2">
          {hasFeature("expenses.submit") && (
            <Button size="sm" className="gradient-ey text-primary-foreground font-semibold"
              onClick={() => { resetForm(); setNewOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> New Claim
            </Button>
          )}
          {hasFeature("expenses.submit") && (
            <Button size="sm" variant="outline" onClick={() => setAutoScanOpen(true)}>
              <ScanLine className="h-4 w-4 mr-2" /> Auto Scan
            </Button>
          )}
          {hasFeature("expenses.submit") && (
            <Button size="sm" variant="outline" onClick={() => navigate("/expenses/gps")}>
              <Navigation className="h-4 w-4 mr-2" /> GPS Tracking
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, category, description..." value={search}
              onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {(categories as any[]).map((c) => (
                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
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
                    const completedRunIds = new Set(payrollRuns.filter((r) => r.status === "completed").map((r) => r.id));
                    const isInCompletedRun = exp.payrollRunId ? completedRunIds.has(exp.payrollRunId) : false;
                    const isPending = exp.status === "pending";
                    const isMileage = exp.category === "Mileage";
                    return (
                      <TableRow key={exp.id}>
                        <TableCell className="font-medium">{exp.employeeName}</TableCell>
                        <TableCell>
                          {exp.category}
                          {isMileage && <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">GPS</Badge>}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[180px] truncate">{exp.description}</TableCell>
                        <TableCell className="text-right">{formatExpenseAmount(exp)}</TableCell>
                        <TableCell>{new Date(exp.expenseDate).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(exp.submissionDate).toLocaleDateString()}</TableCell>
                        <TableCell><StatusBadge status={exp.status} /></TableCell>
                        <TableCell>
                          {payrollLabel
                            ? <Badge variant="outline" className="text-xs">{payrollLabel}</Badge>
                            : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => { setSelectedExp(exp); setDetailOpen(true); }} title="View Details">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {isPending && (
                              <>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-success hover:text-success"
                                  onClick={() => handleApprove(exp)} title="Approve">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => handleReject(exp)} title="Reject">
                                  <XCircle className="h-3.5 w-3.5" />
                                </Button>
                                {!isMileage && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-7 w-7"
                                      onClick={() => openEdit(exp)} title="Edit">
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                                      onClick={() => { setSelectedExp(exp); setDeleteOpen(true); }} title="Delete">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                              </>
                            )}
                            {exp.status === "approved" && !isInCompletedRun && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => handleReject(exp)} title="Reject">
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

        {/* New / Edit Form (shared) */}
        {[
          { open: newOpen, setOpen: setNewOpen, title: "New Expense Claim", desc: "Submit a new expense for reimbursement.", onSubmit: handleSubmit, submitText: "Submit Claim" },
          { open: editOpen, setOpen: setEditOpen, title: "Edit Expense Claim", desc: "Modify the expense details.", onSubmit: handleEdit, submitText: "Save Changes" },
        ].map((cfg) => (
          <Dialog key={cfg.title} open={cfg.open} onOpenChange={cfg.setOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{cfg.title}</DialogTitle>
                <DialogDescription>{cfg.desc}</DialogDescription>
              </DialogHeader>
              <form onSubmit={cfg.onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Employee</Label>
                  {isEmployeeRole ? (
                    <Input
                      value={
                        currentEmpRow
                          ? `${currentEmpRow.first_name ?? ""} ${currentEmpRow.last_name ?? ""}`.trim()
                          : ""
                      }
                      disabled
                      readOnly
                    />
                  ) : (
                    <Select value={formEmployee} onValueChange={handleEmployeeChange} required>
                      <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        {employees.filter((e) => e.status === "active" || e.status === "on-leave").map((e) => (
                          <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {formEmployee && getEmployeeAdvances(formEmployee).length > 0 && (
                  <div className="space-y-2">
                    <Label>Against Advance (Optional)</Label>
                    <Select value={formAdvanceId} onValueChange={setFormAdvanceId}>
                      <SelectTrigger><SelectValue placeholder="None — No advance" /></SelectTrigger>
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
                  <Select value={formCategoryId} onValueChange={setFormCategoryId} required>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {(categories as any[]).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Expense Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline"
                        className={cn("w-full justify-start text-left font-normal", !formExpenseDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formExpenseDate ? format(formExpenseDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={formExpenseDate} onSelect={setFormExpenseDate}
                        initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Expense Currency</Label>
                    <Select value={formCurrency} onValueChange={handleCurrencyChange}>
                      <SelectTrigger><SelectValue placeholder="Currency" /></SelectTrigger>
                      <SelectContent>
                        {availableCurrencies.map((c) => (
                          <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount ({formCurrency || "—"})</Label>
                    <Input type="number" placeholder="0.00" value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)} required min={1} />
                  </div>
                </div>
                {formCurrency && formCurrency !== selectedEmployeePayCurrency && (
                  <div className="space-y-2">
                    <Label>Exchange Rate (1 {formCurrency} = X {selectedEmployeePayCurrency})</Label>
                    <Input type="number" step="0.0001" value={formExchangeRate}
                      onChange={(e) => setFormExchangeRate(e.target.value)} required min={0.0001} />
                    {formAmount && formExchangeRate && (
                      <p className="text-xs text-muted-foreground">
                        Converted: {selectedEmployeePayCurrency} {computeConvertedAmount().toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea placeholder="Describe the expense..." value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Receipt / Attachment</Label>
                  <Input type="file" accept="image/*,.pdf" multiple disabled />
                  <p className="text-xs text-muted-foreground">Receipt upload coming soon.</p>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => cfg.setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createExpense.isPending || updateExpense.isPending}>
                    {cfg.submitText}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        ))}

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Expense Claim Details</DialogTitle>
              <DialogDescription>Full details and attachments for this claim.</DialogDescription>
            </DialogHeader>
            {selectedExp && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Employee:</span><p className="font-medium">{selectedExp.employeeName}</p></div>
                  <div><span className="text-muted-foreground">Status:</span><p><StatusBadge status={selectedExp.status} /></p></div>
                  <div><span className="text-muted-foreground">Category:</span><p className="font-medium">{selectedExp.category}</p></div>
                  <div><span className="text-muted-foreground">Amount:</span><p className="font-semibold">{formatExpenseAmount(selectedExp)}</p></div>
                  <div><span className="text-muted-foreground">Expense Date:</span><p className="font-medium">{new Date(selectedExp.expenseDate).toLocaleDateString()}</p></div>
                  <div><span className="text-muted-foreground">Submitted:</span><p className="font-medium">{new Date(selectedExp.submissionDate).toLocaleDateString()}</p></div>
                  {selectedExp.currency && selectedExp.exchangeRate && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Exchange Rate:</span>
                      <p className="font-medium">1 {selectedExp.currency} = {selectedExp.exchangeRate} {getEmployeePayCurrency(selectedExp.employeeId, employees)}</p>
                    </div>
                  )}
                  {selectedExp.payrollRunId && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Payroll Run:</span>
                      <p><Badge variant="outline">{getPayrollLabel(selectedExp.payrollRunId)}</Badge></p>
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
                    <Button size="sm" className="flex-1" onClick={() => { handleApprove(selectedExp); setDetailOpen(false); }}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" className="flex-1"
                      onClick={() => { handleReject(selectedExp); setDetailOpen(false); }}>
                      <XCircle className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Expense Claim</DialogTitle>
              <DialogDescription>This action cannot be undone. Are you sure?</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AutoScanDialog
          open={autoScanOpen}
          onOpenChange={setAutoScanOpen}
          employees={employees}
          onSubmit={(data) => {
            const emp = employees.find((e) => e.id === data.employeeId);
            if (!emp || !clientId) return;
            const payCurrency = emp.payCurrency || "SAR";
            const isMulti = data.currency && data.currency !== payCurrency;
            const matchedCat = (categories as any[]).find((c) => c.name.toLowerCase() === data.category.toLowerCase());
            createExpense.mutate({
              client_id: clientId,
              employee_id: emp.id,
              category_id: matchedCat?.id ?? null,
              amount: Math.round(Number(data.amount)),
              expense_date: format(data.date, "yyyy-MM-dd"),
              submission_date: format(new Date(), "yyyy-MM-dd"),
              status: "pending",
              description: data.description,
              currency: payCurrency,
              original_currency: isMulti ? data.currency : null,
              original_amount: isMulti ? Math.round(Number(data.amount)) : null,
              exchange_rate: isMulti ? 1 : null,
            });
          }}
        />
      </div>
    </div>
  );
}
