import { useMemo, useState } from "react";
import { Search, Save, RotateCcw, Activity, Pencil, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEmployees } from "@/hooks/queries/useEmployees";
import {
  useFeatureDefinitions,
  useAllFeatureToggles,
  useFeaturePresets,
  useBulkSetToggles,
  useBulkApplyPreset,
  useUserFeatureToggles,
  useClientModules,
  groupByModule,
  computeEffectiveAccess,
  toAccessLevel,
  type AccessLevel,
  type FeatureDefinition,
  type FeaturePreset,
  type ModuleInfo,
} from "@/hooks/queries/useFeatureAccess";
import { useRole } from "@/contexts/RoleContext";
import { PermissionsTree } from "@/components/permissions/PermissionsTree";

interface EmployeeRow {
  id: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  department: string | null;
  designation: string | null;
  emp_id: string;
}

export default function UserPermissionsPage() {
  const { clientId } = useRole();
  const { data: employees = [] } = useEmployees({ status: "active" });
  const { data: defs = [] } = useFeatureDefinitions();
  const { data: allToggles = [] } = useAllFeatureToggles();
  const { data: presets = [] } = useFeaturePresets();
  const { data: enabledModules = [] } = useClientModules(clientId);

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const [openEmployeeId, setOpenEmployeeId] = useState<string | null>(null);

  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => e.department && set.add(e.department));
    return Array.from(set).sort();
  }, [employees]);

  const allModules = useMemo(() => groupByModule(defs), [defs]);
  // If a tenant has restricted modules, only show those.
  const visibleModules: ModuleInfo[] = useMemo(() => {
    if (!enabledModules.length) return allModules;
    return allModules.filter((m) => enabledModules.includes(m.key));
  }, [allModules, enabledModules]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (employees as EmployeeRow[]).filter((e) => {
      if (!e.user_id) return false;
      if (deptFilter !== "all" && e.department !== deptFilter) return false;
      if (!q) return true;
      const name = `${e.first_name ?? ""} ${e.last_name ?? ""}`.toLowerCase();
      return name.includes(q) || e.emp_id.toLowerCase().includes(q);
    });
  }, [employees, search, deptFilter]);

  // For each user → map of feature_key → access_level
  const togglesByUser = useMemo(() => {
    const map = new Map<string, Map<string, AccessLevel>>();
    allToggles.forEach((t) => {
      if (!map.has(t.user_id)) map.set(t.user_id, new Map());
      map.get(t.user_id)!.set(t.feature_key, t.access_level ?? (t.is_enabled ? "edit" : "none"));
    });
    return map;
  }, [allToggles]);

  const editing = filtered.find((e) => e.id === openEmployeeId) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Permissions"
        description="Per-employee module and feature access. Defaults inherit from role; override per person here."
      >
        <Button variant="outline" size="sm">
          <Activity className="h-4 w-4 mr-2" /> Activity log
        </Button>
      </PageHeader>

      {/* Assigned users summary */}
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Assigned employees</div>
            <div className="text-xs text-muted-foreground">
              {filtered.length} active employee{filtered.length === 1 ? "" : "s"} · {visibleModules.length}{" "}
              module{visibleModules.length === 1 ? "" : "s"} available
            </div>
          </div>
          <div className="flex -space-x-2">
            {filtered.slice(0, 6).map((e) => (
              <Avatar key={e.id} className="h-8 w-8 border-2 border-background">
                <AvatarImage src={e.avatar_url ?? undefined} />
                <AvatarFallback className="text-[10px]">
                  {(e.first_name?.[0] ?? "?") + (e.last_name?.[0] ?? "")}
                </AvatarFallback>
              </Avatar>
            ))}
            {filtered.length > 6 && (
              <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-medium">
                +{filtered.length - 6}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Employees */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead className="text-center">Overrides</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    No employees match the current filters.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((emp) => {
                const overrides = togglesByUser.get(emp.user_id!)?.size ?? 0;
                return (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={emp.avatar_url ?? undefined} />
                          <AvatarFallback>
                            {(emp.first_name?.[0] ?? "?") + (emp.last_name?.[0] ?? "")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">
                            {emp.first_name} {emp.last_name}
                          </div>
                          <div className="text-[11px] text-muted-foreground">{emp.emp_id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{emp.department ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{emp.designation ?? "—"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={overrides > 0 ? "default" : "secondary"} className="text-xs">
                        {overrides}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setOpenUserId(emp.user_id);
                          setOpenEmployeeId(emp.id);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PermissionEditorSheet
        userId={openUserId}
        employee={editing}
        defs={defs}
        modules={visibleModules}
        presets={presets}
        onClose={() => {
          setOpenUserId(null);
          setOpenEmployeeId(null);
        }}
      />
    </div>
  );
}

// ============================================================================
// Editor Sheet
// ============================================================================
function PermissionEditorSheet({
  userId,
  employee,
  defs,
  modules,
  presets,
  onClose,
}: {
  userId: string | null;
  employee: EmployeeRow | null;
  defs: FeatureDefinition[];
  modules: ModuleInfo[];
  presets: FeaturePreset[];
  onClose: () => void;
}) {
  const { data: userToggles = [] } = useUserFeatureToggles(userId);
  const bulkSet = useBulkSetToggles();
  const bulkApply = useBulkApplyPreset();

  const [pending, setPending] = useState<Map<string, AccessLevel>>(new Map());

  // Effective starting state from defaults + explicit toggles, scoped to visible modules.
  const effective = useMemo(() => {
    const explicit = userToggles.map((t) => ({
      feature_key: t.feature_key,
      access_level: t.access_level ?? (t.is_enabled ? ("edit" as AccessLevel) : ("none" as AccessLevel)),
    }));
    return computeEffectiveAccess(defs, explicit, "employee");
  }, [defs, userToggles]);

  const onChangeFeature = (key: string, level: AccessLevel) => {
    setPending((prev) => {
      const next = new Map(prev);
      next.set(key, level);
      return next;
    });
  };

  const onChangeModule = (moduleKey: string, level: AccessLevel) => {
    setPending((prev) => {
      const next = new Map(prev);
      const mod = modules.find((m) => m.key === moduleKey);
      if (!mod) return next;
      mod.features.forEach((f) => next.set(f.feature_key, level));
      return next;
    });
  };

  const applyPreset = async (presetId: string) => {
    if (!userId) return;
    await bulkApply.mutateAsync({ presetId, userIds: [userId] });
    setPending(new Map());
  };

  const save = async () => {
    if (!userId || pending.size === 0) return;
    const toggles = Array.from(pending.entries()).map(([feature_key, access_level]) => ({
      feature_key,
      access_level,
    }));
    await bulkSet.mutateAsync({ userId, toggles });
    setPending(new Map());
    onClose();
  };

  const reset = () => setPending(new Map());

  return (
    <Sheet open={!!userId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit permissions</SheetTitle>
        </SheetHeader>

        {employee && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
              <Avatar className="h-12 w-12">
                <AvatarImage src={employee.avatar_url ?? undefined} />
                <AvatarFallback>
                  {(employee.first_name?.[0] ?? "?") + (employee.last_name?.[0] ?? "")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="font-semibold">
                  {employee.first_name} {employee.last_name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {employee.emp_id} · {employee.department ?? "—"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select onValueChange={applyPreset}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="Apply preset..." />
                </SelectTrigger>
                <SelectContent>
                  {presets.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={reset} disabled={pending.size === 0}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>

            <PermissionsTree
              modules={modules}
              effective={effective}
              pending={pending}
              onChange={onChangeFeature}
              onModuleChange={onChangeModule}
            />
          </div>
        )}

        <SheetFooter className="mt-6 sticky bottom-0 bg-background pt-4 border-t">
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-muted-foreground">
              {pending.size > 0 ? `${pending.size} unsaved change(s)` : "No changes"}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={save} disabled={pending.size === 0 || bulkSet.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Save changes
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
