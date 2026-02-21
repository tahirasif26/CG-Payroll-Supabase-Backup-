import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { expenses, payrollRuns, employees } from "@/data/mockData";
import { ExpenseReimbursement } from "@/types/hcm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Search, Eye, CheckCircle2, XCircle, Pencil, Trash2, FileText, Paperclip } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
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

export default function ExpensesPage() {
  const [expenseList, setExpenseList] = useState<ExpenseReimbursement[]>(expenses);
  const [newOpen, setNewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedExp, setSelectedExp] = useState<ExpenseReimbursement | null>(null);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  // Form state
  const [formEmployee, setFormEmployee] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formExpenseDate, setFormExpenseDate] = useState<Date | undefined>();

  const resetForm = () => {
    setFormEmployee("");
    setFormCategory("");
    setFormAmount("");
    setFormDescription("");
    setFormExpenseDate(undefined);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(em => em.id === formEmployee);
    if (!emp || !formExpenseDate) return;
    const newExp: ExpenseReimbursement = {
      id: String(Date.now()),
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      category: formCategory,
      amount: Number(formAmount),
      expenseDate: formExpenseDate.toISOString().split("T")[0],
      submissionDate: new Date().toISOString().split("T")[0],
      status: "pending",
      description: formDescription,
      attachments: [],
    };
    setExpenseList(prev => [...prev, newExp]);
    // sync to shared array
    expenses.push(newExp);
    setNewOpen(false);
    resetForm();
    toast({ title: "Expense Claim Submitted", description: "Your expense claim has been submitted for approval." });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExp) return;
    const updated: ExpenseReimbursement = {
      ...selectedExp,
      category: formCategory || selectedExp.category,
      amount: formAmount ? Number(formAmount) : selectedExp.amount,
      description: formDescription || selectedExp.description,
      expenseDate: formExpenseDate ? formExpenseDate.toISOString().split("T")[0] : selectedExp.expenseDate,
    };
    setExpenseList(prev => prev.map(ex => ex.id === updated.id ? updated : ex));
    // sync
    const idx = expenses.findIndex(ex => ex.id === updated.id);
    if (idx >= 0) expenses[idx] = updated;
    setEditOpen(false);
    resetForm();
    toast({ title: "Expense Updated", description: "Expense claim has been updated." });
  };

  const handleDelete = () => {
    if (!selectedExp) return;
    setExpenseList(prev => prev.filter(ex => ex.id !== selectedExp.id));
    const idx = expenses.findIndex(ex => ex.id === selectedExp.id);
    if (idx >= 0) expenses.splice(idx, 1);
    setDeleteOpen(false);
    setSelectedExp(null);
    toast({ title: "Deleted", description: "Expense claim has been deleted." });
  };

  const handleApprove = (exp: ExpenseReimbursement) => {
    const openRun = payrollRuns.find(r => r.status === "processing" || r.status === "draft");
    const updated = { ...exp, status: "approved" as const, payrollRunId: openRun?.id };
    setExpenseList(prev => prev.map(ex => ex.id === exp.id ? updated : ex));
    const idx = expenses.findIndex(ex => ex.id === exp.id);
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
    setExpenseList(prev => prev.map(ex => ex.id === exp.id ? updated : ex));
    const idx = expenses.findIndex(ex => ex.id === exp.id);
    if (idx >= 0) expenses[idx] = updated;
    toast({ title: "Rejected", description: "Expense claim has been rejected." });
  };

  const openEdit = (exp: ExpenseReimbursement) => {
    setSelectedExp(exp);
    setFormCategory(exp.category);
    setFormAmount(String(exp.amount));
    setFormDescription(exp.description);
    setFormExpenseDate(new Date(exp.expenseDate));
    setEditOpen(true);
  };

  const filtered = expenseList.filter(exp => {
    if (!search) return true;
    const q = search.toLowerCase();
    return exp.employeeName.toLowerCase().includes(q) ||
      exp.category.toLowerCase().includes(q) ||
      exp.description.toLowerCase().includes(q);
  });

  const getPayrollLabel = (payrollRunId?: string) => {
    if (!payrollRunId) return null;
    const run = payrollRuns.find(r => r.id === payrollRunId);
    return run ? `${run.month} ${run.year}` : null;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Expense Reimbursement" description="Submit, review, and track expense claims.">
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={() => { resetForm(); setNewOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />New Claim
        </Button>
      </PageHeader>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name, category, description..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Employee</TableHead>
                <TableHead className="font-semibold">Category</TableHead>
                <TableHead className="font-semibold">Description</TableHead>
                <TableHead className="font-semibold text-right">Amount (SAR)</TableHead>
                <TableHead className="font-semibold">Expense Date</TableHead>
                <TableHead className="font-semibold">Submitted</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Payroll Run</TableHead>
                <TableHead className="font-semibold text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((exp) => {
                const payrollLabel = getPayrollLabel(exp.payrollRunId);
                return (
                  <TableRow key={exp.id}>
                    <TableCell className="font-medium">{exp.employeeName}</TableCell>
                    <TableCell>{exp.category}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[180px] truncate">{exp.description}</TableCell>
                    <TableCell className="text-right font-semibold">{exp.amount.toLocaleString()}</TableCell>
                    <TableCell>{new Date(exp.expenseDate).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(exp.submissionDate).toLocaleDateString()}</TableCell>
                    <TableCell><StatusBadge status={exp.status} /></TableCell>
                    <TableCell>
                      {payrollLabel ? (
                        <Badge variant="outline" className="text-xs">{payrollLabel}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedExp(exp); setDetailOpen(true); }} title="View Details">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {exp.status === "pending" && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700" onClick={() => handleApprove(exp)} title="Approve">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleReject(exp)} title="Reject">
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(exp)} title="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setSelectedExp(exp); setDeleteOpen(true); }} title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
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
              <Select value={formEmployee} onValueChange={setFormEmployee} required>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.filter(e => e.status === "active" || e.status === "on-leave").map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={formCategory} onValueChange={setFormCategory} required>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
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
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formExpenseDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formExpenseDate ? format(formExpenseDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={formExpenseDate} onSelect={setFormExpenseDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Amount (SAR)</Label>
              <Input type="number" placeholder="0.00" value={formAmount} onChange={e => setFormAmount(e.target.value)} required min={1} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Describe the expense..." value={formDescription} onChange={e => setFormDescription(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Receipt / Attachment</Label>
              <Input type="file" accept="image/*,.pdf" multiple />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
              <Button type="submit">Submit Claim</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Expense Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Expense Claim</DialogTitle>
            <DialogDescription>Modify the expense details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formExpenseDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formExpenseDate ? format(formExpenseDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={formExpenseDate} onSelect={setFormExpenseDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Amount (SAR)</Label>
              <Input type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} required min={1} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail View Dialog */}
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
                <div><span className="text-muted-foreground">Amount:</span><p className="font-semibold">SAR {selectedExp.amount.toLocaleString()}</p></div>
                <div><span className="text-muted-foreground">Expense Date:</span><p className="font-medium">{new Date(selectedExp.expenseDate).toLocaleDateString()}</p></div>
                <div><span className="text-muted-foreground">Submitted:</span><p className="font-medium">{new Date(selectedExp.submissionDate).toLocaleDateString()}</p></div>
                {selectedExp.payrollRunId && (
                  <div className="col-span-2"><span className="text-muted-foreground">Payroll Run:</span><p><Badge variant="outline">{getPayrollLabel(selectedExp.payrollRunId)}</Badge></p></div>
                )}
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Description:</span>
                <p className="text-sm mt-1">{selectedExp.description}</p>
              </div>
              {selectedExp.attachments && selectedExp.attachments.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground flex items-center gap-1 mb-2"><Paperclip className="h-3.5 w-3.5" /> Attachments ({selectedExp.attachments.length})</span>
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
                  <Button size="sm" variant="destructive" className="flex-1" onClick={() => { handleReject(selectedExp); setDetailOpen(false); }}>
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Expense Claim</DialogTitle>
            <DialogDescription>This action cannot be undone. Are you sure you want to delete this expense claim?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
