import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, Lock, Pencil, Plus, Search, Shield, Trash2, Users, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { useEmployees } from "@/hooks/queries/useEmployees";
import {
  useRoles,
  useRoleFeatures,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  useSetRoleFeatures,
  useAssignEmployeeRole,
  type RoleWithRelations,
} from "@/hooks/queries/useRoles";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingState } from "@/components/LoadingState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────
// Types & utils
// ─────────────────────────────────────────────────────────────────

interface FeatureDef {
  feature_key: string;
  module_key: string;
  name: string;
  description: string | null;
}

const MODULE_META: Record<string, { label: string; emoji: string }> = {
  employees: { label: "Employees", emoji: "👥" },
  payroll: { label: "Payroll", emoji: "💰" },
  expenses: { label: "Expenses", emoji: "🧾" },
  leave: { label: "Leave", emoji: "🌴" },
  loans: { label: "Loans & Advances", emoji: "💳" },
  assets: { label: "Assets", emoji: "📦" },
  performance: { label: "Performance", emoji: "⭐" },
  policies: { label: "Policies", emoji: "📜" },
  timesheets: { label: "Timesheets", emoji: "⏱" },
};

const initials = (first?: string | null, last?: string | null) =>
  `${(first?.[0] ?? "").toUpperCase()}${(last?.[0] ?? "").toUpperCase()}` || "—";

const fullName = (first?: string | null, last?: string | null) =>
  [first, last].filter(Boolean).join(" ") || "—";

function useFeatureDefinitions() {
  return useQuery({
    queryKey: ["feature_definitions_simple"],
    queryFn: async (): Promise<FeatureDef[]> => {
      const { data, error } = await supabase
        .from("feature_definitions")
        .select("feature_key, module_key, name, description")
        .order("module_key")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ─────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────

export default function UserPermissionsPage() {
  const { clientId } = useRole();
  const { data: rolesData, isLoading, error: rolesError } = useRoles(clientId);
  const roles = rolesData ?? [];
  const [openRoleId, setOpenRoleId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const openRole = useMemo(
    () => roles.find((r) => r.id === openRoleId) ?? null,
    [roles, openRoleId],
  );

  if (rolesError) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title="User Permissions" description="Manage roles and permissions." />
        <Card className="p-6 text-center text-muted-foreground">
          <p>Could not load roles. The roles table may not be set up yet.</p>
          <p className="text-xs mt-2 font-mono">{(rolesError as Error).message}</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
        </Card>
      </div>
    );
  }

  if (openRole) {
    return (
      <RoleDetailView
        role={openRole}
        allRoles={roles}
        onBack={() => setOpenRoleId(null)}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="User Permissions"
        description="Group permissions into roles and assign employees to them."
      >
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Create Role
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-44 animate-pulse bg-muted/30" />
          ))}
        </div>
      ) : roles.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          No roles yet. Create one to get started.
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((r) => (
            <RoleCard
              key={r.id}
              role={r}
              allRoles={roles}
              onOpen={() => setOpenRoleId(r.id)}
            />
          ))}
        </div>
      )}

      <CreateRoleDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        clientId={clientId}
        onCreated={(id) => setOpenRoleId(id)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Role card
// ─────────────────────────────────────────────────────────────────

function RoleCard({
  role, allRoles, onOpen,
}: { role: RoleWithRelations; allRoles: RoleWithRelations[]; onOpen: () => void }) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isAdmin = role.is_system && role.name.toLowerCase() === "admin";

  const memberCount = role.employees?.length ?? 0;

  const featureModules = useMemo(() => {
    const set = new Set<string>();
    for (const f of role.role_features ?? []) {
      const moduleKey = f.feature_key.split(".")[0];
      set.add(moduleKey);
    }
    return Array.from(set).slice(0, 6);
  }, [role.role_features]);

  return (
    <Card
      className="p-5 hover:shadow-md transition-shadow cursor-pointer flex flex-col gap-4"
      onClick={onOpen}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="h-3 w-3 rounded-full shrink-0"
            style={{ backgroundColor: role.color ?? "#6c5ce7" }}
          />
          <h3 className="font-semibold text-base truncate">{role.name}</h3>
          {role.is_system && (
            <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0">
              <Lock className="h-2.5 w-2.5" /> System
            </Badge>
          )}
        </div>
      </div>

      {/* Avatars & member count */}
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          {(role.employees ?? []).slice(0, 4).map((m) => (
            <Avatar key={m.id} className="h-7 w-7 border-2 border-background">
              <AvatarImage src={m.avatar_url ?? undefined} />
              <AvatarFallback className="text-[10px]">
                {initials(m.first_name, m.last_name)}
              </AvatarFallback>
            </Avatar>
          ))}
          {memberCount === 0 && (
            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
            </div>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {memberCount} member{memberCount === 1 ? "" : "s"}
        </span>
      </div>

      {/* Feature summary */}
      <div className="flex flex-wrap gap-1.5">
        {isAdmin ? (
          <Badge className="text-[10px]">All features ✓</Badge>
        ) : featureModules.length === 0 ? (
          <span className="text-[11px] text-muted-foreground italic">No features assigned</span>
        ) : (
          featureModules.map((m) => (
            <Badge key={m} variant="outline" className="text-[10px] gap-1">
              <span>{MODULE_META[m]?.emoji ?? "•"}</span>
              {MODULE_META[m]?.label ?? m} ✓
            </Badge>
          ))
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
        {role.is_system ? (
          <Button size="sm" variant="outline" className="flex-1" onClick={() => setRenameOpen(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> Rename
          </Button>
        ) : (
          <>
            <Button size="sm" variant="outline" className="flex-1" onClick={onOpen}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>

      <RenameRoleDialog open={renameOpen} onOpenChange={setRenameOpen} role={role} />
      <DeleteRoleDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        role={role}
        allRoles={allRoles}
      />
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────
// Dialogs: Create / Rename / Delete
// ─────────────────────────────────────────────────────────────────

function CreateRoleDialog({
  open, onOpenChange, clientId, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: string | null;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const create = useCreateRole();

  const handleSave = async () => {
    if (!clientId || !name.trim()) return;
    const role = await create.mutateAsync({ client_id: clientId, name });
    onOpenChange(false);
    setName("");
    onCreated(role.id);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setName(""); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Role</DialogTitle>
          <DialogDescription>Give the role a clear name (e.g. HR, Finance Manager).</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="role-name">Role Name</Label>
          <Input
            id="role-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. HR Manager"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim() || create.isPending}>
            {create.isPending ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RenameRoleDialog({
  open, onOpenChange, role,
}: { open: boolean; onOpenChange: (v: boolean) => void; role: RoleWithRelations }) {
  const [name, setName] = useState(role.name);
  const update = useUpdateRole();

  const handleSave = async () => {
    if (!name.trim() || name.trim() === role.name) { onOpenChange(false); return; }
    await update.mutateAsync({ id: role.id, client_id: role.client_id, name });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setName(role.name); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Role</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="rename-input">Role Name</Label>
          <Input id="rename-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim() || update.isPending}>
            {update.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteRoleDialog({
  open, onOpenChange, role, allRoles,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  role: RoleWithRelations;
  allRoles: RoleWithRelations[];
}) {
  const employeeRole = allRoles.find(
    (r) => r.is_system && r.name.toLowerCase() === "employee",
  );
  const del = useDeleteRole();
  const memberCount = role.employees?.length ?? 0;

  const handleConfirm = async () => {
    await del.mutateAsync({
      id: role.id,
      client_id: role.client_id,
      reassignToRoleId: employeeRole?.id ?? null,
    });
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete role "{role.name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            {memberCount > 0
              ? `${memberCount} member${memberCount === 1 ? "" : "s"} will be moved to the Employee role.`
              : "This role has no members."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} className="bg-destructive hover:bg-destructive/90">
            Delete role
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─────────────────────────────────────────────────────────────────
// Role detail view
// ─────────────────────────────────────────────────────────────────

function RoleDetailView({
  role, allRoles, onBack,
}: { role: RoleWithRelations; allRoles: RoleWithRelations[]; onBack: () => void }) {
  const isAdmin = role.is_system && role.name.toLowerCase() === "admin";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Roles
          </Button>
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: role.color ?? "#6c5ce7" }}
            />
            <h2 className="text-xl font-semibold">{role.name}</h2>
            {role.is_system && (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" /> System Role
              </Badge>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="features">
        <TabsList>
          <TabsTrigger value="features"><Shield className="h-4 w-4 mr-1" /> Features</TabsTrigger>
          <TabsTrigger value="members"><Users className="h-4 w-4 mr-1" /> Members</TabsTrigger>
        </TabsList>

        <TabsContent value="features" className="mt-4">
          <FeaturesTab role={role} readOnly={isAdmin} />
        </TabsContent>
        <TabsContent value="members" className="mt-4">
          <MembersTab role={role} allRoles={allRoles} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Features tab
// ─────────────────────────────────────────────────────────────────

interface FeatureState {
  enabled: boolean;
  people: boolean;
}

function FeaturesTab({ role, readOnly }: { role: RoleWithRelations; readOnly: boolean }) {
  const { data: defs = [], isLoading: defsLoading } = useFeatureDefinitions();
  const { data: existing = [], isLoading: rfLoading } = useRoleFeatures(role.id);
  const setFeatures = useSetRoleFeatures();

  const initialState = useMemo(() => {
    const map: Record<string, FeatureState> = {};
    // All features are always enabled for the role (like default Employee).
    // Only the "People" scope flag is configurable per feature.
    for (const d of defs) {
      map[d.feature_key] = { enabled: true, people: false };
    }
    for (const ef of existing) {
      map[ef.feature_key] = { enabled: true, people: ef.people_enabled };
    }
    return map;
  }, [defs, existing]);

  const [state, setState] = useState<Record<string, FeatureState>>(initialState);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);

  // Re-sync when source data changes (e.g. after save invalidation)
  useEffect(() => {
    setState(initialState);
    setDirty(false);
  }, [initialState]);

  const grouped = useMemo(() => {
    const m: Record<string, FeatureDef[]> = {};
    for (const d of defs) {
      (m[d.module_key] ??= []).push(d);
    }
    return m;
  }, [defs]);

  const moduleKeys = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  const toggleModule = (modKey: string, on: boolean) => {
    setState((s) => {
      const next = { ...s };
      for (const f of grouped[modKey] ?? []) {
        next[f.feature_key] = { enabled: on, people: on ? next[f.feature_key]?.people ?? false : false };
      }
      return next;
    });
    setDirty(true);
  };

  const toggleFeature = (key: string, on: boolean) => {
    setState((s) => ({ ...s, [key]: { enabled: on, people: on ? s[key]?.people ?? false : false } }));
    setDirty(true);
  };

  const togglePeople = (key: string, on: boolean) => {
    setState((s) => ({ ...s, [key]: { enabled: s[key]?.enabled ?? false, people: on } }));
    setDirty(true);
  };

  const moduleSummary = (modKey: string): { all: boolean; some: boolean; total: number; on: number } => {
    const items = grouped[modKey] ?? [];
    let on = 0;
    for (const it of items) if (state[it.feature_key]?.enabled) on++;
    return { all: on === items.length && items.length > 0, some: on > 0 && on < items.length, total: items.length, on };
  };

  const handleSave = async () => {
    const features = Object.entries(state)
      .filter(([, v]) => v.enabled)
      .map(([feature_key, v]) => ({ feature_key, people_enabled: v.people }));
    await setFeatures.mutateAsync({
      role_id: role.id,
      client_id: role.client_id,
      features,
    });
    setDirty(false);
  };

  if (defsLoading || rfLoading) {
    return <Card className="p-4"><LoadingState rows={6} variant="page" /></Card>;
  }

  return (
    <Card className="p-4 space-y-2">
      {readOnly && (
        <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground mb-2">
          Admin role has full access to every feature. This is read-only.
        </div>
      )}

      {moduleKeys.map((modKey) => {
        const meta = MODULE_META[modKey] ?? { label: modKey, emoji: "•" };
        const summary = moduleSummary(modKey);
        const isExpanded = expanded.has(modKey);
        const moduleOn = readOnly ? true : summary.all;
        return (
          <div key={modKey} className="border rounded-md">
            <div className="flex items-center gap-3 p-3">
              <button
                className="p-1 rounded hover:bg-muted"
                onClick={() =>
                  setExpanded((s) => {
                    const n = new Set(s);
                    if (n.has(modKey)) n.delete(modKey); else n.add(modKey);
                    return n;
                  })
                }
                aria-label={isExpanded ? "Collapse" : "Expand"}
              >
                <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded ? "" : "-rotate-90")} />
              </button>
              <span className="text-lg">{meta.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{meta.label}</div>
                <div className="text-[11px] text-muted-foreground">
                  {summary.total} feature{summary.total === 1 ? "" : "s"}
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="border-t divide-y">
                {(grouped[modKey] ?? []).map((f) => {
                  const cur = state[f.feature_key] ?? { enabled: true, people: false };
                  return (
                    <div key={f.feature_key} className="flex items-center gap-3 px-4 py-2.5 pl-12">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm">{f.name}</div>
                        {f.description && (
                          <div className="text-[11px] text-muted-foreground truncate">{f.description}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={readOnly ? true : cur.people}
                          disabled={readOnly}
                          onCheckedChange={(v) => togglePeople(f.feature_key, v)}
                          className="data-[state=checked]:bg-rose-500"
                        />
                        <span className="text-xs text-muted-foreground">People</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {!readOnly && (
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={!dirty || setFeatures.isPending}>
            {setFeatures.isPending ? "Saving…" : "Save Permissions"}
          </Button>
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────
// Members tab
// ─────────────────────────────────────────────────────────────────

function MembersTab({
  role, allRoles,
}: { role: RoleWithRelations; allRoles: RoleWithRelations[] }) {
  const { data: employees = [] } = useEmployees({ status: "active" });
  const assign = useAssignEmployeeRole();
  const employeeRole = allRoles.find(
    (r) => r.is_system && r.name.toLowerCase() === "employee",
  );

  const [search, setSearch] = useState("");
  const [pendingMove, setPendingMove] = useState<null | {
    employee: { id: string; name: string; user_id: string | null };
    fromRole: RoleWithRelations;
  }>(null);

  // Map employee_id → role
  const empToRole = useMemo(() => {
    const m: Record<string, RoleWithRelations> = {};
    for (const r of allRoles) for (const e of r.employees ?? []) m[e.id] = r;
    return m;
  }, [allRoles]);

  const members = role.employees ?? [];

  const candidates = useMemo(() => {
    const memberIds = new Set(members.map((m) => m.id));
    const q = search.trim().toLowerCase();
    return employees
      .filter((e) => !memberIds.has(e.id))
      .filter((e) => {
        if (!q) return true;
        const name = `${e.first_name ?? ""} ${e.last_name ?? ""}`.toLowerCase();
        return name.includes(q) || (e.emp_id ?? "").toLowerCase().includes(q);
      })
      .slice(0, 20);
  }, [employees, members, search]);

  const handleAdd = (emp: { id: string; user_id: string | null; first_name: string | null; last_name: string | null }) => {
    const existing = empToRole[emp.id];
    if (existing && existing.id !== role.id) {
      setPendingMove({
        employee: { id: emp.id, name: fullName(emp.first_name, emp.last_name), user_id: emp.user_id ?? null },
        fromRole: existing,
      });
      return;
    }
    assign.mutate({
      employee_id: emp.id,
      role_id: role.id,
      client_id: role.client_id,
      role_name: role.name,
      user_id: emp.user_id ?? null,
    });
  };

  const confirmMove = () => {
    if (!pendingMove) return;
    assign.mutate({
      employee_id: pendingMove.employee.id,
      role_id: role.id,
      client_id: role.client_id,
      role_name: role.name,
      user_id: pendingMove.employee.user_id ?? null,
    });
    setPendingMove(null);
  };

  const handleRemove = (employeeId: string) => {
    // Move to Employee role if available, else null.
    const member = members.find((m) => m.id === employeeId);
    assign.mutate({
      employee_id: employeeId,
      role_id: employeeRole?.id ?? null,
      client_id: role.client_id,
      role_name: "Employee",
      user_id: member?.user_id ?? null,
    });
  };

  return (
    <Card className="p-4 space-y-4">
      {/* Add member */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="w-full flex items-center gap-2 border rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 text-left"
          >
            <Search className="h-4 w-4" /> Search employees to add…
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
          <div className="p-2 border-b">
            <Input
              placeholder="Type a name or ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <ScrollArea className="max-h-72">
            {candidates.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                No matching employees.
              </div>
            ) : (
              <div className="divide-y">
                {candidates.map((e) => {
                  const cur = empToRole[e.id];
                  return (
                    <button
                      key={e.id}
                      onClick={() => handleAdd(e)}
                      className="w-full flex items-center gap-3 p-2.5 hover:bg-muted/50 text-left"
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={e.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[10px]">
                          {initials(e.first_name, e.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{fullName(e.first_name, e.last_name)}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {e.emp_id} · {e.department ?? "—"}
                        </div>
                      </div>
                      {cur && cur.id !== role.id && (
                        <Badge variant="outline" className="text-[10px]">in {cur.name}</Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Current members */}
      {members.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No members yet. Add employees from the search above.
        </div>
      ) : (
        <div className="divide-y border rounded-md">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-3 py-2.5">
              <Avatar className="h-8 w-8">
                <AvatarImage src={m.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs">
                  {initials(m.first_name, m.last_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm">{fullName(m.first_name, m.last_name)}</div>
                <div className="text-[11px] text-muted-foreground">
                  {m.emp_id}{m.department ? ` · ${m.department}` : ""}{m.designation ? ` · ${m.designation}` : ""}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(m.id)}
                disabled={assign.isPending}
              >
                <X className="h-4 w-4 mr-1" /> Remove
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Move-confirm dialog */}
      <AlertDialog open={!!pendingMove} onOpenChange={(v) => { if (!v) setPendingMove(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move {pendingMove?.employee.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingMove?.employee.name} is currently in <strong>{pendingMove?.fromRole.name}</strong> role.
              Moving to <strong>{role.name}</strong> will remove them from their current role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMove}>Move to {role.name}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
