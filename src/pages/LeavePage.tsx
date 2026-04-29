import { useState, useEffect, useMemo, useCallback } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { useActiveEmployees } from "@/hooks/useActiveEmployees";
import { useLeaveTypes } from "@/contexts/LeaveTypeContext";
import { usePayrollSetups } from "@/contexts/PayrollSetupContext";
import { useClient } from "@/contexts/ClientContext";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/contexts/RoleContext";
import { useViewScope } from "@/contexts/ViewScopeContext";
import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Check, X, Search, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

function getCurrentFiscalYear(yearEndDate?: string): string {
  if (!yearEndDate) return `${new Date().getFullYear()}`;
  const [mm, dd] = yearEndDate.split("-").map(Number);
  const now = new Date();
  const yearEndThisYear = new Date(now.getFullYear(), mm - 1, dd);
  if (now <= yearEndThisYear) {
    return `${now.getFullYear() - 1}-${now.getFullYear()}`;
  }
  return `${now.getFullYear()}-${now.getFullYear() + 1}`;
}

interface DBLeaveRequest {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  days: number;
  status: string;
  reason: string | null;
}

export default function LeavePage() {
  const activeEmps = useActiveEmployees();
  const { clientId } = useAuth();
  const { hasFeature, appRole } = useRole();
  const { scope } = useViewScope();
  const { data: currentEmpRow } = useCurrentEmployee();
  const isEmployeeRole = appRole === "employee";
  const { leaveTypes, initializeBalances, balances, recordLeaveUsage } = useLeaveTypes();
  const { client } = useClient();
  const { getSetupById } = usePayrollSetups();
  const activeLeaveTypes = leaveTypes.filter(lt => lt.isActive);
  const qc = useQueryClient();
  const { toast } = useToast();

  const [newOpen, setNewOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<string | null>(null);

  const currentFY = getCurrentFiscalYear(client.yearEndDate);

  const getSetupForEmployee = useCallback((empId: string) => {
    const emp = activeEmps.find(e => e.id === empId);
    return emp?.payrollSetupId ? getSetupById(emp.payrollSetupId) : undefined;
  }, [activeEmps, getSetupById]);

  useEffect(() => {
    if (activeEmps.length > 0 && leaveTypes.length > 0) {
      initializeBalances(activeEmps.map(e => e.id), currentFY, getSetupForEmployee);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEmps.length, currentFY, leaveTypes.length]);

  // ---------------- Supabase requests ----------------
  const { data: dbRequests = [] } = useQuery({
    queryKey: ["leave_requests", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("client_id", clientId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as DBLeaveRequest[];
    },
  });

  const createReqMut = useMutation({
    mutationFn: async (payload: Omit<DBLeaveRequest, "id" | "status">) => {
      if (!clientId) throw new Error("No client");
      const { data, error } = await supabase.from("leave_requests").insert({
        client_id: clientId,
        employee_id: payload.employee_id,
        leave_type_id: payload.leave_type_id,
        start_date: payload.start_date,
        end_date: payload.end_date,
        days: payload.days,
        reason: payload.reason,
        status: "pending",
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave_requests"] });
      toast({ title: "Leave Request Submitted", description: "Request created as pending." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateStatusMut = useMutation({
    mutationFn: async ({ id, status, rejection }: { id: string; status: string; rejection?: string }) => {
      const patch: any = { status };
      if (status === "approved") patch.approved_at = new Date().toISOString();
      if (rejection) patch.rejection_reason = rejection;
      const { error } = await supabase.from("leave_requests").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leave_requests"] }),
  });

  // New request form
  const [newEmployee, setNewEmployee] = useState("");
  const [newType, setNewType] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newReason, setNewReason] = useState("");

  // Auto-fill employee for non-admin/HR users when opening the new request dialog
  useEffect(() => {
    if (newOpen && isEmployeeRole && currentEmpRow?.id && !newEmployee) {
      setNewEmployee(currentEmpRow.id);
    }
  }, [newOpen, isEmployeeRole, currentEmpRow?.id, newEmployee]);

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const empMap = useMemo(() => {
    const m = new Map<string, string>();
    activeEmps.forEach(e => m.set(e.id, `${e.firstName} ${e.lastName}`));
    return m;
  }, [activeEmps]);

  const ltMap = useMemo(() => {
    const m = new Map<string, string>();
    leaveTypes.forEach(lt => m.set(lt.id, lt.name));
    return m;
  }, [leaveTypes]);

  const filteredLeaves = dbRequests.filter(l => {
    // Scope filter: "me" → only show requests for the current employee
    if (scope === "me" && currentEmpRow?.id && l.employee_id !== currentEmpRow.id) return false;
    const empName = empMap.get(l.employee_id) || "";
    const typeName = ltMap.get(l.leave_type_id) || "";
    const q = search.toLowerCase();
    const matchesSearch = !q || empName.toLowerCase().includes(q) || (l.reason || "").toLowerCase().includes(q);
    const matchesType = filterType === "all" || l.leave_type_id === filterType;
    const matchesStatus = filterStatus === "all" || l.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployee || !newType || !newStart || !newEnd) return;
    const start = new Date(newStart);
    const end = new Date(newEnd);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    createReqMut.mutate({
      employee_id: newEmployee,
      leave_type_id: newType,
      start_date: newStart,
      end_date: newEnd,
      days,
      reason: newReason || "No reason provided",
    });
    setNewOpen(false);
    setNewEmployee(""); setNewType(""); setNewStart(""); setNewEnd(""); setNewReason("");
  };

  const handleApprove = () => {
    if (!selectedLeave) return;
    const leave = dbRequests.find(l => l.id === selectedLeave);
    if (leave) {
      updateStatusMut.mutate({ id: leave.id, status: "approved" }, {
        onSuccess: () => {
          recordLeaveUsage(leave.employee_id, leave.leave_type_id, currentFY, leave.days);
          toast({ title: "Leave Approved", description: "Request approved and balance updated." });
        },
      });
    }
    setApproveOpen(false);
    setSelectedLeave(null);
  };

  const handleReject = () => {
    if (selectedLeave) {
      updateStatusMut.mutate({ id: selectedLeave, status: "rejected" }, {
        onSuccess: () => toast({ title: "Leave Rejected", description: "The leave request has been rejected." }),
      });
    }
    setRejectOpen(false);
    setSelectedLeave(null);
  };

  const selectedLeaveData = dbRequests.find(l => l.id === selectedLeave);

  const balanceRows = useMemo(() => {
    const rows: { empId: string; empName: string; leaveType: string; entitled: number; carriedForward: number; used: number; remaining: number }[] = [];
    for (const emp of activeEmps) {
      const empBalances = balances.filter(b => b.employeeId === emp.id);
      for (const b of empBalances) {
        const lt = leaveTypes.find(l => l.id === b.leaveTypeId);
        rows.push({
          empId: emp.id,
          empName: `${emp.firstName} ${emp.lastName}`,
          leaveType: lt?.name || b.leaveTypeId,
          entitled: b.entitled,
          carriedForward: b.carriedForward,
          used: b.used,
          remaining: b.remaining,
        });
      }
    }
    return rows;
  }, [activeEmps, balances, leaveTypes]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={scope === "me" ? "My Leave" : "Team Leave"}
        description={scope === "me"
          ? "Apply for leave and track your balance & requests."
          : "Review, approve, and manage company-wide leave requests."}
      >
        <div className="flex gap-2">
          {hasFeature("leave.apply") && (
            <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />New Request
            </Button>
          )}
        </div>
      </PageHeader>

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">Leave Requests</TabsTrigger>
          <TabsTrigger value="balances">Leave Balances</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by employee or reason..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]"><Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" /><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {activeLeaveTypes.map(lt => (
                    <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>
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
                </SelectContent>
              </Select>
            </div>

            <div className="bg-card rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Employee</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">From</TableHead>
                    <TableHead className="font-semibold">To</TableHead>
                    <TableHead className="font-semibold">Days</TableHead>
                    <TableHead className="font-semibold">Reason</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeaves.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No leave requests found.</TableCell></TableRow>
                  ) : filteredLeaves.map((leave) => (
                    <TableRow key={leave.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">{empMap.get(leave.employee_id) || "—"}</TableCell>
                      <TableCell className="capitalize">{ltMap.get(leave.leave_type_id) || "—"}</TableCell>
                      <TableCell>{new Date(leave.start_date).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(leave.end_date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-semibold">{leave.days}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{leave.reason}</TableCell>
                      <TableCell><StatusBadge status={leave.status as any} /></TableCell>
                      <TableCell>
                        {leave.status === "pending" && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-success hover:bg-success/10" onClick={() => { setSelectedLeave(leave.id); setApproveOpen(true); }}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => { setSelectedLeave(leave.id); setRejectOpen(true); }}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="balances">
          <Card>
            <CardContent className="p-0">
              <div className="p-4 border-b">
                <p className="text-sm text-muted-foreground">Fiscal Year: <span className="font-semibold text-foreground">{currentFY}</span></p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Employee</TableHead>
                    <TableHead className="font-semibold">Leave Type</TableHead>
                    <TableHead className="font-semibold text-right">Entitled</TableHead>
                    <TableHead className="font-semibold text-right">Carried Forward</TableHead>
                    <TableHead className="font-semibold text-right">Used</TableHead>
                    <TableHead className="font-semibold text-right">Remaining</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balanceRows.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No balance data yet.</TableCell></TableRow>
                  ) : (
                    balanceRows.map((row, i) => (
                      <TableRow key={`${row.empId}-${row.leaveType}-${i}`} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{row.empName}</TableCell>
                        <TableCell>{row.leaveType}</TableCell>
                        <TableCell className="text-right">{row.entitled}</TableCell>
                        <TableCell className="text-right">{row.carriedForward}</TableCell>
                        <TableCell className="text-right">{row.used}</TableCell>
                        <TableCell className="text-right">
                          <span className={row.remaining <= 3 ? "text-amber-600 font-semibold" : row.remaining > 5 ? "text-green-600 font-semibold" : "font-semibold"}>
                            {row.remaining}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Leave Request Dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Leave Request</DialogTitle>
            <DialogDescription>Submit a new leave request for an employee.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitRequest} className="space-y-4">
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
                <Select value={newEmployee} onValueChange={setNewEmployee} required>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {activeEmps.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.empId})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Leave Type</Label>
              <Select value={newType} onValueChange={setNewType} required>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {activeLeaveTypes.map(lt => (
                    <SelectItem key={lt.id} value={lt.id}>{lt.name}{!lt.isPaid ? " (Unpaid)" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea placeholder="Provide a reason for the leave..." value={newReason} onChange={e => setNewReason(e.target.value)} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!newEmployee || !newType}>Submit Request</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Leave Request</DialogTitle>
            <DialogDescription>Are you sure you want to approve this leave request?</DialogDescription>
          </DialogHeader>
          {selectedLeaveData && (
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Employee:</span> {empMap.get(selectedLeaveData.employee_id)}</p>
              <p><span className="font-medium">Type:</span> {ltMap.get(selectedLeaveData.leave_type_id)}</p>
              <p><span className="font-medium">Duration:</span> {selectedLeaveData.days} days ({selectedLeaveData.start_date} to {selectedLeaveData.end_date})</p>
              <p><span className="font-medium">Reason:</span> {selectedLeaveData.reason}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>Cancel</Button>
            <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>Are you sure you want to reject this leave request?</DialogDescription>
          </DialogHeader>
          {selectedLeaveData && (
            <div className="space-y-3 text-sm">
              <p><span className="font-medium">Employee:</span> {empMap.get(selectedLeaveData.employee_id)}</p>
              <p><span className="font-medium">Type:</span> {ltMap.get(selectedLeaveData.leave_type_id)} · {selectedLeaveData.days} days</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
