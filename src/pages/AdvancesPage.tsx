import { useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { useEmployees } from "@/contexts/EmployeeContext";
import { useRole } from "@/contexts/RoleContext";
import { useAdvances } from "@/contexts/AdvanceContext";
import { usePayrollRuns } from "@/hooks/queries/usePayroll";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Search, Eye, ArrowUpRight, ArrowDownRight, X, FilterX, Wallet } from "lucide-react";
import { RequestRowActions } from "@/components/requests/RequestRowActions";
import { EmptyTableRow } from "@/components/EmptyState";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { availableCurrencies } from "@/data/settingsData";

import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";
import { useViewScope } from "@/contexts/ViewScopeContext";

export default function AdvancesPage() {
  const { employees } = useEmployees();
  const { role, hasFeature } = useRole();
  const { scope } = useViewScope();
  const { data: currentEmpData } = useCurrentEmployee();
  const { toast } = useToast();
  const { advances, addAdvance, approveAdvance, rejectAdvance } = useAdvances();
  const { data: payrollRuns = [] } = usePayrollRuns();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterRemaining, setFilterRemaining] = useState<string>("all");
  const [filterReminderActivity, setFilterReminderActivity] = useState<string>("all");
  const [customMin, setCustomMin] = useState("");
  const [customMax, setCustomMax] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewAdv, setViewAdv] = useState<ReturnType<typeof useAdvances>["advances"][number] | null>(null);

  // Form state
  const [formAmount, setFormAmount] = useState("");
  const [formCurrency, setFormCurrency] = useState("SAR");
  const [formPurpose, setFormPurpose] = useState("");
  const [formName, setFormName] = useState("");
  const [formExpectedDate, setFormExpectedDate] = useState<Date | undefined>();
  const [formNotes, setFormNotes] = useState("");
  const [formAttachments, setFormAttachments] = useState<string[]>([]);

  // Resolve logged-in employee row; fall back to first employee if not yet loaded
  const currentEmployee = useMemo(() => {
    if (currentEmpData) {
      const match = employees.find((e) => e.id === currentEmpData.id);
      if (match) return match;
      return {
        id: currentEmpData.id,
        firstName: currentEmpData.first_name ?? "",
        lastName: currentEmpData.last_name ?? "",
      } as any;
    }
    return employees[0];
  }, [currentEmpData, employees]);

  const resetForm = () => {
    setFormAmount(""); setFormCurrency("SAR"); setFormPurpose("");
    setFormName(""); setFormExpectedDate(undefined);
    setFormNotes(""); setFormAttachments([]);
  };

  const handleSubmit = () => {
    if (!currentEmployee) {
      toast({ title: "Loading", description: "Please wait while we load your profile.", variant: "destructive" });
      return;
    }
    if (!formName || !formAmount || !formPurpose || !formExpectedDate) {
      toast({ title: "Missing Fields", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }
    addAdvance({
      id: `ADV-${String(advances.length + 1).padStart(3, "0")}`,
      advanceName: formName,
      employeeId: currentEmployee.id,
      employeeName: `${currentEmployee.firstName} ${currentEmployee.lastName}`,
      purpose: formPurpose,
      amount: parseFloat(formAmount),
      amountUsed: 0,
      currency: formCurrency,
      status: "pending",
      requestDate: format(new Date(), "yyyy-MM-dd"),
      expectedSpendDate: format(formExpectedDate, "yyyy-MM-dd"),
      settlementDueDate: "",
      attachments: formAttachments,
      notes: formNotes,
      reminderHistory: [],
    });
    setFormOpen(false);
    resetForm();
    toast({ title: "Advance Requested", description: "Your advance request has been submitted for approval." });
  };

  const handleApprove = (id: string, name: string) => {
    const openRun = payrollRuns.find(r => r.status === "processing" || r.status === "draft");
    approveAdvance(id, openRun?.id);
    toast({
      title: "Advance Approved",
      description: openRun
        ? `${name} approved and linked to ${openRun.month} ${openRun.year} payroll.`
        : `${name} approved. Will be disbursed in the next payroll run.`,
    });
  };

  const handleReject = (id: string, name: string) => {
    rejectAdvance(id);
    toast({ title: "Advance Rejected", description: `${name} has been rejected.` });
  };

  const activeFilters = useMemo(() => {
    const tags: { label: string; key: string }[] = [];
    if (filterStatus !== "all") tags.push({ label: filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1), key: "status" });
    if (filterRemaining === "gt0") tags.push({ label: "Remaining > 0", key: "remaining" });
    if (filterRemaining === "eq0") tags.push({ label: "Remaining = 0", key: "remaining" });
    if (filterRemaining === "custom") {
      const parts = [];
      if (customMin) parts.push(`≥${customMin}`);
      if (customMax) parts.push(`≤${customMax}`);
      if (parts.length) tags.push({ label: parts.join(" & "), key: "remaining" });
    }
    if (filterReminderActivity === "reminded") tags.push({ label: "Has Reminders", key: "reminder" });
    if (filterReminderActivity === "no-reminder") tags.push({ label: "No Reminders", key: "reminder" });
    return tags;
  }, [filterStatus, filterRemaining, filterReminderActivity, customMin, customMax]);

  const clearFilter = (key: string) => {
    if (key === "status") setFilterStatus("all");
    if (key === "remaining") { setFilterRemaining("all"); setCustomMin(""); setCustomMax(""); }
    if (key === "reminder") setFilterReminderActivity("all");
  };

  const clearAllFilters = () => {
    setFilterStatus("all");
    setFilterRemaining("all");
    setFilterReminderActivity("all");
    setCustomMin("");
    setCustomMax("");
    setSearch("");
  };

  const filtered = advances
    .filter(a => {
      // Me = own only; People = approval inbox (exclude own-created)
      if (scope === "me" && currentEmpData?.id) {
        if (a.employeeId !== currentEmpData.id) return false;
      } else if (scope === "people" && currentEmpData?.id) {
        if (a.employeeId === currentEmpData.id) return false;
      }
      const matchesSearch = !search || a.advanceName.toLowerCase().includes(search.toLowerCase()) ||
        a.employeeName.toLowerCase().includes(search.toLowerCase()) ||
        a.purpose.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = filterStatus === "all" || a.status === filterStatus;
      const remaining = a.amount - a.amountUsed;
      let matchesRemaining = true;
      if (filterRemaining === "gt0") matchesRemaining = remaining > 0;
      else if (filterRemaining === "eq0") matchesRemaining = remaining === 0;
      else if (filterRemaining === "custom") {
        if (customMin && remaining < parseFloat(customMin)) matchesRemaining = false;
        if (customMax && remaining > parseFloat(customMax)) matchesRemaining = false;
      }
      let matchesReminder = true;
      if (filterReminderActivity === "reminded") matchesReminder = (a.reminderHistory?.length ?? 0) > 0;
      else if (filterReminderActivity === "no-reminder") matchesReminder = (a.reminderHistory?.length ?? 0) === 0;
      return matchesSearch && matchesStatus && matchesRemaining && matchesReminder;
    })
    .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());

  return (
    <div>
      <PageHeader title="Employee Advances" description="Manage business advance requests and settlements">
        {scope === "me" && hasFeature("advances.request") && (
          <Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4 mr-1" />Request Advance</Button>
        )}
      </PageHeader>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
        {[
          {
            label: "ACTIVE ADVANCES",
            value: String(advances.filter(a => a.status === "approved").length),
            change: "Currently in use",
            positive: true,
          },
          {
            label: "PENDING REQUESTS",
            value: String(advances.filter(a => a.status === "pending").length),
            change: "Awaiting approval",
            positive: false,
          },
          {
            label: "TOTAL ADVANCES ISSUED",
            value: `SAR ${advances.reduce((s, a) => s + a.amount, 0).toLocaleString()}`,
            change: "Total amount",
            positive: true,
          },
          {
            label: "USED AMOUNT",
            value: `SAR ${advances.reduce((s, a) => s + a.amountUsed, 0).toLocaleString()}`,
            change: "Against advances",
            positive: true,
          },
          {
            label: "REMAINING BALANCE",
            value: `SAR ${advances.reduce((s, a) => s + (a.amount - a.amountUsed), 0).toLocaleString()}`,
            change: "Outstanding",
            positive: false,
          },
        ].map((card) => (
          <Card key={card.label} className="relative overflow-hidden animate-fade-in">
            <CardContent className="p-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{card.label}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{card.value}</p>
              <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${card.positive ? "text-success" : "text-destructive"}`}>
                {card.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {card.change}
              </div>
            </CardContent>
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-[40px]" />
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="py-3 flex flex-wrap items-end gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search advances..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterReminderActivity} onValueChange={setFilterReminderActivity}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reminders</SelectItem>
              <SelectItem value="reminded">Has Reminders</SelectItem>
              <SelectItem value="no-reminder">No Reminders</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterRemaining} onValueChange={setFilterRemaining}>
            <SelectTrigger className="w-[170px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Remaining</SelectItem>
              <SelectItem value="gt0">Greater than 0</SelectItem>
              <SelectItem value="eq0">Equal to 0</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          {filterRemaining === "custom" && (
            <>
              <Input type="number" placeholder="Min" value={customMin} onChange={e => setCustomMin(e.target.value)} className="w-[100px] h-9 text-xs" />
              <Input type="number" placeholder="Max" value={customMax} onChange={e => setCustomMax(e.target.value)} className="w-[100px] h-9 text-xs" />
            </>
          )}
          {activeFilters.length > 0 && (
            <Button variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground" onClick={clearAllFilters}>
              <FilterX className="h-3.5 w-3.5 mr-1" /> Clear All
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Active Filter Tags */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {activeFilters.map(tag => (
            <Badge key={tag.key} variant="secondary" className="gap-1 pl-2.5 pr-1.5 py-1 text-xs cursor-pointer hover:bg-secondary/80">
              {tag.label}
              <button onClick={() => clearFilter(tag.key)} className="ml-0.5 rounded-full hover:bg-muted p-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Advance Name</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Used</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <EmptyTableRow colSpan={8} icon={Wallet} title="No advances yet" description="Request a cash advance or adjust filters." />
              ) : filtered.map(adv => {
                const remaining = adv.amount - adv.amountUsed;
                return (
                  <TableRow key={adv.id}>
                    <TableCell className="font-medium">{adv.advanceName}</TableCell>
                    <TableCell>{adv.employeeName}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{adv.purpose}</TableCell>
                    <TableCell className="text-right">{adv.currency} {adv.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{adv.currency} {adv.amountUsed.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{adv.currency} {remaining.toLocaleString()}</TableCell>
                    <TableCell><StatusBadge status={adv.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setViewAdv(adv); setViewOpen(true); }}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <RequestRowActions
                          module="advance"
                          entityId={adv.id}
                          onActed={(action) => {
                            if (action === "approved") handleApprove(adv.id, adv.advanceName);
                            else if (action === "rejected") handleReject(adv.id, adv.advanceName);
                          }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Advance Details</DialogTitle>
            <DialogDescription>View advance request information</DialogDescription>
          </DialogHeader>
          {viewAdv && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{viewAdv.advanceName}</span></div>
                <div><span className="text-muted-foreground">Employee:</span> <span className="font-medium">{viewAdv.employeeName}</span></div>
                <div><span className="text-muted-foreground">Amount:</span> <span className="font-medium">{viewAdv.currency} {viewAdv.amount.toLocaleString()}</span></div>
                <div><span className="text-muted-foreground">Used:</span> <span className="font-medium">{viewAdv.currency} {viewAdv.amountUsed.toLocaleString()}</span></div>
                <div><span className="text-muted-foreground">Remaining:</span> <span className="font-medium">{viewAdv.currency} {(viewAdv.amount - viewAdv.amountUsed).toLocaleString()}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={viewAdv.status} /></div>
                <div><span className="text-muted-foreground">Request Date:</span> <span className="font-medium">{viewAdv.requestDate}</span></div>
                <div><span className="text-muted-foreground">Expected Spend:</span> <span className="font-medium">{viewAdv.expectedSpendDate}</span></div>
              </div>
              <div><span className="text-muted-foreground">Purpose:</span> <p className="mt-1">{viewAdv.purpose}</p></div>
              {viewAdv.notes && <div><span className="text-muted-foreground">Notes:</span> <p className="mt-1">{viewAdv.notes}</p></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Request Advance Form */}
      <Dialog open={formOpen} onOpenChange={v => { if (!v) resetForm(); setFormOpen(v); }}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Request Advance</DialogTitle>
            <DialogDescription>Submit a business advance request for approval</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-3">
            <div className="space-y-5 py-1">
              {/* Section 1: Employee Info */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Employee Information</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Employee Name</Label>
                    <Input value={currentEmployee ? `${currentEmployee.firstName ?? ""} ${currentEmployee.lastName ?? ""}`.trim() : "Loading..."} disabled className="mt-1 h-8 text-xs bg-muted/50" />
                  </div>
                  <div>
                    <Label className="text-xs">Request Date</Label>
                    <Input value={format(new Date(), "PPP")} disabled className="mt-1 h-8 text-xs bg-muted/50" />
                  </div>
                </div>
              </div>

              {/* Section 2: Advance Details */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Advance Details</h4>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Advance Name <span className="text-destructive">*</span></Label>
                    <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g., Client Visit - Riyadh" className="mt-1 h-8 text-xs" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Amount Requested <span className="text-destructive">*</span></Label>
                      <Input type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="0.00" className="mt-1 h-8 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs">Currency</Label>
                      <Select value={formCurrency} onValueChange={setFormCurrency}>
                        <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {availableCurrencies.map(c => <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Purpose of Advance <span className="text-destructive">*</span></Label>
                    <Textarea value={formPurpose} onChange={e => setFormPurpose(e.target.value)} placeholder="Describe the business purpose..." className="mt-1 text-xs min-h-[60px]" />
                  </div>
                </div>
              </div>

              {/* Section 3: Timeline */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Timeline</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Expected Spend Date <span className="text-destructive">*</span></Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full mt-1 h-8 text-xs justify-start", !formExpectedDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-1 h-3 w-3" />
                          {formExpectedDate ? format(formExpectedDate, "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={formExpectedDate} onSelect={setFormExpectedDate} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              {/* Section 4: Attachments */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Attachments</h4>
                <div>
                  <Label className="text-xs">Upload Supporting Documents (optional)</Label>
                  <Input
                    type="file"
                    multiple
                    className="mt-1 h-8 text-xs"
                    onChange={e => {
                      if (e.target.files) {
                        setFormAttachments(Array.from(e.target.files).map(f => f.name));
                      }
                    }}
                  />
                  {formAttachments.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {formAttachments.map((f, i) => (
                        <span key={i} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{f}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Section 5: Notes */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes</h4>
                <div>
                  <Label className="text-xs">Additional Comments</Label>
                  <Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Any additional information..." className="mt-1 text-xs min-h-[50px]" />
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setFormOpen(false); }}>Cancel</Button>
            <Button onClick={handleSubmit}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
