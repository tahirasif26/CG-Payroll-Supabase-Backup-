import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useRole } from "@/contexts/RoleContext";
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
import { Plus, Pencil, Trash2, Search, Users } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ApprovalTestTab } from "@/components/approvalMatrix/ApprovalTestTab";

const APPROVAL_TYPE_LABELS: Record<ApprovalType, string> = {
  any_one: "Any one member",
  all_must: "All must approve",
  majority: "Majority (51%)",
};

const CATEGORIES: { key: PolicyCategory; label: string; unit: "money" | "days"; module: string }[] = [
  { key: "expenses_travel", label: "Expenses — Travel", unit: "money", module: "expenses" },
  { key: "expenses_meals", label: "Expenses — Meals", unit: "money", module: "expenses" },
  { key: "expenses_other", label: "Expenses — Other", unit: "money", module: "expenses" },
  { key: "leave", label: "Leave", unit: "days", module: "employees" },
  { key: "loans", label: "Loans", unit: "money", module: "payroll" },
  { key: "advances", label: "Advances", unit: "money", module: "expenses" },
  { key: "assets", label: "Assets", unit: "money", module: "assets" },
];

// Filter categories to only those whose module is enabled for the client.
// An empty enabledModules array means "all modules enabled" (matches client_has_module).
function filterCategoriesByModules(enabledModules: string[] | null | undefined) {
  if (!enabledModules || enabledModules.length === 0) return CATEGORIES;
  return CATEGORIES.filter((c) => enabledModules.includes(c.module));
}

// Stored as halalas (smallest unit). UI uses SAR.
const toHalalas = (sar: string): number | null => {
  const n = sar.trim();
  if (!n) return null;
  const v = Number(n);
  if (isNaN(v)) return null;
  return Math.round(v * 100);
};
const toSAR = (halalas: number | null | undefined): string =>
  halalas == null ? "" : (halalas / 100).toLocaleString();

const fmtLimit = (h: number | null) => (h == null ? "Unlimited" : `SAR ${(h / 100).toLocaleString()}`);
const initials = (a?: string | null, b?: string | null) =>
  `${(a ?? "").charAt(0)}${(b ?? "").charAt(0)}`.toUpperCase() || "?";

export default function ApprovalMatrixPage() {
  const { clientId, enabledModules } = useRole();
  const { data: approvers = [] } = useApprovers(clientId);
  const { data: groups = [] } = useApprovalGroups(clientId);
  const { data: policies = [] } = useApprovalPolicies(clientId);
  const { data: delegations = [] } = useApprovalDelegations(clientId);
  const { data: allEmployees = [] } = useEmployees();

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
        description="Configure who can approve what — groups, policies, and temporary delegations."
      />

      <Tabs defaultValue="approvers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="approvers">Approvers</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="settings">Delegation</TabsTrigger>
          <TabsTrigger value="test">Test</TabsTrigger>
        </TabsList>

        <TabsContent value="approvers">
          <ApproversTab approvers={approvers} groups={groups} enabledModules={enabledModules} />
        </TabsContent>

        <TabsContent value="groups">
          <GroupsTab
            groups={groups}
            approvers={approvers}
            empMap={empMap}
            groupMap={groupMap}
            clientId={clientId}
            enabledModules={enabledModules}
          />
        </TabsContent>

        <TabsContent value="policies">
          <PoliciesTab policies={policies} groups={groups} clientId={clientId} enabledModules={enabledModules} />
        </TabsContent>

        <TabsContent value="settings">
          <DelegationTab
            delegations={delegations}
            approvers={approvers}
            allEmployees={allEmployees as any[]}
            empMap={empMap}
            clientId={clientId}
          />
        </TabsContent>

        <TabsContent value="test">
          <ApprovalTestTab
            clientId={clientId}
            groups={groups}
            policies={policies}
            empMap={empMap}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// APPROVERS TAB
// ═══════════════════════════════════════════════════════════════════════
function ApproversTab({
  approvers,
  groups,
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

  const groupForApprover = (empId: string) =>
    groups.find((g) => g.member_ids.includes(empId));

  const capabilityModules = (caps: string[]) => {
    const modules = new Set<string>();
    caps.forEach((k) => modules.add(k.split(".")[0]));
    return Array.from(modules);
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, department, role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Approver</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Capabilities</TableHead>
              <TableHead>Group</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No approvers found. Admins are auto-included; otherwise grant a role any "*.approve" feature in User Permissions.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((a) => {
                const g = groupForApprover(a.id);
                const mods = capabilityModules(a.capabilities);
                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={a.avatar_url ?? undefined} />
                          <AvatarFallback className="text-xs">
                            {initials(a.first_name, a.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                          {a.first_name} {a.last_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{a.department ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{a.role_name ?? "—"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {mods.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          mods.map((m) => (
                            <Badge key={m} variant="secondary" className="capitalize text-xs">
                              {m}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {g ? (
                        <Badge>{g.name}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">No group</span>
                      )}
                    </TableCell>
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
  groups,
  approvers,
  empMap,
  groupMap,
  clientId,
  enabledModules,
}: {
  groups: ApprovalGroup[];
  approvers: ReturnType<typeof useApprovers>["data"];
  empMap: Map<string, { name: string; avatar: string | null }>;
  groupMap: Map<string, ApprovalGroup>;
  clientId: string | null;
  enabledModules: string[];
}) {
  const visibleCategories = useMemo(
    () => filterCategoriesByModules(enabledModules),
    [enabledModules],
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApprovalGroup | null>(null);
  const deleteGroup = useDeleteApprovalGroup();

  const onAdd = () => {
    setEditing(null);
    setOpen(true);
  };
  const onEdit = (g: ApprovalGroup) => {
    setEditing(g);
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <p className="text-sm text-muted-foreground">
          Groups bundle approvers together with limits, approval mode, and escalation rules.
        </p>
        <Button onClick={onAdd} size="sm" className="gradient-ey text-primary-foreground font-semibold">
          <Plus className="h-4 w-4 mr-2" /> Add Group
        </Button>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No approval groups yet. Click "Add Group" to create one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {groups.map((g) => (
            <Card key={g.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base">{g.name}</h3>
                      {g.category && (
                        <Badge variant="outline" className="capitalize">
                          {CATEGORIES.find((c) => c.key === g.category)?.label ?? g.category}
                        </Badge>
                      )}
                      <Badge variant="outline">
                        {(() => {
                          const u = CATEGORIES.find((c) => c.key === g.category)?.unit ?? "money";
                          if (g.max_limit_halalas == null) return "Unlimited";
                          const min = g.min_limit_halalas ?? 0;
                          if (u === "money") {
                            return `SAR ${(min / 100).toLocaleString()} – ${(g.max_limit_halalas / 100).toLocaleString()}`;
                          }
                          return `${min} – ${g.max_limit_halalas} days`;
                        })()}
                      </Badge>
                      <Badge variant="secondary">{APPROVAL_TYPE_LABELS[g.approval_type]}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <div className="flex -space-x-2">
                        {g.member_ids.slice(0, 5).map((id) => {
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
                      <span className="text-xs text-muted-foreground">{g.member_ids.length} member(s)</span>
                    </div>
                    {g.escalate_after_days != null && (
                      <p className="text-xs text-muted-foreground">
                        Escalates after {g.escalate_after_days} day(s) to{" "}
                        {g.escalate_to_group_id
                          ? groupMap.get(g.escalate_to_group_id)?.name ?? "—"
                          : "Admin"}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => onEdit(g)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Delete group "${g.name}"?`)) deleteGroup.mutate(g.id);
                      }}
                    >
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
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        approvers={approvers ?? []}
        groups={groups}
        clientId={clientId}
        visibleCategories={visibleCategories}
      />
    </div>
  );
}

function GroupDialog({
  open, onOpenChange, editing, approvers, groups, clientId, visibleCategories,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: ApprovalGroup | null;
  approvers: NonNullable<ReturnType<typeof useApprovers>["data"]>;
  groups: ApprovalGroup[];
  clientId: string | null;
  visibleCategories: typeof CATEGORIES;
}) {
  const create = useCreateApprovalGroup();
  const update = useUpdateApprovalGroup();

  const [name, setName] = useState("");
  const [category, setCategory] = useState<PolicyCategory | "">("");
  const [minVal, setMinVal] = useState("");
  const [maxVal, setMaxVal] = useState("");
  const [type, setType] = useState<ApprovalType>("any_one");
  const [escDays, setEscDays] = useState("");
  const [escTo, setEscTo] = useState<string>("admin");
  const [members, setMembers] = useState<string[]>([]);

  const selectedCat = visibleCategories.find((c) => c.key === category);
  const unit = selectedCat?.unit ?? "money";
  // For "days" categories we store the integer day count directly in the
  // *_halalas columns (no SAR↔halala conversion).
  const toStored = (s: string): number | null => {
    const n = s.trim();
    if (!n) return null;
    const v = Number(n);
    if (isNaN(v)) return null;
    return unit === "money" ? Math.round(v * 100) : Math.round(v);
  };
  const fromStored = (n: number | null | undefined, u: "money" | "days"): string =>
    n == null ? "" : u === "money" ? (n / 100).toLocaleString() : n.toString();

  // Initialize when editing changes
  useMemo(() => {
    if (open) {
      if (editing) {
        const editCat = (editing.category ?? "") as PolicyCategory | "";
        const editUnit =
          visibleCategories.find((c) => c.key === editCat)?.unit ?? "money";
        setName(editing.name);
        setCategory(editCat);
        setMinVal(fromStored(editing.min_limit_halalas, editUnit));
        setMaxVal(fromStored(editing.max_limit_halalas, editUnit));
        setType(editing.approval_type);
        setEscDays(editing.escalate_after_days?.toString() ?? "");
        setEscTo(editing.escalate_to_group_id ?? "admin");
        setMembers(editing.member_ids);
      } else {
        setName(""); setCategory(""); setMinVal(""); setMaxVal("");
        setType("any_one"); setEscDays(""); setEscTo("admin"); setMembers([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const handleSave = () => {
    if (!clientId || !name.trim()) return;
    const payload = {
      name: name.trim(),
      category: category ? (category as PolicyCategory) : null,
      min_limit_halalas: toStored(minVal),
      max_limit_halalas: toStored(maxVal),
      approval_type: type,
      escalate_after_days: escDays.trim() ? Number(escDays) : null,
      escalate_to_group_id: escTo === "admin" ? null : escTo,
      member_ids: members,
    };
    if (editing) {
      update.mutate({ id: editing.id, ...payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      create.mutate({ client_id: clientId, ...payload }, { onSuccess: () => onOpenChange(false) });
    }
  };

  const unitLabel = unit === "money" ? "SAR" : "days";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit" : "Add"} Approval Group</DialogTitle>
          <DialogDescription>Configure approver group with limits and escalation.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Category</Label>
            <Select
              value={category || undefined}
              onValueChange={(v) => setCategory(v as PolicyCategory)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {visibleCategories.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    No modules enabled
                  </div>
                ) : (
                  visibleCategories.map((c) => (
                    <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Group name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Senior Approvers" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Min ({unitLabel})</Label>
              <Input
                value={minVal}
                onChange={(e) => setMinVal(e.target.value)}
                placeholder="0"
                type="number"
                disabled={!category}
              />
            </div>
            <div>
              <Label>Max ({unitLabel})</Label>
              <Input
                value={maxVal}
                onChange={(e) => setMaxVal(e.target.value)}
                placeholder={unit === "money" ? "Empty = unlimited" : "Empty = unlimited"}
                type="number"
                disabled={!category}
              />
            </div>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Escalate after (days)</Label>
              <Input
                value={escDays}
                onChange={(e) => setEscDays(e.target.value)}
                placeholder="No escalation"
                type="number"
              />
            </div>
            <div>
              <Label>Escalate to</Label>
              <Select value={escTo} onValueChange={setEscTo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin only</SelectItem>
                  {groups
                    .filter((g) => g.id !== editing?.id)
                    .map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Members</Label>
            {(() => {
              if (!category) {
                return (
                  <p className="text-xs text-muted-foreground py-2">
                    Select a category above to see eligible approvers.
                  </p>
                );
              }
              const featureForCategory = (cat: PolicyCategory): string => {
                if (cat.startsWith("expenses")) return "expenses.approve";
                if (cat === "leave") return "leave.approve";
                if (cat === "advances") return "advances.approve";
                if (cat === "loans") return "loans.approve";
                if (cat === "assets") return "assets.approve_requests";
                return "";
              };
              const requiredFeature = featureForCategory(category as PolicyCategory);
              const eligible = approvers.filter((a) =>
                a.capabilities.includes(requiredFeature),
              );
              if (eligible.length === 0) {
                return (
                  <p className="text-xs text-muted-foreground py-2">
                    No employees have approval rights for this category. Grant a role
                    "{requiredFeature}" with people-level access in User Permissions.
                  </p>
                );
              }
              return (
                <ScrollArea className="h-48 border rounded-md p-2">
                  <div className="space-y-1">
                    {eligible.map((a) => (
                      <label
                        key={a.id}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer"
                      >
                        <Checkbox
                          checked={members.includes(a.id)}
                          onCheckedChange={(checked) => {
                            setMembers((prev) =>
                              checked ? [...prev, a.id] : prev.filter((x) => x !== a.id),
                            );
                          }}
                        />
                        <span className="text-sm">
                          {a.first_name} {a.last_name}
                          <span className="text-xs text-muted-foreground ml-2">({a.role_name})</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              );
            })()}
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
// POLICIES TAB
// ═══════════════════════════════════════════════════════════════════════
function PoliciesTab({
  policies, groups, clientId, enabledModules,
}: {
  policies: ApprovalPolicy[];
  groups: ApprovalGroup[];
  clientId: string | null;
  enabledModules: string[];
}) {
  const visibleCategories = useMemo(
    () => filterCategoriesByModules(enabledModules),
    [enabledModules],
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApprovalPolicy | null>(null);
  const [defaultCategory, setDefaultCategory] = useState<PolicyCategory>("expenses_travel");
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

  const onAdd = (cat: PolicyCategory) => {
    setEditing(null);
    setDefaultCategory(cat);
    setOpen(true);
  };
  const onEdit = (p: ApprovalPolicy) => {
    setEditing(p);
    setDefaultCategory(p.category);
    setOpen(true);
  };

  const groupName = (id: string | null) =>
    id ? groups.find((g) => g.id === id)?.name ?? "—" : "Admin only";

  return (
    <div className="space-y-4">
      {visibleCategories.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No approval-eligible modules are enabled for this client.
          </CardContent>
        </Card>
      )}
      {visibleCategories.map((c) => {
        const rows = byCategory.get(c.key) ?? [];
        return (
          <Card key={c.key}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">{c.label}</h3>
                <Button size="sm" variant="outline" onClick={() => onAdd(c.key)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add range
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Min ({c.unit === "money" ? "SAR" : "days"})</TableHead>
                    <TableHead>Max</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Approval type override</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-4 text-sm">
                        No rules — falls back to Admin approval.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{c.unit === "money" ? toSAR(p.min_value) : p.min_value}</TableCell>
                        <TableCell>
                          {p.max_value == null
                            ? "—"
                            : c.unit === "money"
                              ? toSAR(p.max_value)
                              : p.max_value}
                        </TableCell>
                        <TableCell>{groupName(p.group_id)}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {p.approval_type_override
                            ? APPROVAL_TYPE_LABELS[p.approval_type_override]
                            : "Use group default"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => onEdit(p)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (confirm("Delete this policy?")) deletePolicy.mutate(p.id);
                              }}
                            >
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
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        defaultCategory={defaultCategory}
        groups={groups}
        clientId={clientId}
        visibleCategories={visibleCategories}
      />
    </div>
  );
}

function PolicyDialog({
  open, onOpenChange, editing, defaultCategory, groups, clientId, visibleCategories,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: ApprovalPolicy | null;
  defaultCategory: PolicyCategory;
  groups: ApprovalGroup[];
  clientId: string | null;
  visibleCategories: typeof CATEGORIES;
}) {
  const upsert = useUpsertApprovalPolicy();

  const [category, setCategory] = useState<PolicyCategory>(defaultCategory);
  const [minVal, setMinVal] = useState("");
  const [maxVal, setMaxVal] = useState("");
  const [groupId, setGroupId] = useState<string>("admin");
  const [override, setOverride] = useState<string>("none");

  const cat = CATEGORIES.find((c) => c.key === category);
  const isMoney = cat?.unit === "money";

  useMemo(() => {
    if (open) {
      if (editing) {
        setCategory(editing.category);
        setMinVal(
          CATEGORIES.find((c) => c.key === editing.category)?.unit === "money"
            ? toSAR(editing.min_value)
            : String(editing.min_value),
        );
        setMaxVal(
          editing.max_value == null
            ? ""
            : CATEGORIES.find((c) => c.key === editing.category)?.unit === "money"
              ? toSAR(editing.max_value)
              : String(editing.max_value),
        );
        setGroupId(editing.group_id ?? "admin");
        setOverride(editing.approval_type_override ?? "none");
      } else {
        setCategory(defaultCategory);
        setMinVal(""); setMaxVal(""); setGroupId("admin"); setOverride("none");
      }
    }
  }, [open, editing, defaultCategory]);

  const handleSave = () => {
    if (!clientId) return;
    const min = isMoney ? toHalalas(minVal) ?? 0 : Number(minVal || 0);
    const max = maxVal.trim() === "" ? null : (isMoney ? toHalalas(maxVal) : Number(maxVal));
    upsert.mutate(
      {
        ...(editing ? { id: editing.id } : {}),
        client_id: clientId,
        category,
        min_value: min,
        max_value: max,
        group_id: groupId === "admin" ? null : groupId,
        approval_type_override: override === "none" ? null : (override as ApprovalType),
        sort_order: editing?.sort_order ?? 0,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit" : "Add"} Policy</DialogTitle>
          <DialogDescription>Route requests to an approval group based on value range.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={(v: PolicyCategory) => setCategory(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {visibleCategories.map((c) => (
                  <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Min ({isMoney ? "SAR" : "days"})</Label>
              <Input value={minVal} onChange={(e) => setMinVal(e.target.value)} type="number" />
            </div>
            <div>
              <Label>Max ({isMoney ? "SAR" : "days"})</Label>
              <Input
                value={maxVal}
                onChange={(e) => setMaxVal(e.target.value)}
                placeholder="Empty = no upper limit"
                type="number"
              />
            </div>
          </div>
          <div>
            <Label>Approval group</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin only</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Override approval type</Label>
            <Select value={override} onValueChange={setOverride}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Use group default</SelectItem>
                {Object.entries(APPROVAL_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
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
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const today = format(new Date(), "yyyy-MM-dd");

  const handleCreate = () => {
    if (!clientId || !from || !to || !start || !end) return;
    create.mutate(
      {
        client_id: clientId,
        from_employee_id: from,
        to_employee_id: to,
        start_date: start,
        end_date: end,
        is_active: true,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setFrom(""); setTo(""); setStart(""); setEnd("");
        },
      },
    );
  };

  const list = delegations ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">Active Delegations</h3>
              <p className="text-xs text-muted-foreground">
                Temporarily transfer approval authority to another employee.
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
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    No delegations configured.
                  </TableCell>
                </TableRow>
              ) : (
                list.map((d) => {
                  const expired = d.end_date < today;
                  return (
                    <TableRow key={d.id}>
                      <TableCell>{empMap.get(d.from_employee_id)?.name ?? "—"}</TableCell>
                      <TableCell>{empMap.get(d.to_employee_id)?.name ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {d.start_date} → {d.end_date}
                      </TableCell>
                      <TableCell>
                        {expired ? (
                          <Badge variant="outline">Expired</Badge>
                        ) : (
                          <Badge>Active</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Remove this delegation?")) remove.mutate(d.id);
                          }}
                        >
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
              Assign another employee to approve on behalf of an approver during a date range.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Delegating from</Label>
              <Select value={from} onValueChange={setFrom}>
                <SelectTrigger><SelectValue placeholder="Select approver" /></SelectTrigger>
                <SelectContent>
                  {(approvers ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.first_name} {a.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Delegating to</Label>
              <Select value={to} onValueChange={setTo}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {allEmployees
                    .filter((e: any) => e.id !== from)
                    .map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.first_name} {e.last_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>From date</Label>
                <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div>
                <Label>To date</Label>
                <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
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
