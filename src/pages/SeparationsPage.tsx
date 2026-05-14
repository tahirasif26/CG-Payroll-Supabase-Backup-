import { useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2, Undo2, Eye, CheckCircle2, Search, Filter, UserMinus, AlertTriangle, Package, CreditCard, Users2, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAssets } from "@/contexts/AssetContext";
import { useReporting } from "@/contexts/ReportingContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { DollarSign, Users } from "lucide-react";
import { useSeparations, SeparationRecord } from "@/contexts/SeparationContext";
import { usePayrollRuns } from "@/hooks/queries/usePayroll";
import { useLeaveRequests } from "@/hooks/queries/useLeave";
import { useLoans } from "@/hooks/queries/useLoans";
import { useExpenses } from "@/hooks/queries/useExpenses";

// Map DB rows to the legacy camelCase shape this page was built against.
function mapPayrollRuns(rows: any[]): any[] {
  return rows.map(r => ({ id: r.id, month: r.month, year: r.year, status: r.status }));
}
function mapLeaves(rows: any[]): any[] {
  return rows.map(r => ({ id: r.id, employeeId: r.employee_id, status: r.status, days: r.days ?? 0 }));
}
function mapLoans(rows: any[]): any[] {
  return rows.map(r => ({
    id: r.id, employeeId: r.employee_id, status: r.status,
    monthlyDeduction: Number(r.monthly_deduction) || 0,
    remainingBalance: Number(r.remaining_balance) || 0,
  }));
}
function mapExpenses(rows: any[]): any[] {
  return rows.map(r => ({ id: r.id, employeeId: r.employee_id, status: r.status, amount: Number(r.amount) || 0 }));
}
import { useEmployees } from "@/contexts/EmployeeContext";
import { eosBenefitConfigs, calculateEOSBenefit } from "@/pages/settings/EOSBenefitsPage";
import { useEosBenefitConfigs } from "@/hooks/queries/useEosBenefitConfigs";
import { calculateEosb } from "@/lib/eosb";
import { mapToEosbCountry } from "@/lib/eosb/country";
import { toMinorUnits, fromMinorUnits } from "@/lib/money";
import { useBLEAccess } from "@/contexts/BLEAccessContext";
import { useLeaveTypes } from "@/contexts/LeaveTypeContext";
import { calculateLeaveEncashment } from "@/lib/leaveEncashment";
import { usePayrollSetups } from "@/contexts/PayrollSetupContext";

// --- Active Employees EOS Tab ---
function ActiveEmployeesTab() {
  const { employees } = useEmployees();
  const { separations, addSeparation } = useSeparations();
  const { toast } = useToast();
  const { data: payrollRunsRaw = [] } = usePayrollRuns();
  const { data: leaveRequestsRaw = [] } = useLeaveRequests();
  const { data: loansRaw = [] } = useLoans();
  useEosBenefitConfigs(); // hydrate eosBenefitConfigs snapshot
  const { leaveTypes, balances: leaveBalances } = useLeaveTypes();
  const { getSetupById } = usePayrollSetups();
  const payrollRuns = useMemo(() => mapPayrollRuns(payrollRunsRaw), [payrollRunsRaw]);
  const leaveRequests = useMemo(() => mapLeaves(leaveRequestsRaw), [leaveRequestsRaw]);
  const loans = useMemo(() => mapLoans(loansRaw), [loansRaw]);
  const [search, setSearch] = useState("");
  const [separationOpen, setSeparationOpen] = useState(false);
  const [separationEmp, setSeparationEmp] = useState<any>(null);
  const [separationData, setSeparationData] = useState({
    lastDate: "",
    reason: "resignation",
    noticePeriodDays: 30,
    noticePeriodServed: true,
  });

  const separatedIds = new Set(
    separations.filter(s => s.status === "approved").map(s => s.employeeId)
  );
  const activeEmployees = employees.filter(e => !separatedIds.has(e.id) && (e.status === "active" || e.status === "on-leave"));

  const processingRun = payrollRuns.find(r => r.status === "processing" || r.status === "draft");

  const eosData = useMemo(() => {
    return activeEmployees.map(emp => {
      const yearsOfService = emp.joiningDate
        ? (Date.now() - new Date(emp.joiningDate).getTime()) / (1000 * 60 * 60 * 24 * 365)
        : 0;
      const basicSalary = emp.compensation?.find(c => c.type === "base")?.amount || Math.round(emp.salary * 0.6);
      const country = mapToEosbCountry(emp.workLocationCountry);
      let totalEOS = 0;
      if (country && emp.joiningDate) {
        // Country-aware statutory engine (assumes still employed → today as last day, termination factor)
        const lastBasicMinor = toMinorUnits(basicSalary, "SAR");
        const res = calculateEosb(country, {
          lastBasic: lastBasicMinor,
          joiningDate: emp.joiningDate,
          lastWorkingDate: new Date().toISOString().slice(0, 10),
          reason: "termination",
        });
        totalEOS = Math.round(fromMinorUnits(res.amount, "SAR"));
      } else {
        const applicableEOS = eosBenefitConfigs.filter(c => c.isActive && (c.appliesTo.length === 0 || c.appliesTo.includes(emp.category)));
        totalEOS = applicableEOS.reduce((sum, config) => {
          const basis = config.calculationBasis === "basic_salary" ? basicSalary : emp.salary;
          return sum + calculateEOSBenefit(config, yearsOfService, basis);
        }, 0);
      }
      return { emp, yearsOfService, totalEOS };
    });
  }, [activeEmployees]);

  const totalEOSOutstanding = eosData.reduce((s, d) => s + d.totalEOS, 0);

  const filtered = eosData.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${d.emp.firstName} ${d.emp.lastName}`.toLowerCase().includes(q) || d.emp.empId.toLowerCase().includes(q) || d.emp.department.toLowerCase().includes(q);
  });

  const openSeparation = (emp: any) => {
    setSeparationEmp(emp);
    setSeparationData({ lastDate: "", reason: "resignation", noticePeriodDays: 30, noticePeriodServed: true });
    setSeparationOpen(true);
  };

  const handleConfirmSeparation = () => {
    if (!separationEmp || !separationData.lastDate) return;
    const emp = separationEmp;
    const yearsOfService = emp.joiningDate
      ? (Date.now() - new Date(emp.joiningDate).getTime()) / (1000 * 60 * 60 * 24 * 365)
      : 0;
    const basicSalary = emp.compensation?.find((c: any) => c.type === "base")?.amount || Math.round(emp.salary * 0.6);
    const dailySalary = emp.salary / 30;
    const empSetup = emp.payrollSetupId ? getSetupById(emp.payrollSetupId) : undefined;
    const currency = empSetup?.currency || "SAR";
    const country = mapToEosbCountry(emp.workLocationCountry);
    const reasonForEngine: "resignation" | "termination" | "end_of_contract" | "retirement" =
      separationData.reason === "resignation" || separationData.reason === "termination" ||
      separationData.reason === "end_of_contract" || separationData.reason === "retirement"
        ? separationData.reason
        : "termination";
    let eosBreakdown: { name: string; amount: number }[];
    let totalEOS: number;
    if (country && emp.joiningDate) {
      const res = calculateEosb(country, {
        lastBasic: toMinorUnits(basicSalary, currency),
        joiningDate: emp.joiningDate,
        lastWorkingDate: separationData.lastDate,
        reason: reasonForEngine,
      });
      totalEOS = Math.round(fromMinorUnits(res.amount, currency));
      eosBreakdown = [{ name: country === "SA" ? "KSA Statutory Gratuity" : "UAE Statutory Gratuity", amount: totalEOS }];
    } else {
      const applicableEOS = eosBenefitConfigs.filter(c => c.isActive && (c.appliesTo.length === 0 || c.appliesTo.includes(emp.category)));
      eosBreakdown = applicableEOS.map((config: any) => {
        const basis = config.calculationBasis === "basic_salary" ? basicSalary : emp.salary;
        return { name: config.name, amount: calculateEOSBenefit(config, yearsOfService, basis) };
      });
      totalEOS = eosBreakdown.reduce((s, e) => s + e.amount, 0);
    }

    const empLeaves = leaveRequests.filter(l => l.employeeId === emp.id && l.status === "approved");
    const totalUsedLeave = empLeaves.reduce((s: number, l: any) => s + l.days, 0);
    const remainingLeave = 21 - totalUsedLeave;
    const encash = calculateLeaveEncashment({
      employeeId: emp.id,
      basicSalary,
      leaveTypes,
      balances: leaveBalances,
    });
    const leaveEncashment = encash.amount;

    const lastDate = new Date(separationData.lastDate);
    const daysWorkedInMonth = lastDate.getDate();
    const unpaidSalary = Math.round(dailySalary * daysWorkedInMonth);
    // Notice period handling:
    // - Termination (employer-initiated) + notice NOT served → pay-in-lieu to employee.
    // - Resignation / end_of_contract (employee-initiated) + notice NOT served →
    //   recover from employee, capped by payroll setup's noticePeriodRecoveryDays.
    // - Retirement → no adjustment.
    let noticePeriodPay = 0;
    let noticePeriodRecovery = 0;
    if (!separationData.noticePeriodServed) {
      if (separationData.reason === "termination") {
        noticePeriodPay = Math.round(dailySalary * separationData.noticePeriodDays);
      } else if (separationData.reason === "resignation" || separationData.reason === "end_of_contract") {
        const setup = emp.payrollSetupId ? getSetupById(emp.payrollSetupId) : undefined;
        const cap = setup?.finalSettlement?.noticePeriodRecoveryDays ?? separationData.noticePeriodDays;
        const recoverDays = Math.min(separationData.noticePeriodDays, cap);
        noticePeriodRecovery = Math.round(dailySalary * recoverDays);
      }
    }
    const empLoans = loans.filter(l => l.employeeId === emp.id && l.status === "active");
    const totalLoanBalance = empLoans.reduce((s: number, l: any) => s + l.remainingBalance, 0);
    const totalSettlement = unpaidSalary + totalEOS + leaveEncashment + noticePeriodPay - noticePeriodRecovery - totalLoanBalance;

    const run = payrollRuns.find(r => r.status === "processing" || r.status === "draft");

    addSeparation({
      id: String(Date.now()),
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      empId: emp.empId,
      department: emp.department,
      designation: emp.designation,
      lastDate: separationData.lastDate,
      reason: separationData.reason,
      noticePeriodDays: separationData.noticePeriodDays,
      noticePeriodServed: separationData.noticePeriodServed,
      unpaidSalary,
      eosAmount: totalEOS,
      eosBreakdown,
      leaveEncashment: Math.round(leaveEncashment),
      noticePeriodPay,
      noticePeriodRecovery,
      loanDeduction: totalLoanBalance,
      totalSettlement,
      processedDate: new Date().toISOString().split("T")[0],
      payrollMonth: run?.month || "",
      payrollYear: run?.year || new Date().getFullYear(),
      currency,
      status: "pending",
    });

    setSeparationOpen(false);
    toast({ title: "Separation Initiated", description: `${emp.firstName} ${emp.lastName}'s separation has been created as pending.` });
  };

  return (
    <div className="space-y-4">
      {processingRun && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-2">
          <span className="font-medium">Active Payroll Run:</span>
          <Badge variant="outline">{processingRun.month} {processingRun.year} (Run #{processingRun.id})</Badge>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard title="Active Employees" value={activeEmployees.length} icon={Users} variant="primary" />
        <StatCard title="Total EOS Outstanding" value={`SAR ${totalEOSOutstanding.toLocaleString()}`} icon={DollarSign} variant="warning" />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name, ID, department..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Employee</TableHead>
                <TableHead className="font-semibold">ID</TableHead>
                <TableHead className="font-semibold">Department</TableHead>
                <TableHead className="font-semibold">Designation</TableHead>
                <TableHead className="font-semibold">Joining Date</TableHead>
                <TableHead className="font-semibold text-right">Years of Service</TableHead>
                <TableHead className="font-semibold text-right">EOS Outstanding (SAR)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length > 0 ? filtered.map(({ emp, yearsOfService, totalEOS }) => (
                <TableRow key={emp.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <button
                      className="text-sm font-medium text-primary hover:underline cursor-pointer bg-transparent border-none p-0"
                      onClick={() => openSeparation(emp)}
                    >
                      {emp.firstName} {emp.lastName}
                    </button>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{emp.empId}</TableCell>
                  <TableCell>{emp.department}</TableCell>
                  <TableCell>{emp.designation}</TableCell>
                  <TableCell>{new Date(emp.joiningDate).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">{yearsOfService.toFixed(1)}</TableCell>
                  <TableCell className="text-right font-semibold">{totalEOS.toLocaleString()}</TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No active employees found.</TableCell>
                </TableRow>
              )}
              {filtered.length > 0 && (
                <TableRow className="bg-muted/30 font-bold">
                  <TableCell colSpan={6} className="text-right text-sm">Total EOS Outstanding</TableCell>
                  <TableCell className="text-right text-sm font-bold">SAR {filtered.reduce((s, d) => s + d.totalEOS, 0).toLocaleString()}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Separation Dialog */}
      <Dialog open={separationOpen} onOpenChange={setSeparationOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Initiate Separation — {separationEmp?.firstName} {separationEmp?.lastName}</DialogTitle>
            <DialogDescription>Calculate end-of-service settlement and process separation.</DialogDescription>
          </DialogHeader>
          {separationEmp && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Separation Reason</Label>
                  <Select value={separationData.reason} onValueChange={v => setSeparationData({ ...separationData, reason: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="resignation">Resignation</SelectItem>
                      <SelectItem value="termination">Termination</SelectItem>
                      <SelectItem value="end_of_contract">End of Contract</SelectItem>
                      <SelectItem value="retirement">Retirement</SelectItem>
                      <SelectItem value="mutual">Mutual Agreement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Last Working Date</Label>
                  <Input type="date" value={separationData.lastDate} onChange={e => setSeparationData({ ...separationData, lastDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Notice Period (Days)</Label>
                  <Input type="number" value={separationData.noticePeriodDays} onChange={e => setSeparationData({ ...separationData, noticePeriodDays: Number(e.target.value) })} />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <input type="checkbox" checked={separationData.noticePeriodServed} onChange={e => setSeparationData({ ...separationData, noticePeriodServed: e.target.checked })} className="h-4 w-4" />
                  <Label className="text-sm">Notice period served</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSeparationOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmSeparation} disabled={!separationData.lastDate}>
              <UserMinus className="h-4 w-4 mr-2" />Process Separation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Separated Employees Tab (existing functionality) ---
function SeparatedEmployeesTab() {
  const { separations, updateSeparation, removeSeparation } = useSeparations();
  const { employees } = useEmployees();
  const { getAssetsForEmployee, reassignAsset } = useAssets();
  const { data: payrollRunsRaw = [] } = usePayrollRuns();
  const { data: expensesRaw = [] } = useExpenses();
  const payrollRuns = useMemo(() => mapPayrollRuns(payrollRunsRaw), [payrollRunsRaw]);
  const expenses = useMemo(() => mapExpenses(expensesRaw), [expensesRaw]);
  const { reportMap, setReportTo } = useReporting();
  const { revokeAllForEmployee, getActiveGrantCountForEmployee } = useBLEAccess();
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<SeparationRecord | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<SeparationRecord | null>(null);
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterReason, setFilterReason] = useState("all");

  // Pre-approval checklist state
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checklistSep, setChecklistSep] = useState<SeparationRecord | null>(null);
  const [reportReassignments, setReportReassignments] = useState<Record<string, string>>({});
  const [assetReassignments, setAssetReassignments] = useState<Record<string, string>>({});

  const filteredSeparations = separations.filter(sep => {
    const q = search.toLowerCase();
    const matchesSearch = !q || sep.employeeName.toLowerCase().includes(q) || sep.empId.toLowerCase().includes(q) || sep.department.toLowerCase().includes(q);
    const matchesStatus = filterStatus === "all" || sep.status === filterStatus;
    const matchesReason = filterReason === "all" || sep.reason === filterReason;
    return matchesSearch && matchesStatus && matchesReason;
  });

  const openEdit = (sep: SeparationRecord) => {
    setEditItem({ ...sep });
    setEditOpen(true);
  };

  const handleSave = () => {
    if (!editItem) return;
    updateSeparation(editItem.id, editItem);
    setEditOpen(false);
    toast({ title: "Updated", description: `Separation record for ${editItem.employeeName} updated.` });
  };

  const handleDelete = (id: string) => {
    const sep = separations.find(s => s.id === id);
    removeSeparation(id);
    setDeleteConfirmOpen(false);
    setDeleteId(null);
    toast({ title: "Separation Reversed", description: `${sep?.employeeName}'s separation has been reversed. Employee is now active again.` });
  };

  // Get checklist data for a separation
  const getChecklistData = (sep: SeparationRecord) => {
    const directReports = Object.entries(reportMap)
      .filter(([_, managerId]) => managerId === sep.employeeId)
      .map(([empId]) => employees.find(e => e.id === empId))
      .filter(Boolean) as typeof employees;

    const empAssets = getAssetsForEmployee(sep.employeeId);

    const pendingExpenses = expenses.filter(
      e => e.employeeId === sep.employeeId && e.status === "pending"
    );

    return { directReports, empAssets, pendingExpenses };
  };

  const handleApprove = (sep: SeparationRecord) => {
    // Open checklist dialog instead of approving directly
    const { directReports, empAssets, pendingExpenses } = getChecklistData(sep);

    // Initialize reassignment maps
    const reportInit: Record<string, string> = {};
    directReports.forEach(dr => { reportInit[dr.id] = ""; });
    setReportReassignments(reportInit);

    const assetInit: Record<string, string> = {};
    empAssets.forEach(a => { assetInit[a.id] = ""; });
    setAssetReassignments(assetInit);

    setChecklistSep(sep);
    setChecklistOpen(true);
  };

  const confirmApproval = () => {
    if (!checklistSep) return;
    const { directReports, empAssets } = getChecklistData(checklistSep);

    // Check all direct reports are reassigned
    const unassignedReports = directReports.filter(dr => !reportReassignments[dr.id]);
    if (unassignedReports.length > 0) {
      toast({ title: "Reassign Direct Reports", description: "All direct reports must be reassigned before approval.", variant: "destructive" });
      return;
    }

    // Check all assets are reassigned/unassigned
    const unhandledAssets = empAssets.filter(a => !assetReassignments[a.id]);
    if (unhandledAssets.length > 0) {
      toast({ title: "Handle Assets", description: "All assets must be reassigned or unassigned before approval.", variant: "destructive" });
      return;
    }

    const processingRun = payrollRuns.find(r => r.status === "processing" || r.status === "draft");
    if (!processingRun) {
      toast({ title: "No Active Payroll", description: "There is no processing or draft payroll run to link this separation to.", variant: "destructive" });
      return;
    }

    // Apply reporting reassignments
    Object.entries(reportReassignments).forEach(([empId, newManagerId]) => {
      if (newManagerId) setReportTo(empId, newManagerId);
    });

    // Apply asset reassignments
    Object.entries(assetReassignments).forEach(([assetId, targetEmpId]) => {
      if (targetEmpId === "__unassign__") {
        reassignAsset(assetId, null, null);
      } else if (targetEmpId) {
        const targetEmp = employees.find(e => e.id === targetEmpId);
        reassignAsset(assetId, targetEmpId, targetEmp ? `${targetEmp.firstName} ${targetEmp.lastName}` : null);
      }
    });

    // Revoke all BLE access
    revokeAllForEmployee(checklistSep.employeeId);

    // Approve
    updateSeparation(checklistSep.id, {
      status: "approved",
      payrollRunId: processingRun.id,
      payrollMonth: processingRun.month,
      payrollYear: processingRun.year,
    });

    setChecklistOpen(false);
    setChecklistSep(null);
    toast({ title: "Separation Approved", description: `${checklistSep.employeeName}'s separation linked to ${processingRun.month} ${processingRun.year} payroll.` });
  };

  const activeEmps = employees.filter(e => e.status === "active" || e.status === "on-leave");

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, ID, department..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]"><Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" /><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterReason} onValueChange={setFilterReason}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Reason" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reasons</SelectItem>
            <SelectItem value="resignation">Resignation</SelectItem>
            <SelectItem value="termination">Termination</SelectItem>
            <SelectItem value="retirement">Retirement</SelectItem>
            <SelectItem value="end_of_contract">End of Contract</SelectItem>
            <SelectItem value="mutual">Mutual Agreement</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Employee</TableHead>
                <TableHead className="font-semibold">ID</TableHead>
                <TableHead className="font-semibold">Department</TableHead>
                <TableHead className="font-semibold">Last Date</TableHead>
                <TableHead className="font-semibold">Reason</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Settlement (SAR)</TableHead>
                <TableHead className="font-semibold">Payroll Period</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSeparations.length > 0 ? filteredSeparations.map(sep => (
                <TableRow key={sep.id} className="hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => setDetailItem(sep)}>
                  <TableCell className="font-medium">{sep.employeeName}</TableCell>
                  <TableCell className="font-mono text-sm">{sep.empId}</TableCell>
                  <TableCell>{sep.department}</TableCell>
                  <TableCell>{sep.lastDate}</TableCell>
                  <TableCell className="capitalize">{sep.reason.replace("_", " ")}</TableCell>
                  <TableCell>
                    <Badge variant={sep.status === "approved" ? "default" : "secondary"}>
                      {sep.status === "approved" ? "Approved" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{sep.totalSettlement.toLocaleString()}</TableCell>
                  <TableCell>{sep.status === "approved" ? `${sep.payrollMonth} ${sep.payrollYear}` : "—"}</TableCell>
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailItem(sep)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {sep.status === "pending" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => handleApprove(sep)} title="Approve & link to payroll">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(sep)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeleteId(sep.id); setDeleteConfirmOpen(true); }}>
                        <Undo2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No separations recorded yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailItem} onOpenChange={open => { if (!open) setDetailItem(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
          {detailItem && (
            <>
              <div className="bg-primary px-6 py-5 text-primary-foreground">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold">{detailItem.employeeName}</h2>
                    <p className="text-xs text-primary-foreground/70">{detailItem.designation} · {detailItem.department} · {detailItem.empId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold capitalize">{detailItem.reason.replace("_", " ")}</p>
                    <p className="text-xs text-primary-foreground/70">Processed {detailItem.processedDate}</p>
                  </div>
                </div>
              </div>
              <ScrollArea className="max-h-[calc(90vh-200px)]">
                <div className="px-6 py-5 space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div><p className="text-xs text-muted-foreground">Last Working Date</p><p className="font-semibold">{detailItem.lastDate}</p></div>
                    <div><p className="text-xs text-muted-foreground">Notice Period</p><p className="font-semibold">{detailItem.noticePeriodDays} days {detailItem.noticePeriodServed ? "(Served)" : "(Not Served)"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Payroll Period</p><p className="font-semibold">{detailItem.payrollMonth} {detailItem.payrollYear}</p></div>
                    <div><p className="text-xs text-muted-foreground">Separation Reason</p><p className="font-semibold capitalize">{detailItem.reason.replace("_", " ")}</p></div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Settlement Breakdown</p>
                    <div className="bg-muted/30 rounded-lg overflow-hidden text-sm">
                      <div className="flex justify-between px-3 py-2.5 border-b border-border/50">
                        <div><span className="font-medium">Unpaid Salary</span><p className="text-xs text-muted-foreground">{new Date(detailItem.lastDate).getDate()} days</p></div>
                        <span className="font-semibold">{detailItem.currency || "SAR"} {detailItem.unpaidSalary.toLocaleString()}</span>
                      </div>
                      {detailItem.eosBreakdown.map((eos, i) => (
                        <div key={i} className="flex justify-between px-3 py-2.5 border-b border-border/50">
                          <div><span className="font-medium">{eos.name}</span><p className="text-xs text-muted-foreground">End of service benefit</p></div>
                          <span className="font-semibold">{detailItem.currency || "SAR"} {eos.amount.toLocaleString()}</span>
                        </div>
                      ))}
                      {detailItem.noticePeriodPay > 0 && (
                        <div className="flex justify-between px-3 py-2.5 border-b border-border/50">
                          <span className="font-medium">Notice Period Payment (in lieu)</span>
                          <span className="font-semibold">{detailItem.currency || "SAR"} {detailItem.noticePeriodPay.toLocaleString()}</span>
                        </div>
                      )}
                      {(detailItem.noticePeriodRecovery ?? 0) > 0 && (
                        <div className="flex justify-between px-3 py-2.5 border-b border-border/50 text-destructive">
                          <span className="font-medium">Notice Period Recovery</span>
                          <span className="font-semibold">- {detailItem.currency || "SAR"} {detailItem.noticePeriodRecovery!.toLocaleString()}</span>
                        </div>
                      )}
                      {detailItem.loanDeduction > 0 && (
                        <div className="flex justify-between px-3 py-2.5 border-b border-border/50 text-destructive">
                          <span className="font-medium">Outstanding Loan Deduction</span>
                          <span className="font-semibold">- {detailItem.currency || "SAR"} {detailItem.loanDeduction.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between px-4 py-3 font-bold bg-primary/10">
                        <span>Total Final Settlement</span>
                        <span className="text-primary text-lg">{detailItem.currency || "SAR"} {detailItem.totalSettlement.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
              <div className="px-6 pb-5 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDetailItem(null)}>Close</Button>
                <Button variant="outline" onClick={() => { setDetailItem(null); openEdit(detailItem); }}>
                  <Edit2 className="h-4 w-4 mr-2" />Edit
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Separation</DialogTitle>
            <DialogDescription>Update separation details for {editItem?.employeeName}.</DialogDescription>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Last Working Date</Label>
                  <Input type="date" value={editItem.lastDate} onChange={e => setEditItem({ ...editItem, lastDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Select value={editItem.reason} onValueChange={v => setEditItem({ ...editItem, reason: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="resignation">Resignation</SelectItem>
                      <SelectItem value="termination">Termination</SelectItem>
                      <SelectItem value="retirement">Retirement</SelectItem>
                      <SelectItem value="end_of_contract">End of Contract</SelectItem>
                      <SelectItem value="mutual">Mutual Agreement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Settlement Breakdown</Label>
                <div className="bg-muted/30 rounded-lg text-sm overflow-hidden">
                  <div className="flex justify-between px-3 py-2 border-b border-border/50">
                    <span>Unpaid Salary</span>
                    <span className="font-medium">SAR {editItem.unpaidSalary.toLocaleString()}</span>
                  </div>
                  {editItem.eosBreakdown.map((eos, i) => (
                    <div key={i} className="flex justify-between px-3 py-2 border-b border-border/50">
                      <span>{eos.name}</span>
                      <span className="font-medium">SAR {eos.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  {editItem.noticePeriodPay > 0 && (
                    <div className="flex justify-between px-3 py-2 border-b border-border/50">
                      <span>Notice Period Pay (in lieu)</span>
                      <span className="font-medium">SAR {editItem.noticePeriodPay.toLocaleString()}</span>
                    </div>
                  )}
                  {(editItem.noticePeriodRecovery ?? 0) > 0 && (
                    <div className="flex justify-between px-3 py-2 border-b border-border/50 text-destructive">
                      <span>Notice Period Recovery</span>
                      <span className="font-medium">- SAR {editItem.noticePeriodRecovery!.toLocaleString()}</span>
                    </div>
                  )}
                  {editItem.loanDeduction > 0 && (
                    <div className="flex justify-between px-3 py-2 border-b border-border/50 text-destructive">
                      <span>Loan Deduction</span>
                      <span className="font-medium">- SAR {editItem.loanDeduction.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between px-3 py-2 font-bold bg-primary/10">
                    <span>Total Settlement</span>
                    <span className="text-primary">SAR {editItem.totalSettlement.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reverse Separation</DialogTitle>
            <DialogDescription>This will reverse the separation and reactivate the employee. Are you sure?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>
              <Undo2 className="h-4 w-4 mr-2" />Reverse & Reactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pre-Approval Checklist Dialog */}
      <Dialog open={checklistOpen} onOpenChange={setChecklistOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
          <div className="bg-primary px-6 py-5 text-primary-foreground">
            <h2 className="text-lg font-bold">Pre-Approval Checklist</h2>
            <p className="text-xs text-primary-foreground/70">
              Review and resolve items before approving {checklistSep?.employeeName}'s separation.
            </p>
          </div>
          {checklistSep && (() => {
            const { directReports, empAssets, pendingExpenses } = getChecklistData(checklistSep);
            const bleGrantCount = getActiveGrantCountForEmployee(checklistSep.employeeId);
            const hasIssues = directReports.length > 0 || empAssets.length > 0 || pendingExpenses.length > 0;

            return (
              <ScrollArea className="max-h-[calc(90vh-180px)]">
                <div className="px-6 py-5 space-y-5">
                  {!hasIssues && (
                    <div className="text-center py-6 text-muted-foreground">
                      <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500" />
                      <p className="font-medium">No blockers found. Ready to approve.</p>
                    </div>
                  )}

                  {/* Direct Reports Section */}
                  {directReports.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Users2 className="h-4 w-4 text-orange-500" />
                        <h3 className="text-sm font-semibold">Direct Reports ({directReports.length})</h3>
                        <Badge variant="secondary" className="text-xs">Requires Reassignment</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        The following employees report to {checklistSep.employeeName}. Reassign them to continue.
                      </p>
                      <div className="space-y-2">
                        {directReports.map(dr => (
                          <div key={dr.id} className="flex items-center justify-between gap-3 bg-muted/30 rounded-lg px-3 py-2.5">
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{dr.firstName} {dr.lastName}</p>
                              <p className="text-xs text-muted-foreground">{dr.designation} · {dr.department}</p>
                            </div>
                            <Select
                              value={reportReassignments[dr.id] || ""}
                              onValueChange={v => setReportReassignments(prev => ({ ...prev, [dr.id]: v }))}
                            >
                              <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="New manager..." />
                              </SelectTrigger>
                              <SelectContent>
                                {activeEmps
                                  .filter(e => e.id !== checklistSep.employeeId && e.id !== dr.id)
                                  .map(e => (
                                    <SelectItem key={e.id} value={e.id}>
                                      {e.firstName} {e.lastName}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assets Section */}
                  {empAssets.length > 0 && (
                    <>
                      {directReports.length > 0 && <Separator />}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-orange-500" />
                          <h3 className="text-sm font-semibold">Assigned Assets ({empAssets.length})</h3>
                          <Badge variant="secondary" className="text-xs">Requires Action</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Reassign or unassign assets currently held by {checklistSep.employeeName}.
                        </p>
                        <div className="space-y-2">
                          {empAssets.map(asset => (
                            <div key={asset.id} className="flex items-center justify-between gap-3 bg-muted/30 rounded-lg px-3 py-2.5">
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{asset.name}</p>
                                <p className="text-xs text-muted-foreground">{asset.category} · {asset.serialNumber}</p>
                              </div>
                              <Select
                                value={assetReassignments[asset.id] || ""}
                                onValueChange={v => setAssetReassignments(prev => ({ ...prev, [asset.id]: v }))}
                              >
                                <SelectTrigger className="w-[200px]">
                                  <SelectValue placeholder="Reassign to..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__unassign__">
                                    Unassign (Available)
                                  </SelectItem>
                                  {activeEmps
                                    .filter(e => e.id !== checklistSep.employeeId)
                                    .map(e => (
                                      <SelectItem key={e.id} value={e.id}>
                                        {e.firstName} {e.lastName}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Pending Expenses Section */}
                  {pendingExpenses.length > 0 && (
                    <>
                      {(directReports.length > 0 || empAssets.length > 0) && <Separator />}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-yellow-500" />
                          <h3 className="text-sm font-semibold">Pending Expenses ({pendingExpenses.length})</h3>
                          <Badge variant="outline" className="text-xs">Info</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          These expenses are pending approval. They should be resolved in the Expenses module.
                        </p>
                        <div className="space-y-1">
                          {pendingExpenses.map(exp => (
                            <div key={exp.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2.5">
                              <div>
                                <p className="text-sm font-medium">{exp.description}</p>
                                <p className="text-xs text-muted-foreground">{exp.category} · {exp.expenseDate}</p>
                              </div>
                              <span className="text-sm font-semibold">SAR {exp.amount.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* BLE Access Section */}
                  {bleGrantCount > 0 && (
                    <>
                      {(directReports.length > 0 || empAssets.length > 0 || pendingExpenses.length > 0) && <Separator />}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-blue-500" />
                          <h3 className="text-sm font-semibold">BLE Access</h3>
                          <Badge variant="outline" className="text-xs">Auto</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {bleGrantCount} active BLE door access grant(s) will be automatically revoked upon approval.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            );
          })()}
          <div className="px-6 pb-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setChecklistOpen(false)}>Cancel</Button>
            <Button onClick={confirmApproval}>
              <CheckCircle2 className="h-4 w-4 mr-2" />Approve Separation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Main Page ---
export default function SeparationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="End of Service" description="Manage employee end-of-service benefits, separations, and final settlements." />
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active Employees</TabsTrigger>
          <TabsTrigger value="separated">Separated Employees</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          <ActiveEmployeesTab />
        </TabsContent>
        <TabsContent value="separated">
          <SeparatedEmployeesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
