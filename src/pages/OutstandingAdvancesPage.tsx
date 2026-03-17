import { useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAdvances, AutoReminderInterval, Advance } from "@/contexts/AdvanceContext";
import { useEmployees } from "@/contexts/EmployeeContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Search, Bell, Download, Settings2, AlertTriangle, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, isPast, parseISO } from "date-fns";

export default function OutstandingAdvancesPage() {
  const { advances, sendReminder, autoReminderInterval, setAutoReminderInterval } = useAdvances();
  const { employees } = useEmployees();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [filterDue, setFilterDue] = useState("all");
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [filterRemaining, setFilterRemaining] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyAdvance, setHistoryAdvance] = useState<Advance | null>(null);

  // Outstanding = approved & remaining > 0
  const outstanding = useMemo(() => {
    return advances.filter(a => a.status === "approved" && (a.amount - a.amountUsed) > 0);
  }, [advances]);

  const departments = useMemo(() => {
    const depts = new Set(employees.map(e => e.department));
    return Array.from(depts).sort();
  }, [employees]);

  const employeeMap = useMemo(() => {
    const map: Record<string, string> = {};
    employees.forEach(e => { map[e.id] = e.department; });
    return map;
  }, [employees]);

  const filtered = useMemo(() => {
    return outstanding.filter(a => {
      if (search && !a.employeeName.toLowerCase().includes(search.toLowerCase()) && !a.id.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterEmployee !== "all" && a.employeeId !== filterEmployee) return false;
      if (filterDepartment !== "all" && employeeMap[a.employeeId] !== filterDepartment) return false;
      const remaining = a.amount - a.amountUsed;
      if (filterRemaining === "low" && remaining >= 1000) return false;
      if (filterRemaining === "mid" && (remaining < 1000 || remaining >= 5000)) return false;
      if (filterRemaining === "high" && remaining < 5000) return false;
      const isOverdue = isPast(parseISO(a.settlementDueDate)) && remaining > 0;
      if (filterOverdue && !isOverdue) return false;
      if (filterDue === "overdue" && !isOverdue) return false;
      if (filterDue === "this-month") {
        const due = parseISO(a.settlementDueDate);
        const now = new Date();
        if (due.getMonth() !== now.getMonth() || due.getFullYear() !== now.getFullYear()) return false;
      }
      return true;
    });
  }, [outstanding, search, filterEmployee, filterDepartment, filterDue, filterOverdue, filterRemaining, employeeMap]);

  const allSelected = filtered.length > 0 && selected.length === filtered.length;
  const toggleAll = () => {
    setSelected(allSelected ? [] : filtered.map(a => a.id));
  };
  const toggleOne = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const isOverdue = (a: typeof advances[0]) => isPast(parseISO(a.settlementDueDate)) && (a.amount - a.amountUsed) > 0;

  const handleSendReminder = () => {
    if (selected.length === 0) {
      toast({ title: "No Selection", description: "Please select at least one advance.", variant: "destructive" });
      return;
    }
    setPreviewOpen(true);
  };

  const confirmSend = () => {
    sendReminder(selected);
    toast({
      title: "Reminders Sent",
      description: `Settlement reminders sent to ${selected.length} employee(s).`,
    });
    setSelected([]);
    setPreviewOpen(false);
  };

  const exportCSV = () => {
    const headers = ["Employee Name", "Advance ID", "Amount", "Used", "Remaining", "Currency", "Advance Date", "Settlement Due", "Last Reminder"];
    const rows = filtered.map(a => [
      a.employeeName, a.id, a.amount, a.amountUsed, a.amount - a.amountUsed, a.currency,
      a.requestDate, a.settlementDueDate, a.lastReminderSent ? format(parseISO(a.lastReminderSent), "PPp") : "Never"
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "outstanding-advances.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Outstanding advances exported as CSV." });
  };

  const selectedAdvances = filtered.filter(a => selected.includes(a.id));

  return (
    <div>
      <PageHeader title="Outstanding Advances" description="Track advances that still need to be settled.">
        <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
          <Settings2 className="h-4 w-4 mr-1" /> Auto Reminder
        </Button>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
        <Button size="sm" onClick={handleSendReminder} disabled={selected.length === 0}>
          <Bell className="h-4 w-4 mr-1" /> Send Reminder ({selected.length})
        </Button>
      </PageHeader>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="pt-4 pb-3 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search employee or advance ID..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
          <Select value={filterEmployee} onValueChange={setFilterEmployee}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Employee" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {[...new Set(outstanding.map(a => a.employeeId))].map(id => {
                const name = outstanding.find(a => a.employeeId === id)?.employeeName;
                return <SelectItem key={id} value={id}>{name}</SelectItem>;
              })}
            </SelectContent>
          </Select>
          <Select value={filterDepartment} onValueChange={setFilterDepartment}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterDue} onValueChange={setFilterDue}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Due Date" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="overdue">Overdue Only</SelectItem>
              <SelectItem value="this-month">Due This Month</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterRemaining} onValueChange={setFilterRemaining}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Remaining Amount" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Amount</SelectItem>
              <SelectItem value="low">Under 1,000</SelectItem>
              <SelectItem value="mid">1,000 – 5,000</SelectItem>
              <SelectItem value="high">5,000+</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Switch id="overdue-toggle" checked={filterOverdue} onCheckedChange={setFilterOverdue} />
            <Label htmlFor="overdue-toggle" className="text-sm whitespace-nowrap">Overdue Only</Label>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              </TableHead>
              <TableHead>Employee Name</TableHead>
              <TableHead>Advance ID</TableHead>
              <TableHead className="text-right">Advance Amount</TableHead>
              <TableHead className="text-right">Used Amount</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead>Advance Date</TableHead>
              <TableHead>Settlement Due</TableHead>
              <TableHead>Last Reminder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No outstanding advances found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(a => {
                const remaining = a.amount - a.amountUsed;
                const overdue = isOverdue(a);
                return (
                  <TableRow
                    key={a.id}
                    className={overdue ? "bg-destructive/10 hover:bg-destructive/15" : ""}
                  >
                    <TableCell>
                      <Checkbox checked={selected.includes(a.id)} onCheckedChange={() => toggleOne(a.id)} />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {a.employeeName}
                        {overdue && <AlertTriangle className="h-4 w-4 text-destructive" />}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{a.id}</Badge></TableCell>
                    <TableCell className="text-right">{a.currency} {a.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{a.currency} {a.amountUsed.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {a.currency} {remaining.toLocaleString()}
                    </TableCell>
                    <TableCell>{format(parseISO(a.requestDate), "dd MMM yyyy")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {format(parseISO(a.settlementDueDate), "dd MMM yyyy")}
                        {overdue && <Badge variant="destructive" className="text-xs">Overdue</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm">
                          {a.lastReminderSent ? format(parseISO(a.lastReminderSent), "dd MMM yyyy, HH:mm") : "—"}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setHistoryAdvance(a)}
                          title="View reminder history"
                        >
                          <History className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Reminder Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Settlement Reminders</DialogTitle>
            <DialogDescription>
              The following {selectedAdvances.length} reminder(s) will be sent.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto space-y-3">
            {selectedAdvances.map(a => {
              const remaining = a.amount - a.amountUsed;
              return (
                <Card key={a.id} className="p-3">
                  <p className="font-medium text-sm mb-1">To: {a.employeeName}</p>
                  <p className="text-xs text-muted-foreground font-semibold mb-1">Subject: Advance Settlement Reminder</p>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>You have an outstanding business advance.</p>
                    <p>Advance ID: <span className="font-medium text-foreground">{a.id}</span></p>
                    <p>Advance Amount: <span className="font-medium text-foreground">{a.currency} {a.amount.toLocaleString()}</span></p>
                    <p>Remaining Balance: <span className="font-medium text-foreground">{a.currency} {remaining.toLocaleString()}</span></p>
                    <p>Settlement Due: <span className="font-medium text-foreground">{format(parseISO(a.settlementDueDate), "dd MMM yyyy")}</span></p>
                    <p className="pt-1">Please submit expenses or return the remaining amount.</p>
                  </div>
                </Card>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Cancel</Button>
            <Button onClick={confirmSend}>
              <Bell className="h-4 w-4 mr-1" /> Confirm & Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto Reminder Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Auto Reminder Settings</DialogTitle>
            <DialogDescription>
              Configure automatic settlement reminders for outstanding advances.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Send reminders automatically every:</Label>
              <Select value={autoReminderInterval} onValueChange={(v) => setAutoReminderInterval(v as AutoReminderInterval)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">Off (Manual Only)</SelectItem>
                  <SelectItem value="7">Every 7 days</SelectItem>
                  <SelectItem value="15">Every 15 days</SelectItem>
                  <SelectItem value="30">Every 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              When enabled, the system will automatically send settlement reminders to employees with outstanding advances at the configured interval.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => { setSettingsOpen(false); toast({ title: "Settings Saved", description: `Auto reminder: ${autoReminderInterval === "off" ? "Disabled" : `Every ${autoReminderInterval} days`}` }); }}>
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reminder History Dialog */}
      <Dialog open={!!historyAdvance} onOpenChange={(open) => !open && setHistoryAdvance(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reminder History</DialogTitle>
            <DialogDescription>
              {historyAdvance && (
                <>History for <span className="font-medium text-foreground">{historyAdvance.employeeName}</span> — <Badge variant="outline">{historyAdvance.id}</Badge></>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[350px] overflow-y-auto">
            {historyAdvance && (historyAdvance.reminderHistory || []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No reminders have been sent for this advance.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Sent By</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyAdvance && [...(historyAdvance.reminderHistory || [])].reverse().map((entry, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-muted-foreground">{(historyAdvance.reminderHistory || []).length - idx}</TableCell>
                      <TableCell className="text-sm">{format(parseISO(entry.sentAt), "dd MMM yyyy, HH:mm")}</TableCell>
                      <TableCell className="text-sm">{entry.sentBy}</TableCell>
                      <TableCell>
                        <Badge variant={entry.type === "auto" ? "secondary" : "default"} className="text-xs capitalize">
                          {entry.type}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryAdvance(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
