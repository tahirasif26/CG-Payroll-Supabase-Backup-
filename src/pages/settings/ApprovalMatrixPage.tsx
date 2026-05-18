import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useRole } from "@/contexts/RoleContext";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useApprovers,
  useApprovalGroups,
  useApprovalPolicies,
  useApprovalDelegations,
  useCreateApprovalGroup,
  useUpdateApprovalGroup,
  useDeleteApprovalGroup,
  useUpsertApprovalPolicy,
  useDeleteApprovalPolicy,
  useCreateDelegation,
  useDeleteDelegation,
  useWorkflowLogs,
  logWorkflowEvent,
  type ApprovalGroup,
  type ApprovalPolicy,
  type ApprovalType,
  type PolicyCategory,
} from "@/hooks/queries/useApprovalMatrix";
import { useEmployees } from "@/hooks/queries/useEmployees";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Pencil, Trash2, Search, Users, History, Infinity as InfinityIcon } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, formatDistanceToNow } from "date-fns";
import { ApprovalTestTab } from "@/components/approvalMatrix/ApprovalTestTab";

const APPROVAL_TYPE_LABELS: Record<ApprovalType, string> = {
  any_one: "Any one member",
  all_must: "All must approve",
  majority: "Majority (51%)",
};

interface CategoryDef {
  key: PolicyCategory;
  label: string;
  unit: "money" | "days";
  module: string; // matches clients.enabled_modules nav-key
  /** range = amount-based tiers; fixed = single chain, no amount */
  type: "range" | "fixed";
}

const ALL_CATEGORIES: CategoryDef[] = [
  { key: "leave",            label: "Leave Approvals",         unit: "days",  module: "employees", type: "fixed" },
  { key: "expenses",         label: "Expense Approvals",       unit: "money", module: "expenses",  type: "range" },
  { key: "advances",         label: "Advance Approvals",       unit: "money", module: "expenses",  type: "range" },
  { key: "loans",            label: "Loan Approvals",          unit: "money", module: "payroll",   type: "range" },
  { key: "assets",           label: "Asset Request Approvals", unit: "money", module: "assets",    type: "fixed" },
];

const toHalalas = (sar: string): number | null => {
  const n = sar.trim();
  if (!n) return null;
  const v = Number(n);
  if (isNaN(v)) return null;
  return Math.round(v * 100);
};
const toSAR = (h: number | null | undefined): string =>
  h == null ? "" : (h / 100).toLocaleString();
const initials = (a?: string | null, b?: string | null) =>
  `${(a ?? "").charAt(0)}${(b ?? "").charAt(0)}`.toUpperCase() || "?";

export default function ApprovalMatrixPage() {
  const { clientId, enabledModules } = useRole();
  const qc = useQueryClient();
  const { data: approvers = [] } = useApprovers(clientId);
  const { data: groups = [] } = useApprovalGroups(clientId);
  const { data: policies = [] } = useApprovalPolicies(clientId);
  const { data: delegations = [] } = useApprovalDelegations(clientId);
  const { data: allEmployees = [] } = useEmployees();
  const { data: logs = [] } = useWorkflowLogs(clientId);

  // Dynamic categories: filter by tenant's enabled modules.
  const categories = useMemo(() => {
    if (!enabledModules || enabledModules.length === 0) return ALL_CATEGORIES;
    return ALL_CATEGORIES.filter((c) => enabledModules.includes(c.module));
  }, [enabledModules]);

  // Realtime: live-sync changes across tabs/users.
  useEffect(() => {
    if (!clientId) return;
    const channel = supabase
      .channel(`approval-matrix-${clientId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "approval_groups", filter: `client_id=eq.${clientId}` },
        () => qc.invalidateQueries({ queryKey: ["approval_groups"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "approval_policies", filter: `client_id=eq.${clientId}` },
        () => qc.invalidateQueries({ queryKey: ["approval_policies"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "approval_delegations", filter: `client_id=eq.${clientId}` },
        () => qc.invalidateQueries({ queryKey: ["approval_delegations"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "workflow_logs", filter: `client_id=eq.${clientId}` },
        () => qc.invalidateQueries({ queryKey: ["workflow_logs"] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clientId, qc]);

  const empMap = useMemo(() => {
    const m = new Map<string, { name: string; avatar: string | null }>();
    (allEmployees as any[]).forEach((e) => {
      m.set(e.id, {
        name: `${e.first_name ?? ""} ${e.last_name ?? ""}`.trim() || "—",
        avatar: e.avatar_url ?? null,
      });
    });
    return m;
  }, [allEmployees]);

  const groupMap = useMemo(() => {
    const m = new Map<string, ApprovalGroup>();
    groups.forEach((g) => m.set(g.id, g));
    return m;
  }, [groups]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approval Matrix"
        description="Configure approval groups, policies, delegations, and audit history."
      />

      <Tabs defaultValue="groups" className="space-y-4">
        <TabsList>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="delegations">Delegations</TabsTrigger>
          <TabsTrigger value="approvers">Approvers</TabsTrigger>
          <TabsTrigger value="audit">
            <History className="h-3.5 w-3.5 mr-1" /> Audit Log
          </TabsTrigger>
          <TabsTrigger value="test">Test</TabsTrigger>
        </TabsList>

        <TabsContent value="groups">
          <GroupsTab
            groups={groups} approvers={approvers} empMap={empMap}
            groupMap={groupMap} clientId={clientId}
          />
        </TabsContent>

        <TabsContent value="policies">
          <PoliciesTab
            policies={policies} groups={groups}
            clientId={clientId} categories={categories}
          />
        </TabsContent>

        <TabsContent value="delegations">
          <DelegationTab
            delegations={delegations} approvers={approvers}
            allEmployees={allEmployees as any[]} empMap={empMap} clientId={clientId}
          />
        </TabsContent>

        <TabsContent value="approvers">
          <ApproversTab approvers={approvers} groups={groups} />
        </TabsContent>

        <TabsContent value="audit">
          <AuditLogTab logs={logs} />
        </TabsContent>

        <TabsContent value="test">
          <ApprovalTestTab clientId={clientId} groups={groups} policies={policies} empMap={empMap} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// APPROVERS TAB
// ═══════════════════════════════════════════════════════════════════════
function ApproversTab({
  approvers, groups,
}: {
  approvers: ReturnType<typeof useApprovers>["data"];
  groups: ApprovalGroup[];
}) {
  const [search, setSearch] = useState("");
  const list = approvers ?? [];
  const filtered = list.filter((a) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      `${a.first_name ?? ""} ${a.last_name ?? ""}`.toLowerCase().includes(q) ||
      (a.department ?? "").toLowerCase().includes(q) ||
      (a.role_name ?? "").toLowerCase().includes(q)
    );
  });
  const groupForApprover = (empId: string) => groups.find((g) => g.member_ids.includes(empId));

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, department, role..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Approver</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Group</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No approvers found. Admins are auto-included; otherwise grant a custom role any "*.approve" feature in User Permissions.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((a) => {
                const g = groupForApprover(a.id);
                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={a.avatar_url ?? undefined} />
                          <AvatarFallback className="text-xs">{initials(a.first_name, a.last_name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{a.first_name} {a.last_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{a.department ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline">{a.role_name ?? "—"}</Badge></TableCell>
                    <TableCell>{g ? <Badge>{g.name}</Badge> : <span className="text-xs text-muted-foreground">No group</span>}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// GROUPS TAB
// ═══════════════════════════════════════════════════════════════════════
function GroupsTab({
  groups, approvers, empMap, groupMap, clientId,
}: {
  groups: ApprovalGroup[];
  approvers: ReturnType<typeof useApprovers>["data"];
  empMap: Map<string, { name: string; avatar: string | null }>;
  groupMap: Map<string, ApprovalGroup>;
  clientId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApprovalGroup | null>(null);
  const deleteGroup = useDeleteApprovalGroup();

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <p className="text-sm text-muted-foreground">
          Groups bundle approvers together. Add as many members as you need — there is no cap.
        </p>
        <Button onClick={() => { setEditing(null); setOpen(true); }} size="sm" className="gradient-ey text-primary-foreground font-semibold">
          <Plus className="h-4 w-4 mr-2" /> Add Group
        </Button>
      </div>

      {groups.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          No approval groups yet. Click "Add Group" to create one.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {groups.map((g) => (
            <Card key={g.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base">{g.name}</h3>
                      <Badge variant="secondary">{APPROVAL_TYPE_LABELS[g.approval_type]}</Badge>
                      {!g.is_active && <Badge variant="outline">Inactive</Badge>}
                    </div>
                    {g.description && <p className="text-xs text-muted-foreground">{g.description}</p>}
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <div className="flex -space-x-2">
                        {g.member_ids.slice(0, 6).map((id) => {
                          const m = empMap.get(id);
                          return (
                            <Avatar key={id} className="h-7 w-7 border-2 border-background">
                              <AvatarImage src={m?.avatar ?? undefined} />
                              <AvatarFallback className="text-[10px]">
                                {(m?.name ?? "?").split(" ").map((n) => n[0]).slice(0, 2).join("")}
                              </AvatarFallback>
                            </Avatar>
                          );
                        })}
                      </div>
                      <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                        <InfinityIcon className="h-3 w-3" /> {g.member_ids.length} member{g.member_ids.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    {g.escalate_after_days != null && (
                      <p className="text-xs text-muted-foreground">
                        Escalates after {g.escalate_after_days} day(s) to{" "}
                        {g.escalate_to_group_id ? groupMap.get(g.escalate_to_group_id)?.name ?? "—" : "Admin"}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(g); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost"
                      onClick={() => {
                        if (confirm(`Delete group "${g.name}"?`)) {
                          deleteGroup.mutate(g.id, {
                            onSuccess: () => clientId && logWorkflowEvent({
                              client_id: clientId, entity_type: "approval_group",
                              entity_id: g.id, action: "deleted",
                              metadata: { name: g.name },
                            }),
                          });
                        }
                      }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <GroupDialog
        open={open} onOpenChange={setOpen} editing={editing}
        approvers={approvers ?? []} groups={groups} clientId={clientId}
      />
    </div>
  );
}

function GroupDialog({
  open, onOpenChange, editing, approvers, groups, clientId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: ApprovalGroup | null;
  approvers: NonNullable<ReturnType<typeof useApprovers>["data"]>;
  groups: ApprovalGroup[];
  clientId: string | null;
}) {
  const create = useCreateApprovalGroup();
  const update = useUpdateApprovalGroup();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [type, setType] = useState<ApprovalType>("any_one");
  const [escDays, setEscDays] = useState("");
  const [escTo, setEscTo] = useState<string>("admin");
  const [members, setMembers] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setDescription(editing.description ?? "");
      setIsActive(editing.is_active);
      setType(editing.approval_type);
      setEscDays(editing.escalate_after_days?.toString() ?? "");
      setEscTo(editing.escalate_to_group_id ?? "admin");
      setMembers(editing.member_ids);
    } else {
      setName(""); setDescription(""); setIsActive(true);
      setType("any_one"); setEscDays(""); setEscTo("admin"); setMembers([]);
    }
    setMemberSearch("");
  }, [open, editing]);

  const filteredApprovers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return approvers;
    return approvers.filter((a) =>
      `${a.first_name ?? ""} ${a.last_name ?? ""}`.toLowerCase().includes(q) ||
      (a.role_name ?? "").toLowerCase().includes(q)
    );
  }, [approvers, memberSearch]);

  const handleSave = () => {
    if (!clientId || !name.trim()) return;
    const payload: any = {
      name: name.trim(),
      description: description.trim() || null,
      is_active: isActive,
      max_limit_halalas: null, // unlimited — financial limits are now on policy ranges
      approval_type: type,
      escalate_after_days: escDays.trim() ? Number(escDays) : null,
      escalate_to_group_id: escTo === "admin" ? null : escTo,
      member_ids: members,
    };
    const onDone = (id: string | null) => {
      onOpenChange(false);
      if (clientId) logWorkflowEvent({
        client_id: clientId, entity_type: "approval_group",
        entity_id: id ?? editing?.id ?? null,
        action: editing ? "updated" : "created",
        metadata: { name: payload.name, members: members.length },
      });
    };
    if (editing) {
      update.mutate({ id: editing.id, ...payload }, { onSuccess: () => onDone(editing.id) });
    } else {
      create.mutate({ client_id: clientId, ...payload }, {
        onSuccess: (g: any) => onDone(g?.id ?? null),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit" : "Add"} Approval Group</DialogTitle>
          <DialogDescription>Bundle approvers — add unlimited members.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Group name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jr. Approvers, Finance Team" />
            </div>
            <div>
              <Label>Approval type</Label>
              <Select value={type} onValueChange={(v: ApprovalType) => setType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(APPROVAL_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Description (optional)</Label>
            <Textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="What this group is responsible for…" rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Escalate after (days)</Label>
              <Input value={escDays} onChange={(e) => setEscDays(e.target.value)} placeholder="No escalation" type="number" />
            </div>
            <div>
              <Label>Escalate to</Label>
              <Select value={escTo} onValueChange={setEscTo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin only</SelectItem>
                  {groups.filter((g) => g.id !== editing?.id).map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} id="grp-active" />
              <Label htmlFor="grp-active" className="cursor-pointer">Active</Label>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Members <span className="text-xs text-muted-foreground font-normal">({members.length} selected — unlimited)</span></Label>
              <Input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search members…"
                className="w-48 h-8 text-xs"
              />
            </div>
            {approvers.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No eligible approvers. Admins are auto-included; otherwise grant a custom role any "*.approve" feature.
              </p>
            ) : (
              <ScrollArea className="h-56 border rounded-md p-2">
                <div className="space-y-1">
                  {filteredApprovers.map((a) => (
                    <label key={a.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer">
                      <Checkbox
                        checked={members.includes(a.id)}
                        onCheckedChange={(checked) => {
                          setMembers((prev) => checked ? [...prev, a.id] : prev.filter((x) => x !== a.id));
                        }}
                      />
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={a.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[10px]">{initials(a.first_name, a.last_name)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm flex-1">
                        {a.first_name} {a.last_name}
                        <span className="text-xs text-muted-foreground ml-2">({a.role_name ?? "—"})</span>
                      </span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>{editing ? "Save" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// POLICIES TAB — dynamic, per enabled module
// ═══════════════════════════════════════════════════════════════════════
function PoliciesTab({
  policies, groups, clientId, categories,
}: {
  policies: ApprovalPolicy[];
  groups: ApprovalGroup[];
  clientId: string | null;
  categories: CategoryDef[];
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApprovalPolicy | null>(null);
  const [defaultCategory, setDefaultCategory] = useState<PolicyCategory>(categories[0]?.key ?? "leave");
  const deletePolicy = useDeleteApprovalPolicy();

  const byCategory = useMemo(() => {
    const m = new Map<PolicyCategory, ApprovalPolicy[]>();
    policies.forEach((p) => {
      const arr = m.get(p.category) ?? [];
      arr.push(p);
      m.set(p.category, arr);
    });
    return m;
  }, [policies]);

  const groupName = (id: string | null) =>
    id ? groups.find((g) => g.id === id)?.name ?? "—" : "Admin only";

  if (categories.length === 0) {
    return (
      <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
        No modules are enabled for this tenant — enable modules to configure approval policies.
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Policies route requests to an approval group. Categories shown reflect the modules enabled for this tenant.
      </p>
      {categories.map((c) => {
        const rows = byCategory.get(c.key) ?? [];
        const isRange = c.type === "range";
        return (
          <Card key={c.key}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">{c.label}</h3>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                    {isRange ? `Range-based · ${c.unit}` : "Fixed approval flow"}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => {
                  setEditing(null); setDefaultCategory(c.key); setOpen(true);
                }}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> {isRange ? "Add range" : "Add rule"}
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    {isRange && <TableHead>Min ({c.unit === "money" ? "SAR" : "days"})</TableHead>}
                    {isRange && <TableHead>Max</TableHead>}
                    <TableHead>Group</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isRange ? 4 : 2} className="text-center text-muted-foreground py-4 text-sm">
                        No rules — falls back to Admin approval.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((p) => (
                      <TableRow key={p.id}>
                        {isRange && <TableCell>{c.unit === "money" ? toSAR(p.min_value) : p.min_value}</TableCell>}
                        {isRange && (
                          <TableCell>
                            {p.max_value == null ? "—" : c.unit === "money" ? toSAR(p.max_value) : p.max_value}
                          </TableCell>
                        )}
                        <TableCell>{groupName(p.group_id)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => {
                              setEditing(p); setDefaultCategory(p.category); setOpen(true);
                            }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost"
                              onClick={() => {
                                if (confirm("Delete this policy?")) {
                                  deletePolicy.mutate(p.id, {
                                    onSuccess: () => clientId && logWorkflowEvent({
                                      client_id: clientId, entity_type: "approval_policy",
                                      entity_id: p.id, action: "deleted",
                                      metadata: { category: p.category },
                                    }),
                                  });
                                }
                              }}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      <PolicyDialog
        open={open} onOpenChange={setOpen} editing={editing}
        defaultCategory={defaultCategory} groups={groups}
        clientId={clientId} categories={categories}
      />
    </div>
  );
}

function PolicyDialog({
  open, onOpenChange, editing, defaultCategory, groups, clientId, categories,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: ApprovalPolicy | null;
  defaultCategory: PolicyCategory;
  groups: ApprovalGroup[];
  clientId: string | null;
  categories: CategoryDef[];
}) {
  const upsert = useUpsertApprovalPolicy();

  const [category, setCategory] = useState<PolicyCategory>(defaultCategory);
  const [minVal, setMinVal] = useState("");
  const [maxVal, setMaxVal] = useState("");
  const [groupId, setGroupId] = useState<string>("");
  const [override, setOverride] = useState<string>("none");

  const cat = categories.find((c) => c.key === category) ?? categories[0];
  const isMoney = cat?.unit === "money";
  const isRange = cat?.type === "range";

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setCategory(editing.category);
      const ec = categories.find((c) => c.key === editing.category);
      setMinVal(ec?.unit === "money" ? toSAR(editing.min_value) : String(editing.min_value));
      setMaxVal(editing.max_value == null ? "" : ec?.unit === "money" ? toSAR(editing.max_value) : String(editing.max_value));
      setGroupId(editing.group_id ?? "");
      setOverride(editing.approval_type_override ?? "none");
    } else {
      setCategory(defaultCategory);
      setMinVal(""); setMaxVal(""); setGroupId(""); setOverride("none");
    }
  }, [open, editing, defaultCategory, categories]);

  const handleSave = () => {
    if (!clientId) return;
    const min = isRange ? (isMoney ? toHalalas(minVal) ?? 0 : Number(minVal || 0)) : 0;
    const max = isRange
      ? (maxVal.trim() === "" ? null : (isMoney ? toHalalas(maxVal) : Number(maxVal)))
      : null;
    upsert.mutate({
      ...(editing ? { id: editing.id } : {}),
      client_id: clientId,
      category,
      policy_type: isRange ? "range" : "fixed",
      is_active: true,
      min_value: min,
      max_value: max,
      group_id: groupId === "admin" ? null : groupId,
      approval_type_override: override === "none" ? null : (override as ApprovalType),
      sort_order: editing?.sort_order ?? 0,
    } as any, {
      onSuccess: () => {
        onOpenChange(false);
        logWorkflowEvent({
          client_id: clientId, entity_type: "approval_policy",
          entity_id: editing?.id ?? null,
          action: editing ? "updated" : "created",
          metadata: { category, group_id: groupId, min, max },
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit" : "Add"} Policy</DialogTitle>
          <DialogDescription>
            {isRange ? "Route requests to a group based on amount range." : "Route requests to a fixed approval group."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={(v: PolicyCategory) => setCategory(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isRange && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Min ({isMoney ? "SAR" : "days"})</Label>
                <Input value={minVal} onChange={(e) => setMinVal(e.target.value)} type="number" />
              </div>
              <div>
                <Label>Max ({isMoney ? "SAR" : "days"})</Label>
                <Input value={maxVal} onChange={(e) => setMaxVal(e.target.value)} placeholder="Empty = no upper limit" type="number" />
              </div>
            </div>
          )}
          <div>
            <Label>Approval group</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger><SelectValue placeholder={groups.length === 0 ? "No groups — create one first" : "Select a group"} /></SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>{editing ? "Save" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DELEGATION TAB
// ═══════════════════════════════════════════════════════════════════════
function DelegationTab({
  delegations, approvers, allEmployees, empMap, clientId,
}: {
  delegations: ReturnType<typeof useApprovalDelegations>["data"];
  approvers: ReturnType<typeof useApprovers>["data"];
  allEmployees: any[];
  empMap: Map<string, { name: string; avatar: string | null }>;
  clientId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const create = useCreateDelegation();
  const remove = useDeleteDelegation();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [fallback, setFallback] = useState("");
  const [reason, setReason] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const today = format(new Date(), "yyyy-MM-dd");

  const handleCreate = () => {
    if (!clientId || !from || !to || !start || !end) return;
    create.mutate({
      client_id: clientId,
      from_employee_id: from,
      to_employee_id: to,
      fallback_employee_id: fallback || null,
      reason: reason.trim() || null,
      start_date: start, end_date: end, is_active: true,
    } as any, {
      onSuccess: () => {
        setOpen(false);
        setFrom(""); setTo(""); setFallback(""); setReason(""); setStart(""); setEnd("");
        logWorkflowEvent({
          client_id: clientId, entity_type: "approval_delegation",
          action: "created",
          metadata: { from, to, fallback, start, end },
        });
      },
    });
  };

  const list = delegations ?? [];
  const employeeOptions = (allEmployees ?? []).filter((e: any) => e.id);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">Active Delegations</h3>
              <p className="text-xs text-muted-foreground">
                Temporarily transfer approval authority. Falls back to a backup approver if the delegate is also unavailable.
              </p>
            </div>
            <Button size="sm" onClick={() => setOpen(true)} className="gradient-ey text-primary-foreground font-semibold">
              <Plus className="h-4 w-4 mr-2" /> Add Delegation
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Fallback</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                  No delegations configured.
                </TableCell></TableRow>
              ) : (
                list.map((d) => {
                  const expired = d.end_date < today || !d.is_active;
                  return (
                    <TableRow key={d.id}>
                      <TableCell>{empMap.get(d.from_employee_id)?.name ?? "—"}</TableCell>
                      <TableCell>{empMap.get(d.to_employee_id)?.name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {d.fallback_employee_id ? empMap.get(d.fallback_employee_id)?.name ?? "—" : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{d.start_date} → {d.end_date}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{d.reason ?? "—"}</TableCell>
                      <TableCell>{expired ? <Badge variant="outline">Expired</Badge> : <Badge>Active</Badge>}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost"
                          onClick={() => {
                            if (confirm("Remove this delegation?")) {
                              remove.mutate(d.id, {
                                onSuccess: () => clientId && logWorkflowEvent({
                                  client_id: clientId, entity_type: "approval_delegation",
                                  entity_id: d.id, action: "revoked",
                                  metadata: { from: d.from_employee_id, to: d.to_employee_id },
                                }),
                              });
                            }
                          }}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Delegation</DialogTitle>
            <DialogDescription>
              Re-route an approver's authority for a date range. Add a fallback in case the delegate is also out.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>From approver</Label>
              <Select value={from} onValueChange={setFrom}>
                <SelectTrigger><SelectValue placeholder="Select approver" /></SelectTrigger>
                <SelectContent>
                  {(approvers ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.first_name} {a.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>To delegate</Label>
              <Select value={to} onValueChange={setTo}>
                <SelectTrigger><SelectValue placeholder="Select delegate" /></SelectTrigger>
                <SelectContent>
                  {employeeOptions.filter((e) => e.id !== from).map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fallback approver (optional)</Label>
              <Select value={fallback || "none"} onValueChange={(v) => setFallback(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {employeeOptions.filter((e) => e.id !== from && e.id !== to).map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start date</Label>
                <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div>
                <Label>End date</Label>
                <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Reason (optional)</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
                placeholder="e.g. Annual leave, conference travel" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!from || !to || !start || !end}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// AUDIT LOG TAB
// ═══════════════════════════════════════════════════════════════════════
function AuditLogTab({ logs }: { logs: ReturnType<typeof useWorkflowLogs>["data"] }) {
  const [search, setSearch] = useState("");
  const list = logs ?? [];
  const filtered = list.filter((l) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return l.entity_type.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      JSON.stringify(l.metadata).toLowerCase().includes(q);
  });

  const actionColor = (action: string): "default" | "secondary" | "destructive" | "outline" => {
    if (action.includes("delete") || action.includes("revoke")) return "destructive";
    if (action.includes("create")) return "default";
    if (action.includes("update")) return "secondary";
    return "outline";
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by entity, action, or metadata…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No audit entries yet. Approval and delegation changes will appear here.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-sm">
                    <Badge variant="outline" className="text-[10px]">{l.entity_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={actionColor(l.action)} className="text-[10px]">{l.action}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono max-w-md truncate">
                    {Object.keys(l.metadata ?? {}).length > 0 ? JSON.stringify(l.metadata) : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
