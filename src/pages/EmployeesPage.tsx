import { useState, useMemo, useEffect } from "react";
import { useAudit } from "@/contexts/AuditContext";
import { format, differenceInDays, isPast, parseISO } from "date-fns";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
// Mock leave/payroll arrays removed — live data now comes from DB queries.
// Local empty stubs preserve legacy filter() call-sites until each is migrated.
const leaveRequests: any[] = [];
const payrollRuns: any[] = [];
import { useEmployees } from "@/contexts/EmployeeContext";
import { useAssets } from "@/contexts/AssetContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Download, FileText, Upload, User, Briefcase, DollarSign, Calendar, Monitor, ChevronLeft, Edit2, Save, X, GraduationCap, Heart, Phone, MapPin, Building, CreditCard, ArrowUpDown, Search, Filter, UserMinus, ClipboardList, RefreshCw, History, Settings, Bell, ChevronDown, ChevronUp, Trash2, Send, Loader2, CheckCircle2, Calculator } from "lucide-react";
import { calcMonthlyTax } from "@/lib/taxSlabs";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Employee } from "@/types/hcm";
import { compensationSettings, availableCurrencies } from "@/data/settingsData";
import { useEmployeeTypes } from "@/contexts/EmployeeTypeContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { eosBenefitConfigs, calculateEOSBenefit } from "@/pages/settings/EOSBenefitsPage";
import { useSeparations } from "@/contexts/SeparationContext";
import { useLeaveTypes } from "@/contexts/LeaveTypeContext";
import { useReporting } from "@/contexts/ReportingContext";
import { useReminderSettings } from "@/contexts/ReminderSettingsContext";
import { useRole } from "@/contexts/RoleContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usePayrollSetups } from "@/contexts/PayrollSetupContext";
import { AddEmployeeWizard } from "@/components/employees/AddEmployeeWizard";

import { useEmployeeProfile, useUpdateEmployeeProfile } from "@/hooks/queries/useEmployeeProfile";

interface EmployeeDocVersion {
  name: string;
  uploadedDate: string;
  expiryDate?: string;
}

interface EmployeeDoc {
  id: string;
  name: string;
  type: string;
  uploadedDate: string;
  expiryDate?: string;
  version: number;
  previousVersions: EmployeeDocVersion[];
}

type DocExpiryStatus = "active" | "expiring-soon" | "expired" | "no-expiry";

function getDocExpiryStatus(expiryDate?: string, reminderDays: number = 30): DocExpiryStatus {
  if (!expiryDate) return "no-expiry";
  const expiry = parseISO(expiryDate);
  if (isPast(expiry)) return "expired";
  if (differenceInDays(expiry, new Date()) <= reminderDays) return "expiring-soon";
  return "active";
}

const initialEmployeeDocs: Record<string, EmployeeDoc[]> = {};

// Extended employee data (mock - in production this would come from DB)
interface ExtendedEmployeeData {
  gender: string;
  maritalStatus: string;
  religion: string;
  nationality: string;
  bankName: string;
  bankCountry: string;
  swiftCode: string;
  bankAddress: string;
  iban: string;
  bankCurrency: string;
  beneficiaryName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  personalPhone: string;
  personalEmail: string;
  emergencyName: string;
  emergencyRelation: string;
  emergencyPhone: string;
  emergencyEmail: string;
  education: { degree: string; institution: string; year: string; field: string }[];
  dependants: { name: string; relation: string; dateOfBirth: string }[];
  reportsTo: string;
  workEmail: string;
  workLocationCity: string;
  workLocationCountry: string;
  division: string;
  compensationHistory: { effectiveDate: string; components: { name: string; amount: number }[]; reason: string }[];
}

const extendedData: Record<string, ExtendedEmployeeData> = {};

function getExtData(empId: string): ExtendedEmployeeData {
  return extendedData[empId] || {
    gender: "", maritalStatus: "", religion: "", nationality: "",
    bankName: "", bankCountry: "", swiftCode: "", bankAddress: "", iban: "", bankCurrency: "", beneficiaryName: "",
    addressLine1: "", addressLine2: "", city: "", state: "", country: "", postalCode: "",
    personalPhone: "", personalEmail: "",
    emergencyName: "", emergencyRelation: "", emergencyPhone: "", emergencyEmail: "",
    education: [], dependants: [],
    reportsTo: "", workEmail: "", workLocationCity: "", workLocationCountry: "", division: "",
    compensationHistory: [],
  };
}

// Reusable editable field
function EditableField({ label, value, editing, onChange, type = "text" }: {
  label: string; value: string; editing: boolean; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      {editing ? (
        <Input value={value} onChange={e => onChange(e.target.value)} type={type} className="h-8 text-sm" />
      ) : (
        <p className="text-sm font-medium">{value || "—"}</p>
      )}
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, editing, onEdit, onSave, onCancel, readOnly = false }: {
  title: string; icon: any; children: React.ReactNode; editing: boolean;
  onEdit?: () => void; onSave: () => void; onCancel: () => void; readOnly?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2"><Icon className="h-4 w-4 text-primary" />{title}</CardTitle>
        {!readOnly && onEdit && (
          <div className="flex gap-1">
            {editing ? (
              <>
                <Button size="sm" variant="ghost" onClick={onCancel}><X className="h-4 w-4" /></Button>
                <Button size="sm" onClick={onSave}><Save className="h-4 w-4 mr-1" />Save</Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={onEdit}><Edit2 className="h-4 w-4 mr-1" />Edit</Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

type SortField = "name" | "empId" | "department" | "designation" | "joiningDate" | "salary";
type SortDir = "asc" | "desc";

const ITEMS_PER_PAGE = 10;

import { useRoles, type Role } from "@/hooks/queries/useRoles";

function EmployeeDirectoryTable({ employees: empList, onSelect, onEdit, isEmployee = false }: { employees: Employee[]; onSelect: (emp: Employee) => void; onEdit?: (emp: Employee) => void; isEmployee?: boolean }) {
  const { getTypeName } = useEmployeeTypes();
  const { removeEmployee } = useEmployees();
  const { toast } = useToast();
  const { clientId } = useRole();
  const { data: roles } = useRoles(clientId);
  const roleMap = useMemo(() => {
    const m = new Map<string, string>();
    (roles ?? []).forEach((r: Role) => m.set(r.id, r.name));
    return m;
  }, [roles]);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Invite/verification status keyed by emp_id. Backed by employees.is_verified
  // (updated instantly via the mark_self_verified RPC after password setup).
  const queryClient = useQueryClient();
  const { data: inviteStatusList } = useQuery({
    queryKey: ["employee-invite-status", clientId],
    enabled: !!clientId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("employees")
        .select("emp_id, is_verified, verified_at")
        .eq("client_id", clientId!);
      if (error) throw error;
      return data ?? [];
    },
  });
  const inviteStatusMap = useMemo(() => {
    const m = new Map<string, string | null>();
    (inviteStatusList ?? []).forEach((p: any) => {
      if (p.emp_id) m.set(p.emp_id, p.is_verified ? (p.verified_at ?? new Date().toISOString()) : null);
    });
    return m;
  }, [inviteStatusList]);

  // Live updates: refresh the badge the moment an invitee activates their account.
  useEffect(() => {
    if (!clientId) return;
    const channel = supabase
      .channel(`employees-verify-${clientId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "employees", filter: `client_id=eq.${clientId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["employee-invite-status", clientId] });
          queryClient.invalidateQueries({ queryKey: ["verified-emp-ids", clientId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clientId, queryClient]);

  const handleResendInvite = async (emp: Employee) => {
    if (!clientId) return;
    setResendingId(emp.id);
    try {
      const { data, error } = await supabase.functions.invoke("resend-invite", {
        body: { email: emp.email, client_id: clientId },
      });
      const payload: any = data;
      // Already-verified case: edge function returns 409 with { verified: true }
      const errMsg: string = (error as any)?.message ?? payload?.error ?? "";
      const isAlreadyVerified =
        payload?.verified === true || /already verified/i.test(errMsg);
      if (isAlreadyVerified) {
        toast({
          title: "Already verified",
          description: `${emp.email} has already accepted the invite.`,
        });
        return;
      }
      if (error) throw error;
      if (payload?.error) throw new Error(payload.error);
      toast({
        title: "Invitation resent",
        description: `Invitation resent to ${emp.email}.`,
      });
    } catch (e: any) {
      toast({
        title: "Could not resend invite",
        description: e?.message ?? "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setResendingId(null);
    }
  };


  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeEmployee(deleteTarget.id);
      toast({ title: "Employee deleted", description: `${deleteTarget.firstName} ${deleteTarget.lastName} has been removed.` });
      setDeleteTarget(null);
    } catch (e: any) {
      toast({ title: "Delete failed", description: e?.message ?? "Could not delete employee.", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const departments = Array.from(new Set(empList.map(e => e.department)));
  const statuses = Array.from(new Set(empList.map(e => e.status)));

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortHeader = ({ field, children, className: extraCls }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <TableHead className={cn("font-semibold cursor-pointer select-none text-[11px] uppercase tracking-wider text-muted-foreground", extraCls)} onClick={() => toggleSort(field)}>
      <span className="flex items-center gap-1">{children}<ArrowUpDown className="h-3 w-3 text-muted-foreground/50" /></span>
    </TableHead>
  );

  const filtered = empList
    .filter(e => {
      const q = search.toLowerCase();
      const matchesSearch = !q || `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) || e.empId.toLowerCase().includes(q) || e.email.toLowerCase().includes(q);
      const matchesDept = deptFilter === "all" || e.department === deptFilter;
      const matchesStatus = statusFilter === "all" || e.status === statusFilter;
      return matchesSearch && matchesDept && matchesStatus;
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortField) {
        case "name": return dir * `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        case "empId": return dir * a.empId.localeCompare(b.empId);
        case "department": return dir * a.department.localeCompare(b.department);
        case "designation": return dir * a.designation.localeCompare(b.designation);
        case "joiningDate": return dir * (new Date(a.joiningDate).getTime() - new Date(b.joiningDate).getTime());
        case "salary": return dir * (a.salary - b.salary);
        default: return 0;
      }
    });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedItems = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const activeCount = empList.filter(e => e.status === "active").length;
  const onLeaveCount = empList.filter(e => e.status === "on-leave").length;

  const allPageSelected = paginatedItems.length > 0 && paginatedItems.every(e => selectedIds.has(e.id));
  const toggleAll = () => {
    if (allPageSelected) {
      const newSet = new Set(selectedIds);
      paginatedItems.forEach(e => newSet.delete(e.id));
      setSelectedIds(newSet);
    } else {
      const newSet = new Set(selectedIds);
      paginatedItems.forEach(e => newSet.add(e.id));
      setSelectedIds(newSet);
    }
  };
  const toggleOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedIds(newSet);
  };

  // Reset page on filter change
  const handleSearch = (v: string) => { setSearch(v); setCurrentPage(1); };
  const handleDeptFilter = (v: string) => { setDeptFilter(v); setCurrentPage(1); };
  const handleStatusFilter = (v: string) => { setStatusFilter(v); setCurrentPage(1); };

  const renderPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="space-y-5">
      {/* Stat cards row */}
      {!isEmployee && (
        <div className="flex items-stretch gap-4">
          <div className="flex-1 bg-card border rounded-xl p-5 flex flex-col justify-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Total Headcount</p>
            <p className="text-3xl font-bold tracking-tight text-foreground">{empList.length}</p>
          </div>
          <div className="flex-1 bg-card border rounded-xl p-5 flex flex-col justify-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Active</p>
            <p className="text-3xl font-bold tracking-tight text-info">{activeCount}</p>
          </div>
          <div className="flex-1 bg-card border rounded-xl p-5 flex flex-col justify-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">On Leave</p>
            <p className="text-3xl font-bold tracking-tight text-foreground">{onLeaveCount}</p>
          </div>
          <div className="flex-1 bg-card border rounded-xl p-5 flex items-center gap-3">
            {/* Avatar stack */}
            <div className="flex -space-x-2">
              {empList.slice(0, 4).map(emp => (
                <div key={emp.id} className="h-9 w-9 rounded-full bg-secondary border-2 border-card flex items-center justify-center shrink-0" title={`${emp.firstName} ${emp.lastName}`}>
                  <span className="text-[10px] font-bold text-secondary-foreground">{emp.firstName[0]}{emp.lastName[0]}</span>
                </div>
              ))}
              {empList.length > 4 && (
                <div className="h-9 w-9 rounded-full bg-muted border-2 border-card flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-semibold text-muted-foreground">+{empList.length - 4}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk actions bar */}
      {!isEmployee && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedIds.size > 0 && (
              <>
                <Button variant="outline" size="sm" className="text-xs gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5" />
                  Bulk Actions
                  <ChevronDown className="h-3 w-3" />
                </Button>
                <span className="text-xs text-muted-foreground">{selectedIds.size} items selected</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8"><Filter className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              {!isEmployee && (
                <TableHead className="w-10 pl-4">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                  />
                </TableHead>
              )}
              <SortHeader field="name">Employee</SortHeader>
              <SortHeader field="empId">Employee ID</SortHeader>
              <SortHeader field="department">Department</SortHeader>
              <SortHeader field="designation">Designation</SortHeader>
              <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Role</TableHead>
              {!isEmployee && <SortHeader field="salary" className="hidden lg:table-cell">Work Location</SortHeader>}
              <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Status</TableHead>
              {!isEmployee && <TableHead className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground text-right pr-4">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.length > 0 ? paginatedItems.map((emp) => (
              <TableRow key={emp.id} className="hover:bg-muted/20 transition-colors group">
                {!isEmployee && (
                  <TableCell className="w-10 pl-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(emp.id)}
                      onChange={(e) => { e.stopPropagation(); toggleOne(emp.id); }}
                      className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                    />
                  </TableCell>
                )}
                <TableCell className="cursor-pointer" onClick={() => onSelect(emp)}>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-secondary-foreground">{emp.firstName[0]}{emp.lastName[0]}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-tight">{emp.firstName} {emp.lastName}</p>
                      <p className="text-xs text-muted-foreground">{emp.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm font-mono text-muted-foreground">{emp.empId}</TableCell>
                <TableCell className="text-sm">{emp.department}</TableCell>
                <TableCell className="text-sm">{emp.designation}</TableCell>
                <TableCell className="text-sm">
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {roleMap.get(emp.roleId ?? "") || "—"}
                  </span>
                </TableCell>
                {!isEmployee && (
                  <TableCell className="text-sm hidden lg:table-cell">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-info" />
                      <span>{emp.workLocationCountry}</span>
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={emp.status} />
                    {inviteStatusMap.has(emp.empId) && inviteStatusMap.get(emp.empId) ? (
                      <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-50 text-emerald-700 border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" /> Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                        Unverified
                      </Badge>
                    )}
                  </div>
                </TableCell>
                {!isEmployee && (
                  <TableCell className="text-right pr-4">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onSelect(emp); }} title="View profile">
                        <User className="h-3.5 w-3.5" />
                      </Button>
                      {onEdit && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onEdit(emp); }} title="Edit employee">
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {!(inviteStatusMap.has(emp.empId) && inviteStatusMap.get(emp.empId)) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); handleResendInvite(emp); }}
                          title="Resend invite email"
                          disabled={resendingId === emp.id}
                        >
                          {resendingId === emp.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(emp); }}
                        title="Delete employee"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">No employees match your filters.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete employee?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.firstName} {deleteTarget?.lastName}</strong> ({deleteTarget?.empId}) and all their associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleConfirmDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filtered.length)}-{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}</span> of <span className="font-semibold text-foreground">{filtered.length}</span> employees
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {renderPageNumbers().map((page, idx) => (
              typeof page === "number" ? (
                <Button
                  key={idx}
                  variant={currentPage === page ? "default" : "ghost"}
                  size="icon"
                  className={cn("h-8 w-8 text-xs", currentPage === page && "gradient-ey text-primary-foreground")}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ) : (
                <span key={idx} className="px-1 text-xs text-muted-foreground">…</span>
              )
            ))}
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
              <span className="sr-only">Next</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function PersonalInfoTab({ emp, readOnly = false }: { emp: Employee; readOnly?: boolean }) {
  const { data: profile, isLoading } = useEmployeeProfile(emp.id);
  const updateProfile = useUpdateEmployeeProfile();
  const [editing, setEditing] = useState<string | null>(null);
  const { toast } = useToast();
  const { addLogs } = useAudit();
  const empName = `${emp.firstName} ${emp.lastName}`;

  // Local edit buffers, hydrated from DB
  const [bio, setBio] = useState({
    firstName: "", lastName: "", dateOfBirth: "",
    gender: "", maritalStatus: "", religion: "", nationality: "",
  });
  const [bank, setBank] = useState({
    bankName: "", bankCountry: "", swiftCode: "",
    bankAddress: "", iban: "", bankCurrency: "", beneficiaryName: "",
  });
  const [address, setAddress] = useState({
    addressLine1: "", addressLine2: "", city: "", state: "", country: "", postalCode: "",
  });
  const [contact, setContact] = useState({
    personalPhone: "", personalEmail: "",
    emergencyName: "", emergencyRelation: "", emergencyPhone: "", emergencyEmail: "",
  });
  const [education, setEducation] = useState<{ id?: string; degree: string; institution: string; year: string; field: string }[]>([]);
  const [dependants, setDependants] = useState<{ name: string; relation: string; dateOfBirth: string }[]>([]);

  // Hydrate local state from DB once loaded
  useMemo(() => {
    if (!profile) return;
    const e = profile.employee;
    if (e) {
      setBio({
        firstName: e.first_name ?? "", lastName: e.last_name ?? "",
        dateOfBirth: e.date_of_birth ?? "",
        gender: e.gender ?? "", maritalStatus: e.marital_status ?? "",
        religion: e.religion ?? "", nationality: e.nationality ?? "",
      });
      setContact((c) => ({
        ...c,
        personalPhone: e.personal_phone ?? e.phone ?? "",
        personalEmail: e.personal_email ?? "",
      }));
    }
    if (profile.address) {
      setAddress({
        addressLine1: profile.address.address_line1 ?? "", addressLine2: profile.address.address_line2 ?? "",
        city: profile.address.city ?? "", state: profile.address.state ?? "",
        country: profile.address.country ?? "", postalCode: profile.address.postal_code ?? "",
      });
    }
    if (profile.bank) {
      setBank({
        bankName: profile.bank.bank_name ?? "", bankCountry: profile.bank.bank_country ?? "",
        swiftCode: profile.bank.swift_code ?? "", bankAddress: profile.bank.bank_address ?? "",
        iban: profile.bank.iban ?? "", bankCurrency: profile.bank.bank_currency ?? "",
        beneficiaryName: profile.bank.beneficiary_name ?? "",
      });
    }
    if (profile.emergency) {
      setContact((c) => ({
        ...c,
        emergencyName: profile.emergency!.name ?? "", emergencyRelation: profile.emergency!.relation ?? "",
        emergencyPhone: profile.emergency!.phone ?? "", emergencyEmail: profile.emergency!.email ?? "",
      }));
    }
    setEducation(
      (profile.education ?? []).map((ed: any) => ({
        id: ed.id,
        degree: ed.degree ?? "",
        institution: ed.institution ?? "",
        year: ed.start_year ? String(ed.start_year) : "",
        field: ed.field_of_study ?? "",
      }))
    );
  }, [profile]);

  const saveSection = async (section: string) => {
    try {
      if (section === "bio") {
        await updateProfile.mutateAsync({
          employeeId: emp.id,
          bio: {
            first_name: bio.firstName, last_name: bio.lastName,
            date_of_birth: bio.dateOfBirth || null,
            gender: bio.gender || null, marital_status: bio.maritalStatus || null,
            religion: bio.religion || null, nationality: bio.nationality || null,
          },
        });
        addLogs([{ employeeId: emp.id, employeeName: empName, section: "Personal > Basic Information", field: "bio", oldValue: "", newValue: "(updated)" }]);
      } else if (section === "contact") {
        await updateProfile.mutateAsync({
          employeeId: emp.id,
          contact: { personal_phone: contact.personalPhone, personal_email: contact.personalEmail },
          emergency: {
            name: contact.emergencyName, relation: contact.emergencyRelation,
            phone: contact.emergencyPhone, email: contact.emergencyEmail,
          },
        });
        addLogs([{ employeeId: emp.id, employeeName: empName, section: "Personal > Contact & Emergency", field: "contact", oldValue: "", newValue: "(updated)" }]);
      } else if (section === "address") {
        await updateProfile.mutateAsync({
          employeeId: emp.id,
          address: {
            address_line1: address.addressLine1, address_line2: address.addressLine2,
            city: address.city, state: address.state, country: address.country, postal_code: address.postalCode,
          },
        });
        addLogs([{ employeeId: emp.id, employeeName: empName, section: "Personal > Residential Address", field: "address", oldValue: "", newValue: "(updated)" }]);
      } else if (section === "bank") {
        await updateProfile.mutateAsync({
          employeeId: emp.id,
          bank: {
            bank_name: bank.bankName, bank_country: bank.bankCountry, swift_code: bank.swiftCode,
            bank_address: bank.bankAddress, iban: bank.iban, bank_currency: bank.bankCurrency,
            beneficiary_name: bank.beneficiaryName,
          },
        });
        addLogs([{ employeeId: emp.id, employeeName: empName, section: "Personal > Bank Details", field: "bank", oldValue: "", newValue: "(updated)" }]);
      } else if (section === "education") {
        await updateProfile.mutateAsync({
          employeeId: emp.id,
          education: education.map((e) => ({
            id: e.id,
            institution: e.institution, degree: e.degree, field_of_study: e.field,
            start_year: e.year ? Number(e.year) : null,
          })),
        });
        addLogs([{ employeeId: emp.id, employeeName: empName, section: "Personal > Education", field: "education", oldValue: "", newValue: `${education.length} record(s)` }]);
      } else if (section === "dependants") {
        // Dependants table doesn't exist yet — keep local-only with a note.
        toast({ title: "Saved locally", description: "Dependants tracking coming soon." });
        addLogs([{ employeeId: emp.id, employeeName: empName, section: "Personal > Dependants", field: "dependants", oldValue: "", newValue: `${dependants.length} record(s)` }]);
      }
      setEditing(null);
    } catch {
      // toast already shown by hook
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground p-8 text-center">Loading profile…</div>;
  }

  return (
    <div className="space-y-4">
      {/* Bio */}
      <SectionCard title="Basic Information" icon={User} editing={editing === "bio"} onEdit={readOnly ? undefined : () => setEditing("bio")} onSave={() => saveSection("bio")} onCancel={() => setEditing(null)}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <EditableField label="First Name" value={bio.firstName} editing={editing === "bio"} onChange={v => setBio({ ...bio, firstName: v })} />
          <EditableField label="Last Name" value={bio.lastName} editing={editing === "bio"} onChange={v => setBio({ ...bio, lastName: v })} />
          <EditableField label="Date of Birth" value={bio.dateOfBirth} editing={editing === "bio"} onChange={v => setBio({ ...bio, dateOfBirth: v })} type="date" />
          <EditableField label="Gender" value={bio.gender} editing={editing === "bio"} onChange={v => setBio({ ...bio, gender: v })} />
          <EditableField label="Marital Status" value={bio.maritalStatus} editing={editing === "bio"} onChange={v => setBio({ ...bio, maritalStatus: v })} />
          <EditableField label="Religion" value={bio.religion} editing={editing === "bio"} onChange={v => setBio({ ...bio, religion: v })} />
          <EditableField label="Nationality" value={bio.nationality} editing={editing === "bio"} onChange={v => setBio({ ...bio, nationality: v })} />
          <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={emp.status} /></div>
        </div>
      </SectionCard>

      {/* Contact & Emergency */}
      <SectionCard title="Contact & Emergency" icon={Phone} editing={editing === "contact"} onEdit={readOnly ? undefined : () => setEditing("contact")} onSave={() => saveSection("contact")} onCancel={() => setEditing(null)}>
        <div className="space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Personal Contact</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EditableField label="Personal Phone" value={contact.personalPhone} editing={editing === "contact"} onChange={v => setContact({ ...contact, personalPhone: v })} />
            <EditableField label="Personal Email" value={contact.personalEmail} editing={editing === "contact"} onChange={v => setContact({ ...contact, personalEmail: v })} />
          </div>
          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Emergency Contact</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EditableField label="Name" value={contact.emergencyName} editing={editing === "contact"} onChange={v => setContact({ ...contact, emergencyName: v })} />
              <EditableField label="Relationship" value={contact.emergencyRelation} editing={editing === "contact"} onChange={v => setContact({ ...contact, emergencyRelation: v })} />
              <EditableField label="Phone" value={contact.emergencyPhone} editing={editing === "contact"} onChange={v => setContact({ ...contact, emergencyPhone: v })} />
              <EditableField label="Email" value={contact.emergencyEmail} editing={editing === "contact"} onChange={v => setContact({ ...contact, emergencyEmail: v })} />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Residential Address */}
      <SectionCard title="Residential Address" icon={MapPin} editing={editing === "address"} onEdit={readOnly ? undefined : () => setEditing("address")} onSave={() => saveSection("address")} onCancel={() => setEditing(null)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EditableField label="Address Line 1" value={address.addressLine1} editing={editing === "address"} onChange={v => setAddress({ ...address, addressLine1: v })} />
          <EditableField label="Address Line 2" value={address.addressLine2} editing={editing === "address"} onChange={v => setAddress({ ...address, addressLine2: v })} />
          <EditableField label="City" value={address.city} editing={editing === "address"} onChange={v => setAddress({ ...address, city: v })} />
          <EditableField label="State / Province" value={address.state} editing={editing === "address"} onChange={v => setAddress({ ...address, state: v })} />
          <EditableField label="Country" value={address.country} editing={editing === "address"} onChange={v => setAddress({ ...address, country: v })} />
          <EditableField label="Postal Code" value={address.postalCode} editing={editing === "address"} onChange={v => setAddress({ ...address, postalCode: v })} />
        </div>
      </SectionCard>

      {/* Bank Details */}
      <SectionCard title="Bank Account Details" icon={CreditCard} editing={editing === "bank"} onEdit={readOnly ? undefined : () => setEditing("bank")} onSave={() => saveSection("bank")} onCancel={() => setEditing(null)}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <EditableField label="Bank Name" value={bank.bankName} editing={editing === "bank"} onChange={v => setBank({ ...bank, bankName: v })} />
          <EditableField label="Bank Country" value={bank.bankCountry} editing={editing === "bank"} onChange={v => setBank({ ...bank, bankCountry: v })} />
          <EditableField label="SWIFT Code" value={bank.swiftCode} editing={editing === "bank"} onChange={v => setBank({ ...bank, swiftCode: v })} />
          <EditableField label="Bank Address" value={bank.bankAddress} editing={editing === "bank"} onChange={v => setBank({ ...bank, bankAddress: v })} />
          <EditableField label="IBAN" value={bank.iban} editing={editing === "bank"} onChange={v => setBank({ ...bank, iban: v })} />
          <EditableField label="Currency" value={bank.bankCurrency} editing={editing === "bank"} onChange={v => setBank({ ...bank, bankCurrency: v })} />
          <EditableField label="Beneficiary Name" value={bank.beneficiaryName} editing={editing === "bank"} onChange={v => setBank({ ...bank, beneficiaryName: v })} />
        </div>
      </SectionCard>

      {/* Education */}
      <SectionCard title="Education" icon={GraduationCap} editing={editing === "education"} onEdit={readOnly ? undefined : () => setEditing("education")} onSave={() => saveSection("education")} onCancel={() => setEditing(null)}>
        {education.length > 0 ? (
          <div className="space-y-4">
            {education.map((edu, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-3 border-b last:border-0 relative">
                <EditableField label="Degree" value={edu.degree} editing={editing === "education"} onChange={v => { const u = [...education]; u[i] = { ...u[i], degree: v }; setEducation(u); }} />
                <EditableField label="Field of Study" value={edu.field} editing={editing === "education"} onChange={v => { const u = [...education]; u[i] = { ...u[i], field: v }; setEducation(u); }} />
                <EditableField label="Institution" value={edu.institution} editing={editing === "education"} onChange={v => { const u = [...education]; u[i] = { ...u[i], institution: v }; setEducation(u); }} />
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <EditableField label="Year" value={edu.year} editing={editing === "education"} onChange={v => { const u = [...education]; u[i] = { ...u[i], year: v }; setEducation(u); }} />
                  </div>
                  {editing === "education" && (
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => setEducation(education.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {editing === "education" && (
              <Button size="sm" variant="outline" onClick={() => setEducation([...education, { degree: "", institution: "", year: "", field: "" }])}>
                <Plus className="h-4 w-4 mr-1" />Add Education
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">No education records.</p>
            {editing === "education" && (
              <Button size="sm" variant="outline" className="mt-2" onClick={() => setEducation([{ degree: "", institution: "", year: "", field: "" }])}>
                <Plus className="h-4 w-4 mr-1" />Add Education
              </Button>
            )}
          </div>
        )}
      </SectionCard>

      {/* Dependants */}
      <SectionCard title="Dependants" icon={Heart} editing={editing === "dependants"} onEdit={readOnly ? undefined : () => setEditing("dependants")} onSave={() => saveSection("dependants")} onCancel={() => setEditing(null)}>
        {dependants.length > 0 ? (
          <div className="space-y-4">
            {dependants.map((dep, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-3 border-b last:border-0">
                <EditableField label="Name" value={dep.name} editing={editing === "dependants"} onChange={v => { const u = [...dependants]; u[i] = { ...u[i], name: v }; setDependants(u); }} />
                <EditableField label="Relationship" value={dep.relation} editing={editing === "dependants"} onChange={v => { const u = [...dependants]; u[i] = { ...u[i], relation: v }; setDependants(u); }} />
                <EditableField label="Date of Birth" value={dep.dateOfBirth} editing={editing === "dependants"} onChange={v => { const u = [...dependants]; u[i] = { ...u[i], dateOfBirth: v }; setDependants(u); }} type="date" />
              </div>
            ))}
            {editing === "dependants" && (
              <Button size="sm" variant="outline" onClick={() => setDependants([...dependants, { name: "", relation: "", dateOfBirth: "" }])}>
                <Plus className="h-4 w-4 mr-1" />Add Dependant
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">No dependants recorded.</p>
            {editing === "dependants" && (
              <Button size="sm" variant="outline" className="mt-2" onClick={() => setDependants([{ name: "", relation: "", dateOfBirth: "" }])}>
                <Plus className="h-4 w-4 mr-1" />Add Dependant
              </Button>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function WorkInfoTab({ emp, readOnly = false }: { emp: Employee; readOnly?: boolean }) {
  const ext = getExtData(emp.id);
  const [editing, setEditing] = useState(false);
  const { toast } = useToast();
  const { addLogs } = useAudit();
  const { getManagerId, getManagerName, setReportTo } = useReporting();
  const { employees: allEmployees, updateEmployee } = useEmployees();
  const { activeTypes, getTypeName } = useEmployeeTypes();
  const activeEmps = allEmployees.filter(e => e.status !== "separated" && e.id !== emp.id);
  const empName = `${emp.firstName} ${emp.lastName}`;

  const currentManagerName = getManagerName(emp.id) || ext.reportsTo || "—";
  const currentManagerId = getManagerId(emp.id) || "";

  const [data, setData] = useState({
    department: emp.department, designation: emp.designation, joiningDate: emp.joiningDate,
    reportsToId: currentManagerId, workEmail: ext.workEmail, empId: emp.empId,
    workLocationCity: ext.workLocationCity, workLocationCountry: ext.workLocationCountry, division: ext.division,
    category: emp.category,
  });
  const [prevData, setPrevData] = useState({ ...data });

  const handleSave = () => {
    const changes: Omit<import("@/contexts/AuditContext").AuditLogEntry, "id" | "changedAt" | "changedBy">[] = [];
    for (const key of Object.keys(data) as (keyof typeof data)[]) {
      if (String(prevData[key] || "") !== String(data[key] || "")) {
        changes.push({ employeeId: emp.id, employeeName: empName, section: "Work Information", field: key, oldValue: String(prevData[key] || ""), newValue: String(data[key] || "") });
      }
    }
    if (changes.length > 0) addLogs(changes);
    setPrevData({ ...data });

    if (data.reportsToId === "__none__") {
      setReportTo(emp.id, null);
    } else if (data.reportsToId) {
      setReportTo(emp.id, data.reportsToId);
    }
    // Persist category change
    if (data.category !== emp.category) {
      updateEmployee(emp.id, { category: data.category });
    }
    setEditing(false);
    toast({ title: "Saved", description: "Work info updated." });
  };

  // Keep local state in sync with context
  const latestManagerId = getManagerId(emp.id) || "";
  if (!editing && data.reportsToId !== latestManagerId) {
    setData(prev => ({ ...prev, reportsToId: latestManagerId }));
  }

  const reportsToDisplay = getManagerName(emp.id) || "No Manager";

  return (
    <SectionCard title="Work Information" icon={Briefcase} editing={editing} onEdit={readOnly ? undefined : () => setEditing(true)} onSave={handleSave} onCancel={() => { setEditing(false); setData(prev => ({ ...prev, reportsToId: latestManagerId })); }}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <EditableField label="Employee ID" value={data.empId} editing={editing} onChange={v => setData({ ...data, empId: v })} />
        <EditableField label="Work Email" value={data.workEmail} editing={editing} onChange={v => setData({ ...data, workEmail: v })} />
        <div>
          <p className="text-xs text-muted-foreground">Employee Type</p>
          {editing ? (
            <Select value={data.category} onValueChange={v => setData({ ...data, category: v })}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select type..." /></SelectTrigger>
              <SelectContent>
                {activeTypes.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm font-medium">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                {getTypeName(emp.category)}
              </span>
            </p>
          )}
        </div>
        <EditableField label="Department" value={data.department} editing={editing} onChange={v => setData({ ...data, department: v })} />
        <EditableField label="Designation" value={data.designation} editing={editing} onChange={v => setData({ ...data, designation: v })} />
        <EditableField label="Division" value={data.division} editing={editing} onChange={v => setData({ ...data, division: v })} />
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Reports To</p>
          {editing ? (
            <Select value={data.reportsToId || "__none__"} onValueChange={v => setData({ ...data, reportsToId: v })}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select manager..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No Manager (Top Level)</SelectItem>
                {activeEmps.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} — {e.designation}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm font-medium">{reportsToDisplay}</p>
          )}
        </div>
        <EditableField label="Joining Date" value={data.joiningDate} editing={editing} onChange={v => setData({ ...data, joiningDate: v })} type="date" />
        <div>
          <p className="text-xs text-muted-foreground">Tenure</p>
          <p className="text-sm font-medium">{Math.floor((Date.now() - new Date(emp.joiningDate).getTime()) / (1000 * 60 * 60 * 24 * 365))} years</p>
        </div>
        <EditableField label="Work Location City" value={data.workLocationCity} editing={editing} onChange={v => setData({ ...data, workLocationCity: v })} />
        <EditableField label="Work Location Country" value={data.workLocationCountry} editing={editing} onChange={v => setData({ ...data, workLocationCountry: v })} />
      </div>
    </SectionCard>
  );
}

function CompensationTab({ emp, onUpdatePayCurrency, readOnly = false }: { emp: Employee; onUpdatePayCurrency?: (empId: string, currency: string) => void; readOnly?: boolean }) {
  const { setups } = usePayrollSetups();
  const { updateEmployee } = useEmployees();
  const { addLog } = useAudit();
  const empName = `${emp.firstName} ${emp.lastName}`;
  const { toast } = useToast();

  const selectedSetup = useMemo(() => setups.find(s => s.id === emp.payrollSetupId), [setups, emp.payrollSetupId]);
  const activeSetups = useMemo(() => setups, [setups]);

  const [editing, setEditing] = useState(false);
  const [salary, setSalary] = useState<number>(emp.salary || 0);
  const [payrollSetupId, setPayrollSetupId] = useState<string>(emp.payrollSetupId || "");

  const currency = selectedSetup?.currency || emp.payCurrency || "SAR";

  // Per-component overrides (mirrors AddEmployeeWizard breakdown logic)
  type CompOverride = { mode: "percent" | "value"; percent: number; value: number };
  const [overrides, setOverrides] = useState<Record<string, CompOverride>>({});
  const isBasicComp = (c: any) => c.id === "comp-basic-salary" || c.name === "Basic Salary";
  const getEffective = (comp: any, baseSalary: number): { percent: number; value: number } => {
    const o = overrides[comp.id];
    if (o) {
      if (o.mode === "percent") return { percent: o.percent, value: Math.round(baseSalary * o.percent / 100) };
      return { percent: baseSalary > 0 ? Number((o.value / baseSalary * 100).toFixed(2)) : 0, value: o.value };
    }
    if (comp.calculationType === "percentage") {
      return { percent: comp.value, value: Math.round(baseSalary * comp.value / 100) };
    }
    return { percent: baseSalary > 0 ? Number((comp.value / baseSalary * 100).toFixed(2)) : 0, value: comp.value };
  };
  const setOverridePercent = (compId: string, percent: number, baseSalary: number) =>
    setOverrides(prev => ({ ...prev, [compId]: { mode: "percent", percent, value: Math.round(baseSalary * percent / 100) } }));
  const setOverrideValue = (compId: string, value: number, baseSalary: number) =>
    setOverrides(prev => ({ ...prev, [compId]: { mode: "value", percent: baseSalary > 0 ? Number((value / baseSalary * 100).toFixed(2)) : 0, value } }));

  const baseForBreakdown = editing ? salary : (emp.salary || 0);
  const salaryBreakdown = useMemo(() => {
    if (!selectedSetup || !baseForBreakdown || Number(baseForBreakdown) <= 0) return null;
    const baseSalary = Number(baseForBreakdown);
    const additions = (selectedSetup.payslipComponents ?? [])
      .filter((c: any) => c.type === "earning" && c.status === "active" && !isBasicComp(c))
      .map((comp: any) => {
        const { percent, value } = getEffective(comp, baseSalary);
        return { id: comp.id, name: comp.name, calculationType: comp.calculationType, percentage: percent, amount: value };
      });
    const deductions = (selectedSetup.payslipComponents ?? [])
      .filter((c: any) => c.type === "deduction" && c.status === "active")
      .map((comp: any) => {
        const { percent, value } = getEffective(comp, baseSalary);
        return { id: comp.id, name: comp.name, calculationType: comp.calculationType, percentage: percent, amount: value };
      });
    const totalAdditions = additions.reduce((s, c) => s + c.amount, 0);
    const totalDeductions = deductions.reduce((s, c) => s + c.amount, 0);
    const grossBeforeTax = baseSalary + totalAdditions;
    const taxBaseMonthly = (selectedSetup as any).taxBasis === "basic" ? baseSalary : grossBeforeTax;
    const taxAmount = calcMonthlyTax(selectedSetup as any, taxBaseMonthly);
    return {
      baseSalary, additions, deductions,
      totalAdditions, totalDeductions, taxAmount,
      grossTotal: grossBeforeTax,
      netSalary: grossBeforeTax - totalDeductions - taxAmount,
    };
  }, [selectedSetup, baseForBreakdown, overrides]);


  return (
    <div className="space-y-4">
      <SectionCard
        title="Compensation Information"
        icon={DollarSign}
        editing={editing}
        onEdit={readOnly ? undefined : () => { setSalary(emp.salary || 0); setPayrollSetupId(emp.payrollSetupId || ""); setEditing(true); }}
        onSave={() => {
          const changes: Array<{ field: string; oldValue: string; newValue: string }> = [];
          if (salary !== emp.salary) changes.push({ field: "Base Salary", oldValue: String(emp.salary), newValue: String(salary) });
          if (payrollSetupId !== (emp.payrollSetupId || "")) changes.push({ field: "Payroll Setup", oldValue: emp.payrollSetupId || "", newValue: payrollSetupId });
          updateEmployee(emp.id, { salary, payrollSetupId: payrollSetupId || undefined });
          changes.forEach(c => addLog({ employeeId: emp.id, employeeName: empName, section: "Compensation", ...c }));
          setEditing(false);
          toast({ title: "Saved", description: "Compensation updated." });
        }}
        onCancel={() => setEditing(false)}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Base Salary</p>
            {editing ? (
              <Input type="number" value={salary} onChange={e => setSalary(Number(e.target.value))} className="h-8 text-sm" />
            ) : (
              <p className="text-sm font-medium">{(emp.salary || 0).toLocaleString()} {currency}</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Payroll Setup</p>
            {editing ? (
              <Select value={payrollSetupId} onValueChange={setPayrollSetupId}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select payroll setup" /></SelectTrigger>
                <SelectContent>{activeSetups.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.country})</SelectItem>)}</SelectContent>
              </Select>
            ) : (
              <p className="text-sm font-medium">{selectedSetup ? `${selectedSetup.name} (${selectedSetup.country})` : "—"}</p>
            )}
          </div>
        </div>
      </SectionCard>

      {selectedSetup && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />{selectedSetup.name} — Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Country</p>
                <p className="text-sm font-medium">{selectedSetup.country}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Currency</p>
                <p className="text-sm font-medium">{selectedSetup.currency}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Pay Frequency</p>
                <p className="text-sm font-medium capitalize">{selectedSetup.paySchedule?.payFrequency}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Pay Date</p>
                <p className="text-sm font-medium">{selectedSetup.paySchedule?.payDate}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Overtime</p>
                <p className="text-sm font-medium">{selectedSetup.overtime?.enabled ? `${selectedSetup.overtime.rateMultiplier}x` : "Disabled"}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Tax</p>
                <p className="text-sm font-medium">{selectedSetup.options?.enableTaxCalculation ? "Enabled" : "Disabled"}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Salary Type</p>
                <p className="text-sm font-medium capitalize">{selectedSetup.salaryRules?.salaryType}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Proration</p>
                <p className="text-sm font-medium capitalize">{selectedSetup.salaryRules?.prorationRule?.replace("-", " ")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedSetup && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />Salary Breakdown
              {baseForBreakdown > 0 && <Badge variant="outline" className="ml-2 text-xs">Live</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {salaryBreakdown ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">Basic Salary</span>
                    <Badge variant="outline" className="text-[10px] h-5">Base</Badge>
                  </div>
                  <span className="text-sm font-semibold">{salaryBreakdown.baseSalary.toLocaleString()} {selectedSetup.currency}</span>
                </div>
                {salaryBreakdown.additions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Earnings</p>
                    <div className="bg-muted/30 rounded-lg overflow-hidden">
                      {salaryBreakdown.additions.map((item) => (
                        <div key={item.id} className="grid grid-cols-12 items-center gap-2 px-4 py-2.5 border-b border-border/50 last:border-0">
                          <span className="text-sm col-span-4 truncate">{item.name}</span>
                          <div className="col-span-3 flex items-center gap-1">
                            <Input type="number" className="h-7 text-xs" value={item.percentage || 0} disabled={!editing}
                              onChange={e => setOverridePercent(item.id, Number(e.target.value), salaryBreakdown.baseSalary)} />
                            <span className="text-xs text-muted-foreground">%</span>
                          </div>
                          <div className="col-span-4">
                            <Input type="number" className="h-7 text-xs" value={item.amount} disabled={!editing}
                              onChange={e => setOverrideValue(item.id, Number(e.target.value), salaryBreakdown.baseSalary)} />
                          </div>
                          <span className="text-xs font-semibold text-emerald-600 col-span-1 text-right">{selectedSetup.currency}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-500/10 font-semibold">
                        <span className="text-sm">Total Earnings</span>
                        <span className="text-sm text-emerald-600">+{salaryBreakdown.totalAdditions.toLocaleString()} {selectedSetup.currency}</span>
                      </div>
                    </div>
                  </div>
                )}
                {salaryBreakdown.deductions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Deductions</p>
                    <div className="bg-muted/30 rounded-lg overflow-hidden">
                      {salaryBreakdown.deductions.map((item) => (
                        <div key={item.id} className="grid grid-cols-12 items-center gap-2 px-4 py-2.5 border-b border-border/50 last:border-0">
                          <span className="text-sm col-span-4 truncate">{item.name}</span>
                          <div className="col-span-3 flex items-center gap-1">
                            <Input type="number" className="h-7 text-xs" value={item.percentage || 0} disabled={!editing}
                              onChange={e => setOverridePercent(item.id, Number(e.target.value), salaryBreakdown.baseSalary)} />
                            <span className="text-xs text-muted-foreground">%</span>
                          </div>
                          <div className="col-span-4">
                            <Input type="number" className="h-7 text-xs" value={item.amount} disabled={!editing}
                              onChange={e => setOverrideValue(item.id, Number(e.target.value), salaryBreakdown.baseSalary)} />
                          </div>
                          <span className="text-xs font-semibold text-destructive col-span-1 text-right">{selectedSetup.currency}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between px-4 py-2.5 bg-destructive/10 font-semibold">
                        <span className="text-sm">Total Deductions</span>
                        <span className="text-sm text-destructive">-{salaryBreakdown.totalDeductions.toLocaleString()} {selectedSetup.currency}</span>
                      </div>
                    </div>
                  </div>
                )}
                {salaryBreakdown.taxAmount > 0 && (
                  <div className="bg-muted/30 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm">Tax Deduction</span>
                      <span className="text-sm font-semibold text-destructive">-{salaryBreakdown.taxAmount.toLocaleString()} {selectedSetup.currency}</span>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3 font-semibold">
                  <span className="text-sm">Gross Salary</span>
                  <span className="text-sm">{salaryBreakdown.grossTotal.toLocaleString()} {selectedSetup.currency}</span>
                </div>
                <div className="flex items-center justify-between bg-primary/10 rounded-lg px-4 py-3.5 font-bold">
                  <span className="text-base">Net Salary</span>
                  <span className="text-base text-primary">{salaryBreakdown.netSalary.toLocaleString()} {selectedSetup.currency}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calculator className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Set a base salary to see the breakdown</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>

  );
}


function TimeOffTab({ emp, readOnly = false }: { emp: Employee; readOnly?: boolean }) {
  const { data: empLeavesDb = [] } = useQuery({
    queryKey: ["employee-leave-requests", emp.id],
    enabled: !!emp.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("id, start_date, end_date, days, status, leave_types(name)")
        .eq("employee_id", emp.id)
        .order("start_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
  // Normalize DB rows to the shape the existing UI expects
  const empLeaves = useMemo(
    () =>
      empLeavesDb.map((l: any) => ({
        id: l.id,
        startDate: l.start_date,
        endDate: l.end_date,
        days: l.days,
        status: l.status,
        type: l.leave_types?.name ?? "—",
      })),
    [empLeavesDb]
  );
  const { leaveTypes, getAllocationsForEmployee, setAllocation } = useLeaveTypes();
  const allocations = getAllocationsForEmployee(emp.id);
  const [editing, setEditing] = useState(false);
  const [localAllocs, setLocalAllocs] = useState<Record<string, number>>({});
  const { toast } = useToast();

  const activeTypes = leaveTypes.filter(lt => lt.isActive);

  const getAllocated = (ltId: string) => {
    if (editing && localAllocs[ltId] !== undefined) return localAllocs[ltId];
    const alloc = allocations.find(a => a.leaveTypeId === ltId);
    return alloc ? alloc.allocatedDays : leaveTypes.find(lt => lt.id === ltId)?.defaultDays || 0;
  };

  const getUsed = (ltName: string) => {
    return empLeaves.filter(l => l.status === "approved" && l.type.toLowerCase() === ltName.toLowerCase()).reduce((s, l) => s + l.days, 0);
  };

  const startEditing = () => {
    const allocs: Record<string, number> = {};
    activeTypes.forEach(lt => { allocs[lt.id] = getAllocated(lt.id); });
    setLocalAllocs(allocs);
    setEditing(true);
  };

  const saveEditing = () => {
    Object.entries(localAllocs).forEach(([ltId, days]) => setAllocation(emp.id, ltId, days));
    setEditing(false);
    toast({ title: "Saved", description: "Leave allocations updated." });
  };

  const totalAllocated = activeTypes.reduce((s, lt) => s + getAllocated(lt.id), 0);
  const totalUsed = empLeaves.filter(l => l.status === "approved").reduce((s, l) => s + l.days, 0);

  return (
    <SectionCard title="Time Off & Vacation" icon={Calendar} editing={editing} onEdit={readOnly ? undefined : startEditing} onSave={saveEditing} onCancel={() => setEditing(false)}>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">Total Entitlement</p>
          <p className="text-xl font-bold">{totalAllocated}</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">Total Used</p>
          <p className="text-xl font-bold">{totalUsed}</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">Total Remaining</p>
          <p className="text-xl font-bold text-primary">{totalAllocated - totalUsed}</p>
        </div>
      </div>

      {/* Per leave type breakdown */}
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Leave Type</TableHead>
            <TableHead className="text-center">Allocated</TableHead>
            <TableHead className="text-center">Used</TableHead>
            <TableHead className="text-center">Remaining</TableHead>
            <TableHead className="text-center">Paid</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activeTypes.map(lt => {
            const allocated = getAllocated(lt.id);
            const used = getUsed(lt.name);
            return (
              <TableRow key={lt.id}>
                <TableCell className="text-sm font-medium">{lt.name}</TableCell>
                <TableCell className="text-center">
                  {editing ? (
                    <Input type="number" min={0} value={localAllocs[lt.id] ?? allocated} onChange={e => setLocalAllocs({ ...localAllocs, [lt.id]: Number(e.target.value) })} className="h-8 w-20 text-center mx-auto" />
                  ) : (
                    <span className="text-sm">{allocated}</span>
                  )}
                </TableCell>
                <TableCell className="text-center text-sm">{used}</TableCell>
                <TableCell className="text-center text-sm font-semibold text-primary">{allocated - used}</TableCell>
                <TableCell className="text-center text-sm">{lt.isPaid ? "Yes" : "No"}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Leave history */}
      {empLeaves.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Leave History</p>
          <Table>
            <TableHeader><TableRow className="bg-muted/50">
              <TableHead>Type</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Days</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {empLeaves.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-sm capitalize">{l.type}</TableCell>
                  <TableCell className="text-sm">{l.startDate}</TableCell>
                  <TableCell className="text-sm">{l.endDate}</TableCell>
                  <TableCell className="text-sm">{l.days}</TableCell>
                  <TableCell><StatusBadge status={l.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </SectionCard>
  );
}

function DocumentsTab({ emp, onUpload, documents, onReupload }: { emp: Employee; onUpload: () => void; documents: EmployeeDoc[]; onReupload: (doc: EmployeeDoc) => void }) {
  const { reminderDays } = useReminderSettings();
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);

  const docsWithStatus = useMemo(() => documents.map(doc => ({
    ...doc,
    expiryStatus: getDocExpiryStatus(doc.expiryDate, reminderDays),
  })), [documents, reminderDays]);

  const expiredCount = docsWithStatus.filter(d => d.expiryStatus === "expired").length;
  const expiringCount = docsWithStatus.filter(d => d.expiryStatus === "expiring-soon").length;

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      {(expiredCount > 0 || expiringCount > 0) && (
        <div className="flex gap-2">
          {expiredCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-destructive/15 text-destructive">
              <Bell className="h-3 w-3" />{expiredCount} expired
            </span>
          )}
          {expiringCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-warning/15 text-warning">
              <Bell className="h-3 w-3" />{expiringCount} expiring soon
            </span>
          )}
        </div>
      )}

      {/* Document list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />Documents</CardTitle>
          <Button size="sm" variant="outline" onClick={onUpload}><Upload className="h-4 w-4 mr-2" />Upload</Button>
        </CardHeader>
        <CardContent>
          {docsWithStatus.length > 0 ? (
            <div className="space-y-1">
              {docsWithStatus.map((doc) => (
                <div key={doc.id}>
                  <div className={cn(
                    "flex items-center justify-between py-3 px-3 rounded-lg transition-colors",
                    doc.expiryStatus === "expired" && "bg-destructive/5",
                  )}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0"><FileText className="h-4 w-4 text-muted-foreground" /></div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{doc.name}</p>
                          {doc.version > 1 && <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">v{doc.version}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {doc.type} · {doc.uploadedDate}
                          {doc.expiryDate ? ` · Exp: ${doc.expiryDate}` : " · No Expiry"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={doc.expiryStatus} />
                      <Button variant="ghost" size="sm" onClick={() => onReupload(doc)} className="text-xs">
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />Re-upload
                      </Button>
                      {doc.previousVersions.length > 0 && (
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => setExpandedHistory(expandedHistory === doc.id ? null : doc.id)}>
                          <History className="h-3.5 w-3.5 mr-1" />History
                        </Button>
                      )}
                      <Button variant="ghost" size="sm">View</Button>
                    </div>
                  </div>
                  {/* Version history */}
                  {expandedHistory === doc.id && doc.previousVersions.length > 0 && (
                    <div className="ml-12 mb-2 border-l-2 border-muted pl-4 space-y-2 py-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Version History</p>
                      {doc.previousVersions.map((pv, i) => (
                        <div key={i} className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>v{doc.version - 1 - i} — {pv.name} · {pv.uploadedDate}{pv.expiryDate ? ` · Exp: ${pv.expiryDate}` : ""}</span>
                          <Button variant="ghost" size="sm" className="h-6 text-xs">View</Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AssetsTab({ emp }: { emp: Employee }) {
  const { getAssetsForEmployee } = useAssets();
  const empAssets = getAssetsForEmployee(emp.id);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Monitor className="h-4 w-4 text-primary" />Tagged Assets</CardTitle></CardHeader>
      <CardContent>
        {empAssets.length > 0 ? (
          <Table>
            <TableHeader><TableRow className="bg-muted/50">
              <TableHead>Asset</TableHead><TableHead>Category</TableHead><TableHead>Serial No.</TableHead><TableHead>Assigned Date</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {empAssets.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="text-sm font-medium">{a.name}</TableCell>
                  <TableCell className="text-sm">{a.category}</TableCell>
                  <TableCell className="text-sm font-mono">{a.serialNumber}</TableCell>
                  <TableCell className="text-sm">{a.assignedDate}</TableCell>
                  <TableCell><StatusBadge status={a.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8">
            <Monitor className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No assets assigned to this employee.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AuditTrailTab({ emp }: { emp: Employee }) {
  const { getLogsForEmployee } = useAudit();
  const logs = getLogsForEmployee(emp.id);
  const [sectionFilter, setSectionFilter] = useState("all");
  const sections = Array.from(new Set(logs.map(l => l.section)));

  const filtered = sectionFilter === "all" ? logs : logs.filter(l => l.section === sectionFilter);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" />Audit Trail</CardTitle>
        {sections.length > 0 && (
          <Select value={sectionFilter} onValueChange={setSectionFilter}>
            <SelectTrigger className="w-[200px] h-8 text-sm"><Filter className="h-3 w-3 mr-1.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sections</SelectItem>
              {sections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </CardHeader>
      <CardContent>
        {filtered.length > 0 ? (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Date & Time</TableHead>
                  <TableHead className="font-semibold">Section</TableHead>
                  <TableHead className="font-semibold">Field</TableHead>
                  <TableHead className="font-semibold">Old Value</TableHead>
                  <TableHead className="font-semibold">New Value</TableHead>
                  <TableHead className="font-semibold">Changed By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(log.changedAt).toLocaleString()}</TableCell>
                    <TableCell className="text-xs"><span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{log.section}</span></TableCell>
                    <TableCell className="text-sm font-medium">{log.field}</TableCell>
                    <TableCell className="text-sm text-destructive">{log.oldValue || "—"}</TableCell>
                    <TableCell className="text-sm text-primary">{log.newValue || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.changedBy}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : (
          <div className="text-center py-8">
            <ClipboardList className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No changes recorded yet. Edits to personal info, work info, compensation, and documents will appear here.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SeparationDialog({ open, onOpenChange, emp, separationData, setSeparationData, onConfirm }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  emp: Employee | null;
  separationData: { lastDate: string; reason: string; noticePeriodDays: number; noticePeriodServed: boolean };
  setSeparationData: (d: any) => void;
  onConfirm: () => void;
}) {
  if (!emp) return null;

  const yearsOfService = emp.joiningDate
    ? (Date.now() - new Date(emp.joiningDate).getTime()) / (1000 * 60 * 60 * 24 * 365)
    : 0;
  const basicSalary = emp.compensation?.find(c => c.type === "base")?.amount || Math.round(emp.salary * 0.6);
  const dailySalary = emp.salary / 30;

  // Calculate EOS benefits
  const applicableEOS = eosBenefitConfigs.filter(c => c.isActive && (c.appliesTo.length === 0 || c.appliesTo.includes(emp.category)));
  const eosBreakdown = applicableEOS.map(config => {
    const basis = config.calculationBasis === "basic_salary" ? basicSalary : emp.salary;
    return { name: config.name, amount: calculateEOSBenefit(config, yearsOfService, basis) };
  });
  const totalEOS = eosBreakdown.reduce((s, e) => s + e.amount, 0);

  // Leave balance (simplified)
  const empLeaves = leaveRequests.filter(l => l.employeeId === emp.id && l.status === "approved");
  const totalUsedLeave = empLeaves.reduce((s, l) => s + l.days, 0);
  const annualEntitlement = 21;
  const remainingLeave = annualEntitlement - totalUsedLeave;
  const leaveEncashment = 0;

  // Unpaid salary (assume current month partial)
  const lastDate = separationData.lastDate ? new Date(separationData.lastDate) : new Date();
  const daysWorkedInMonth = lastDate.getDate();
  const unpaidSalary = Math.round((emp.salary / 30) * daysWorkedInMonth);

  // Notice period
  const noticePeriodPay = separationData.noticePeriodServed ? 0 : Math.round(dailySalary * separationData.noticePeriodDays);

  // Outstanding loans (live from DB)
  const { data: empLoans = [] } = useQuery({
    queryKey: ["employee-active-loans", emp.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("loans")
        .select("id, remaining_balance, status")
        .eq("employee_id", emp.id)
        .eq("status", "active");
      return data ?? [];
    },
  });
  const totalLoanBalance = empLoans.reduce((s: number, l: any) => s + (l.remaining_balance ?? 0), 0);

  const totalSettlement = unpaidSalary + totalEOS + noticePeriodPay - totalLoanBalance;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Employee Separation — {emp.firstName} {emp.lastName}</DialogTitle>
          <DialogDescription>Calculate end-of-service settlement and process separation.</DialogDescription>
        </DialogHeader>
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

          <Separator />

          {/* Employee Summary */}
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div><p className="text-xs text-muted-foreground">Joining Date</p><p className="font-medium">{new Date(emp.joiningDate).toLocaleDateString()}</p></div>
            <div><p className="text-xs text-muted-foreground">Years of Service</p><p className="font-medium">{yearsOfService.toFixed(1)} years</p></div>
            <div><p className="text-xs text-muted-foreground">Monthly Salary</p><p className="font-medium">SAR {emp.salary.toLocaleString()}</p></div>
          </div>

          <Separator />

          {/* Settlement Breakdown */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Final Settlement Calculation</p>
            <div className="bg-muted/30 rounded-lg overflow-hidden text-sm">
              <div className="flex justify-between px-3 py-2 border-b border-border/50">
                <span>Unpaid Salary ({daysWorkedInMonth} days)</span>
                <span className="font-medium">SAR {unpaidSalary.toLocaleString()}</span>
              </div>
              {eosBreakdown.map((eos, i) => (
                <div key={i} className="flex justify-between px-3 py-2 border-b border-border/50">
                  <span>{eos.name}</span>
                  <span className="font-medium">SAR {eos.amount.toLocaleString()}</span>
                </div>
              ))}
              {noticePeriodPay > 0 && (
                <div className="flex justify-between px-3 py-2 border-b border-border/50">
                  <span>Notice Period Payment ({separationData.noticePeriodDays} days)</span>
                  <span className="font-medium">SAR {noticePeriodPay.toLocaleString()}</span>
                </div>
              )}
              {totalLoanBalance > 0 && (
                <div className="flex justify-between px-3 py-2 border-b border-border/50 text-destructive">
                  <span>Outstanding Loan Deduction</span>
                  <span className="font-medium">- SAR {totalLoanBalance.toLocaleString()}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center bg-primary/10 rounded-lg px-4 py-3 font-bold">
              <span>Total Final Settlement</span>
              <span className="text-primary">SAR {totalSettlement.toLocaleString()}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={!separationData.lastDate}>
            <UserMinus className="h-4 w-4 mr-2" />Process Separation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmployeeTypeSelect() {
  const { activeTypes } = useEmployeeTypes();
  return (
    <select name="category" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
      <option value="">Select employee type...</option>
      {activeTypes.map(t => (
        <option key={t.id} value={t.id}>{t.name}</option>
      ))}
    </select>
  );
}

function PayrollSetupSelect() {
  const { setups } = usePayrollSetups();
  const activeSetups = setups.filter(s => s.status === "active");
  return (
    <select name="payrollSetupId" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
      <option value="">Select payroll setup...</option>
      {activeSetups.map(s => (
        <option key={s.id} value={s.id}>{s.name} ({s.country})</option>
      ))}
    </select>
  );
}

function EmployeesDirectory() {
  const { role, currentEmployeeId } = useRole();
  const { reportMap, getManagerName, getManagerId } = useReporting();
  const { employees: localEmployees, updateEmployee, addEmployee } = useEmployees();
  const { getTypeName } = useEmployeeTypes();
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [profileViewOnly, setProfileViewOnly] = useState(true);
  const [addEmpOpen, setAddEmpOpen] = useState(false);
  const [editEmpId, setEditEmpId] = useState<string | null>(null);
  
  const [uploadDocOpen, setUploadDocOpen] = useState(false);
  const [separationOpen, setSeparationOpen] = useState(false);
  const [separationEmp, setSeparationEmp] = useState<Employee | null>(null);
  const [separationData, setSeparationData] = useState({
    lastDate: "",
    reason: "resignation",
    noticePeriodDays: 30,
    noticePeriodServed: true,
  });
  const { toast } = useToast();
  const { addSeparation } = useSeparations();

  // Document state management
  const [allDocs, setAllDocs] = useState<Record<string, EmployeeDoc[]>>(initialEmployeeDocs);
  const [reuploadDoc, setReuploadDoc] = useState<EmployeeDoc | null>(null);
  const [uploadDocName, setUploadDocName] = useState("");
  const [uploadDocType, setUploadDocType] = useState("");
  const [uploadExpiryDate, setUploadExpiryDate] = useState<Date | undefined>(undefined);

  const openUploadDialog = () => {
    setReuploadDoc(null);
    setUploadDocName("");
    setUploadDocType("");
    setUploadExpiryDate(undefined);
    setUploadDocOpen(true);
  };

  const openReuploadDialog = (doc: EmployeeDoc) => {
    setReuploadDoc(doc);
    setUploadDocName(doc.name);
    setUploadDocType(doc.type.toLowerCase());
    setUploadExpiryDate(doc.expiryDate ? parseISO(doc.expiryDate) : undefined);
    setUploadDocOpen(true);
  };

  // Employee add logic is now in AddEmployeeWizard component

  const { addLog: auditLog } = useAudit();

  const handleUploadDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    const empId = selectedEmployee.id;
    const today = new Date().toISOString().split("T")[0];
    const expiryStr = uploadExpiryDate ? format(uploadExpiryDate, "yyyy-MM-dd") : undefined;

    if (reuploadDoc) {
      // Re-upload: version increment, push old to history
      setAllDocs(prev => {
        const empDocs = [...(prev[empId] || [])];
        const idx = empDocs.findIndex(d => d.id === reuploadDoc.id);
        if (idx >= 0) {
          const old = empDocs[idx];
          empDocs[idx] = {
            ...old,
            uploadedDate: today,
            expiryDate: expiryStr,
            version: old.version + 1,
            previousVersions: [{ name: old.name, uploadedDate: old.uploadedDate, expiryDate: old.expiryDate }, ...old.previousVersions],
          };
        }
        return { ...prev, [empId]: empDocs };
      });
      auditLog({ employeeId: empId, employeeName: `${selectedEmployee.firstName} ${selectedEmployee.lastName}`, section: "Documents", field: "Re-upload", oldValue: `v${reuploadDoc.version}`, newValue: `v${reuploadDoc.version + 1} - ${reuploadDoc.name}` });
      toast({ title: "Document Re-uploaded", description: `${reuploadDoc.name} updated to version ${reuploadDoc.version + 1}.` });
    } else {
      // New upload
      const newDoc: EmployeeDoc = {
        id: `d-${Date.now()}`,
        name: uploadDocName,
        type: uploadDocType.charAt(0).toUpperCase() + uploadDocType.slice(1),
        uploadedDate: today,
        expiryDate: expiryStr,
        version: 1,
        previousVersions: [],
      };
      setAllDocs(prev => ({ ...prev, [empId]: [...(prev[empId] || []), newDoc] }));
      auditLog({ employeeId: empId, employeeName: `${selectedEmployee.firstName} ${selectedEmployee.lastName}`, section: "Documents", field: "Upload", oldValue: "", newValue: uploadDocName });
      toast({ title: "Document Uploaded", description: "The document has been uploaded successfully." });
    }
    setUploadDocOpen(false);
  };

  // Edit Employee — full-page wizard reuse (must be checked BEFORE selectedEmployee block).
  if (editEmpId) {
    const emp = localEmployees.find(e => e.id === editEmpId);
    return (
      <AddEmployeeWizard
        open={true}
        onOpenChange={(v) => { if (!v) setEditEmpId(null); }}
        employeeCount={localEmployees.length}
        editEmployeeId={editEmpId}
        onInitiateSeparation={emp && emp.status !== "separated" && emp.status !== "inactive"
          ? () => { setSeparationEmp(emp); setSeparationOpen(true); }
          : undefined}
      />
    );
  }

  // Admin/HR viewing another employee's profile in EDIT mode → use the wizard.
  // View mode (profileViewOnly=true) falls through to the read-only profile panel below.
  if (selectedEmployee && !profileViewOnly && role !== "employee" && selectedEmployee.id !== currentEmployeeId) {
    return (
      <AddEmployeeWizard
        open={true}
        onOpenChange={(v) => { if (!v) setSelectedEmployee(null); }}
        employeeCount={localEmployees.length}
        editEmployeeId={selectedEmployee.id}
        onInitiateSeparation={selectedEmployee.status !== "separated" && selectedEmployee.status !== "inactive"
          ? () => { setSeparationEmp(selectedEmployee); setSeparationOpen(true); }
          : undefined}
      />
    );
  }

  if (selectedEmployee) {
    const isEmployee = role === "employee";
    const isOwnProfile = selectedEmployee.id === currentEmployeeId;
    const canSeeFullProfile = !isEmployee || isOwnProfile;

    // Work tab only with mini org chart — for non-admin viewing others
    if (!canSeeFullProfile) {
      const ext = getExtData(selectedEmployee.id);
      const managerId = getManagerId(selectedEmployee.id);
      const managerEmp = managerId ? localEmployees.find(e => e.id === managerId) : null;
      const directReports = localEmployees.filter(e => reportMap[e.id] === selectedEmployee.id && e.status !== "separated");
      // Count total reports recursively
      const countAllReports = (empId: string): number => {
        const directs = localEmployees.filter(e => reportMap[e.id] === empId && e.status !== "separated");
        return directs.reduce((sum, d) => sum + 1 + countAllReports(d.id), 0);
      };
      const totalReports = countAllReports(selectedEmployee.id);

      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedEmployee(null)}>
              <ChevronLeft className="h-4 w-4 mr-1" />Back to Directory
            </Button>
          </div>

          {/* Employee Header */}
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="text-lg font-bold bg-secondary text-secondary-foreground">
                {selectedEmployee.firstName[0]}{selectedEmployee.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{selectedEmployee.firstName} {selectedEmployee.lastName}</h2>
              <p className="text-sm text-muted-foreground">{selectedEmployee.designation} · {selectedEmployee.department}</p>
            </div>
          </div>

          {/* Work Details Card */}
          <Tabs defaultValue="work">
            <TabsList>
              <TabsTrigger value="work"><Briefcase className="h-3.5 w-3.5 mr-1.5" />Work</TabsTrigger>
            </TabsList>
            <TabsContent value="work" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Work Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Full Name</p>
                      <p className="text-sm font-medium">{selectedEmployee.firstName} {selectedEmployee.lastName}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Designation</p>
                      <p className="text-sm font-medium">{selectedEmployee.designation}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Work Email</p>
                      <p className="text-sm font-medium">{ext.workEmail || selectedEmployee.email}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="text-sm font-medium">{selectedEmployee.phone || "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Department</p>
                      <p className="text-sm font-medium flex items-center gap-1.5"><Building className="h-3.5 w-3.5 text-muted-foreground" />{selectedEmployee.department}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Mini Org Chart */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-base">Organization</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center gap-0">
                    {/* Manager Card */}
                    {managerEmp && (
                      <>
                        <div
                          className="flex items-center gap-3 border rounded-lg p-3 w-full max-w-xs cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => setSelectedEmployee(managerEmp)}
                        >
                          <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-secondary-foreground">{managerEmp.firstName[0]}{managerEmp.lastName[0]}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{managerEmp.firstName} {managerEmp.lastName}</p>
                            <p className="text-xs text-muted-foreground">{managerEmp.designation}</p>
                          </div>
                        </div>
                        {/* Connector line */}
                        <div className="w-px h-6 bg-border" />
                      </>
                    )}

                    {/* Selected Employee Card (highlighted) */}
                    <div className="flex items-center gap-3 border-2 border-primary rounded-lg p-3 w-full max-w-xs bg-primary/5">
                      <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary-foreground">{selectedEmployee.firstName[0]}{selectedEmployee.lastName[0]}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{selectedEmployee.firstName} {selectedEmployee.lastName}</p>
                        <p className="text-xs text-muted-foreground">{selectedEmployee.designation}</p>
                        {totalReports > 0 && (
                          <p className="text-xs text-primary font-medium mt-0.5">
                            {totalReports} report{totalReports !== 1 ? "s" : ""}, {directReports.length} direct
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Direct Reports */}
                    {directReports.length > 0 && (
                      <>
                        {/* Connector line with label */}
                        <div className="w-px h-4 bg-border" />
                        <div className="text-xs text-muted-foreground mb-2 bg-muted px-3 py-1 rounded-full">
                          People reporting to {selectedEmployee.firstName}
                        </div>
                        <div className="w-px h-4 bg-border" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full mt-1">
                          {directReports.map(dr => (
                            <div
                              key={dr.id}
                              className="flex items-center gap-3 border rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => setSelectedEmployee(dr)}
                            >
                              <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
                                <span className="text-xs font-bold text-secondary-foreground">{dr.firstName[0]}{dr.lastName[0]}</span>
                              </div>
                              <div>
                                <p className="text-sm font-medium">{dr.firstName} {dr.lastName}</p>
                                <p className="text-xs text-muted-foreground">{dr.designation}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      );
    }

    // Full profile view (employer only)
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedEmployee(null)}>
            <ChevronLeft className="h-4 w-4 mr-1" />Back to Directory
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center">
              <span className="text-lg font-bold text-secondary-foreground">{selectedEmployee.firstName[0]}{selectedEmployee.lastName[0]}</span>
            </div>
            <div>
              <h2 className="text-xl font-bold">{selectedEmployee.firstName} {selectedEmployee.lastName}</h2>
              <p className="text-sm text-muted-foreground">{selectedEmployee.designation} · {selectedEmployee.department} · {selectedEmployee.empId}</p>
            </div>
          </div>
        {!isOwnProfile && !profileViewOnly && (
          <div className="flex items-center gap-2">
            {selectedEmployee.status !== "separated" && selectedEmployee.status !== "inactive" && (
              <Button variant="outline" size="sm" onClick={() => setEditEmpId(selectedEmployee.id)}>
                <Edit2 className="h-4 w-4 mr-2" />Edit Employee
              </Button>
            )}
            {selectedEmployee.status !== "separated" && selectedEmployee.status !== "inactive" && (
              <Button variant="destructive" size="sm" onClick={() => { setSeparationEmp(selectedEmployee); setSeparationOpen(true); }}>
                <UserMinus className="h-4 w-4 mr-2" />Initiate Separation
              </Button>
            )}
          </div>
        )}
        </div>

        <Tabs defaultValue="personal">
          <TabsList className="flex-wrap">
            <TabsTrigger value="personal"><User className="h-3.5 w-3.5 mr-1.5" />Personal</TabsTrigger>
            <TabsTrigger value="work"><Briefcase className="h-3.5 w-3.5 mr-1.5" />Work</TabsTrigger>
            <TabsTrigger value="compensation"><DollarSign className="h-3.5 w-3.5 mr-1.5" />Compensation</TabsTrigger>
            <TabsTrigger value="documents"><FileText className="h-3.5 w-3.5 mr-1.5" />Documents</TabsTrigger>
            <TabsTrigger value="assets"><Monitor className="h-3.5 w-3.5 mr-1.5" />Assets</TabsTrigger>
            {!isOwnProfile && <TabsTrigger value="audit"><ClipboardList className="h-3.5 w-3.5 mr-1.5" />Audit Trail</TabsTrigger>}
          </TabsList>
          <TabsContent value="personal" className="mt-4"><PersonalInfoTab emp={selectedEmployee} readOnly={profileViewOnly} /></TabsContent>
          <TabsContent value="work" className="mt-4"><WorkInfoTab emp={selectedEmployee} readOnly={profileViewOnly} /></TabsContent>
          <TabsContent value="compensation" className="mt-4"><CompensationTab emp={selectedEmployee} readOnly={isOwnProfile || profileViewOnly} onUpdatePayCurrency={(empId, currency) => { updateEmployee(empId, { payCurrency: currency }); setSelectedEmployee(prev => prev && prev.id === empId ? { ...prev, payCurrency: currency } : prev); }} /></TabsContent>
          <TabsContent value="documents" className="mt-4"><DocumentsTab emp={selectedEmployee} onUpload={openUploadDialog} documents={allDocs[selectedEmployee.id] || []} onReupload={openReuploadDialog} /></TabsContent>
          <TabsContent value="assets" className="mt-4"><AssetsTab emp={selectedEmployee} /></TabsContent>
          <TabsContent value="audit" className="mt-4"><AuditTrailTab emp={selectedEmployee} /></TabsContent>
        </Tabs>

        <Dialog open={uploadDocOpen} onOpenChange={setUploadDocOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{reuploadDoc ? `Re-upload: ${reuploadDoc.name}` : "Upload Document"}</DialogTitle>
              <DialogDescription>
                {reuploadDoc
                  ? `Updating version ${reuploadDoc.version} to ${reuploadDoc.version + 1} for ${selectedEmployee.firstName} ${selectedEmployee.lastName}.`
                  : `Upload a document for ${selectedEmployee.firstName} ${selectedEmployee.lastName}.`}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUploadDoc} className="space-y-4">
              <div className="space-y-2">
                <Label>Document Name</Label>
                <Input placeholder="e.g. Employment Contract" value={uploadDocName} onChange={e => setUploadDocName(e.target.value)} required disabled={!!reuploadDoc} />
              </div>
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select value={uploadDocType} onValueChange={setUploadDocType} required disabled={!!reuploadDoc}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="identity">Identity</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="tax">Tax</SelectItem>
                    <SelectItem value="certificate">Certificate</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Expiry Date <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !uploadExpiryDate && "text-muted-foreground")}>
                      <Calendar className="h-4 w-4 mr-2" />
                      {uploadExpiryDate ? format(uploadExpiryDate, "PPP") : "No expiry date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={uploadExpiryDate}
                      onSelect={setUploadExpiryDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                {uploadExpiryDate && (
                  <Button type="button" variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setUploadExpiryDate(undefined)}>
                    Clear expiry date
                  </Button>
                )}
              </div>
              <div className="space-y-2"><Label>File</Label><Input type="file" accept=".pdf,.jpg,.png,.doc,.docx" required /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setUploadDocOpen(false)}>Cancel</Button>
                <Button type="submit">{reuploadDoc ? "Re-upload" : "Upload"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Separation Dialog */}
        <SeparationDialog
          open={separationOpen}
          onOpenChange={setSeparationOpen}
          emp={separationEmp}
          separationData={separationData}
          setSeparationData={setSeparationData}
          onConfirm={async () => {
            if (separationEmp) {
              // Calculate settlement for the context record
              const yearsOfService = separationEmp.joiningDate
                ? (Date.now() - new Date(separationEmp.joiningDate).getTime()) / (1000 * 60 * 60 * 24 * 365)
                : 0;
              const basicSalary = separationEmp.compensation?.find(c => c.type === "base")?.amount || Math.round(separationEmp.salary * 0.6);
              const dailySalary = separationEmp.salary / 30;
              const applicableEOS = eosBenefitConfigs.filter(c => c.isActive && (c.appliesTo.length === 0 || c.appliesTo.includes(separationEmp.category)));
              const eosBreakdown = applicableEOS.map(config => {
                const basis = config.calculationBasis === "basic_salary" ? basicSalary : separationEmp.salary;
                return { name: config.name, amount: calculateEOSBenefit(config, yearsOfService, basis) };
              });
              const totalEOS = eosBreakdown.reduce((s, e) => s + e.amount, 0);
              const empLeaves = leaveRequests.filter(l => l.employeeId === separationEmp.id && l.status === "approved");
              const remainingLeave = 21 - empLeaves.reduce((s, l) => s + l.days, 0);
              const leaveEncashment = 0;
              const lastDate = separationData.lastDate ? new Date(separationData.lastDate) : new Date();
              const unpaidSalary = Math.round(dailySalary * lastDate.getDate());
              const noticePeriodPay = separationData.noticePeriodServed ? 0 : Math.round(dailySalary * separationData.noticePeriodDays);
              // Outstanding loans (live from DB)
              const { data: empLoansData } = await supabase
                .from("loans")
                .select("remaining_balance")
                .eq("employee_id", separationEmp.id)
                .eq("status", "active");
              const loanDeduction = (empLoansData ?? []).reduce((s: number, l: any) => s + (l.remaining_balance ?? 0), 0);
              const totalSettlement = unpaidSalary + totalEOS + leaveEncashment + noticePeriodPay - loanDeduction;

              const now = new Date();
              const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

              addSeparation({
                id: `sep-${Date.now()}`,
                employeeId: separationEmp.id,
                employeeName: `${separationEmp.firstName} ${separationEmp.lastName}`,
                empId: separationEmp.empId,
                department: separationEmp.department,
                designation: separationEmp.designation,
                lastDate: separationData.lastDate,
                reason: separationData.reason,
                noticePeriodDays: separationData.noticePeriodDays,
                noticePeriodServed: separationData.noticePeriodServed,
                unpaidSalary,
                eosAmount: totalEOS,
                eosBreakdown,
                leaveEncashment,
                noticePeriodPay,
                loanDeduction,
                totalSettlement,
                processedDate: now.toISOString().split("T")[0],
                payrollMonth: "",
                payrollYear: 0,
                payrollRunId: undefined,
                status: "pending",
              });

              updateEmployee(separationEmp.id, { status: "separated" as const });
              setSelectedEmployee({ ...separationEmp, status: "separated" });
              setSeparationOpen(false);
              toast({ title: "Separation Processed", description: `${separationEmp.firstName} ${separationEmp.lastName} has been separated. Final settlement will be included in the next payroll run.` });
            }
          }}
        />
      </div>
    );
  }

  const isEmployee = role === "employee";

  // Full-page add employee wizard
  if (addEmpOpen) {
    return <AddEmployeeWizard open={addEmpOpen} onOpenChange={setAddEmpOpen} employeeCount={localEmployees.length} />;
  }

  return (
    <div className="space-y-6">
      {/* Professional header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employee Directory</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isEmployee
              ? "Browse the employee directory."
              : `Managing ${localEmployees.filter(e => e.status !== "separated" && e.status === "active").length} active workforce members.`
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isEmployee && (
            <>
              <div className="relative min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name, ID or department..." className="pl-9 h-9 text-sm" />
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-auto h-9 gap-1.5">
                  <Filter className="h-3.5 w-3.5" />
                  <SelectValue placeholder="Filters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Filters</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-9"><Download className="h-4 w-4 mr-2" />Export</Button>
              <Button size="sm" className="gradient-ey text-primary-foreground font-semibold h-9" onClick={() => setAddEmpOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />Add Employee
              </Button>
            </>
          )}
        </div>
      </div>

      
      <EmployeeDirectoryTable
        employees={localEmployees.filter(e => e.status !== "separated")}
        onSelect={(emp) => { setProfileViewOnly(true); setSelectedEmployee(emp); }}
        onEdit={isEmployee ? undefined : (emp) => setEditEmpId(emp.id)}
        isEmployee={isEmployee}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Scope wrapper — "Me" shows personal profile, "People" shows directory
// ─────────────────────────────────────────────────────────────────────
import { useViewScope as __useViewScope } from "@/contexts/ViewScopeContext";
import MyProfilePage from "@/pages/MyProfilePage";

export default function EmployeesPage() {
  const { scope } = __useViewScope();
  if (scope === "me") return <MyProfilePage />;
  return <EmployeesDirectory />;
}
