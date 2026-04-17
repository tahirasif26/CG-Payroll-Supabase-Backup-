import { useMemo, useState } from "react";
import { Search, Settings2, Save, RotateCcw, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useEmployees } from "@/hooks/queries/useEmployees";
import {
  useFeatureDefinitions,
  useAllFeatureToggles,
  useFeaturePresets,
  useBulkSetToggles,
  useBulkApplyPreset,
  useUpsertPreset,
  useDeletePreset,
  useUserFeatureToggles,
  computeEffective,
  type FeatureDefinition,
  type FeaturePreset,
} from "@/hooks/queries/useFeatureAccess";

// (TableHeader imported above)

interface EmployeeWithUser {
  id: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  department: string | null;
  emp_id: string;
}

export default function FeatureAccessPage() {
  const { data: employees = [] } = useEmployees({ status: "active" });
  const { data: defs = [] } = useFeatureDefinitions();
  const { data: allToggles = [] } = useAllFeatureToggles();
  const { data: presets = [] } = useFeaturePresets();

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const [openEmployeeId, setOpenEmployeeId] = useState<string | null>(null);
  const [presetMgrOpen, setPresetMgrOpen] = useState(false);

  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => e.department && set.add(e.department));
    return Array.from(set).sort();
  }, [employees]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (employees as EmployeeWithUser[]).filter((e) => {
      if (!e.user_id) return false; // need an auth user to manage toggles
      if (deptFilter !== "all" && e.department !== deptFilter) return false;
      if (!q) return true;
      const name = `${e.first_name ?? ""} ${e.last_name ?? ""}`.toLowerCase();
      return name.includes(q) || e.emp_id.toLowerCase().includes(q);
    });
  }, [employees, search, deptFilter]);

  const modules = useMemo(() => {
    const map = new Map<string, FeatureDefinition[]>();
    defs.forEach((d) => {
      if (!map.has(d.module)) map.set(d.module, []);
      map.get(d.module)!.push(d);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [defs]);

  /** For each user, count explicit toggles per module. We show enabled/total based on explicit override. */
  const togglesByUser = useMemo(() => {
    const map = new Map<string, Map<string, boolean>>();
    allToggles.forEach((t) => {
      if (!map.has(t.user_id)) map.set(t.user_id, new Map());
      map.get(t.user_id)!.set(t.feature_key, t.is_enabled);
    });
    return map;
  }, [allToggles]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feature Access Control"
        description="Control which features each employee can see and use."
      >
        <Button variant="outline" onClick={() => setPresetMgrOpen(true)}>
          <Settings2 className="h-4 w-4 mr-2" />
          Manage Presets
        </Button>
      </PageHeader>

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

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                {modules.map(([mod, list]) => (
                  <TableHead key={mod} className="text-center capitalize">
                    {mod}
                    <div className="text-[10px] font-normal text-muted-foreground">
                      ({list.length} features)
                    </div>
                  </TableHead>
                ))}
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={modules.length + 3} className="text-center py-12 text-muted-foreground">
                    No employees match the current filters.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((emp) => {
                const explicit = togglesByUser.get(emp.user_id!);
                return (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={emp.avatar_url ?? undefined} />
                          <AvatarFallback>
                            {(emp.first_name?.[0] ?? "?") + (emp.last_name?.[0] ?? "")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {emp.first_name} {emp.last_name}
                          </div>
                          <div className="text-xs text-muted-foreground">{emp.emp_id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{emp.department ?? "—"}</TableCell>
                    {modules.map(([mod, list]) => {
                      const overrides = list.filter((d) => explicit?.has(d.feature_key)).length;
                      return (
                        <TableCell key={mod} className="text-center">
                          <Badge variant={overrides > 0 ? "default" : "secondary"} className="text-xs">
                            {overrides}/{list.length}
                          </Badge>
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setOpenUserId(emp.user_id);
                          setOpenEmployeeId(emp.id);
                        }}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ToggleEditorSheet
        userId={openUserId}
        employee={filtered.find((e) => e.id === openEmployeeId) ?? null}
        defs={defs}
        modules={modules}
        presets={presets}
        onClose={() => {
          setOpenUserId(null);
          setOpenEmployeeId(null);
        }}
      />

      <PresetManagerDialog
        open={presetMgrOpen}
        onClose={() => setPresetMgrOpen(false)}
        presets={presets}
        defs={defs}
        modules={modules}
      />
    </div>
  );
}

// =============================================================================
// Toggle Editor Sheet
// =============================================================================
function ToggleEditorSheet({
  userId,
  employee,
  defs,
  modules,
  presets,
  onClose,
}: {
  userId: string | null;
  employee: EmployeeWithUser | null;
  defs: FeatureDefinition[];
  modules: Array<[string, FeatureDefinition[]]>;
  presets: FeaturePreset[];
  onClose: () => void;
}) {
  const { data: userToggles = [] } = useUserFeatureToggles(userId);
  const bulkSet = useBulkSetToggles();
  const bulkApply = useBulkApplyPreset();

  const [pending, setPending] = useState<Map<string, boolean>>(new Map());

  // The effective starting state is computed from defaults + explicit toggles.
  const effective = useMemo(
    () => computeEffective(defs, userToggles, "employee"),
    [defs, userToggles],
  );

  const isEnabled = (key: string) => (pending.has(key) ? pending.get(key)! : effective.get(key) ?? false);
  const setEnabled = (key: string, val: boolean) => {
    setPending((prev) => {
      const next = new Map(prev);
      next.set(key, val);
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
    const toggles = Array.from(pending.entries()).map(([feature_key, is_enabled]) => ({
      feature_key,
      is_enabled,
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
          <SheetTitle>Feature Access</SheetTitle>
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
                <SelectTrigger className="w-[220px]">
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

            <Accordion type="multiple" defaultValue={modules.map(([m]) => m)}>
              {modules.map(([mod, list]) => {
                const enabledCount = list.filter((d) => isEnabled(d.feature_key)).length;
                return (
                  <AccordionItem key={mod} value={mod}>
                    <AccordionTrigger className="hover:no-underline">
                      <span className="capitalize font-medium">{mod}</span>
                      <Badge variant="secondary" className="ml-2 mr-auto text-xs">
                        {enabledCount}/{list.length}
                      </Badge>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        {list.map((def) => (
                          <div
                            key={def.feature_key}
                            className="flex items-start justify-between gap-3 py-2 border-b last:border-0"
                          >
                            <div className="flex-1 min-w-0">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Label className="text-sm font-medium cursor-help">
                                      {def.name}
                                    </Label>
                                  </TooltipTrigger>
                                  {def.description && (
                                    <TooltipContent className="max-w-xs">
                                      {def.description}
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                              <div className="text-[11px] text-muted-foreground font-mono">
                                {def.feature_key}
                              </div>
                            </div>
                            <Switch
                              checked={isEnabled(def.feature_key)}
                              onCheckedChange={(v) => setEnabled(def.feature_key, v)}
                            />
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        )}

        <SheetFooter className="mt-6 sticky bottom-0 bg-background pt-4 border-t">
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-muted-foreground">
              {pending.size > 0 ? `${pending.size} unsaved change(s)` : "No changes"}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
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

// (useUserFeatureToggles imported at top)

// =============================================================================
// Preset manager
// =============================================================================
function PresetManagerDialog({
  open,
  onClose,
  presets,
  defs,
  modules,
}: {
  open: boolean;
  onClose: () => void;
  presets: FeaturePreset[];
  defs: FeatureDefinition[];
  modules: Array<[string, FeatureDefinition[]]>;
}) {
  const [editing, setEditing] = useState<FeaturePreset | null>(null);
  const [creating, setCreating] = useState(false);
  const upsert = useUpsertPreset();
  const del = useDeletePreset();

  return (
    <>
      <Dialog open={open && !editing && !creating} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Feature Presets</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {presets.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50"
              >
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {p.name}
                    {p.is_default && <Badge variant="secondary">default</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">{p.description ?? "—"}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {Object.values(p.toggles).filter(Boolean).length} of {Object.keys(p.toggles).length} features enabled
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(p)}>
                    Edit
                  </Button>
                  {!p.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => del.mutate(p.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {(editing || creating) && (
        <PresetEditor
          preset={editing}
          defs={defs}
          modules={modules}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSave={async (data) => {
            await upsert.mutateAsync(data);
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </>
  );
}

function PresetEditor({
  preset,
  defs,
  modules,
  onClose,
  onSave,
}: {
  preset: FeaturePreset | null;
  defs: FeatureDefinition[];
  modules: Array<[string, FeatureDefinition[]]>;
  onClose: () => void;
  onSave: (
    data: Partial<FeaturePreset> & { name: string; toggles: Record<string, boolean> },
  ) => Promise<void>;
}) {
  const [name, setName] = useState(preset?.name ?? "");
  const [description, setDescription] = useState(preset?.description ?? "");
  const [toggles, setToggles] = useState<Record<string, boolean>>(
    preset?.toggles ?? Object.fromEntries(defs.map((d) => [d.feature_key, false])),
  );

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{preset ? "Edit preset" : "New preset"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Manager" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <Accordion type="multiple">
            {modules.map(([mod, list]) => (
              <AccordionItem key={mod} value={mod}>
                <AccordionTrigger className="capitalize">{mod}</AccordionTrigger>
                <AccordionContent>
                  {list.map((def) => (
                    <div
                      key={def.feature_key}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div>
                        <div className="text-sm">{def.name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {def.feature_key}
                        </div>
                      </div>
                      <Switch
                        checked={!!toggles[def.feature_key]}
                        onCheckedChange={(v) =>
                          setToggles((prev) => ({ ...prev, [def.feature_key]: v }))
                        }
                      />
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim()}
            onClick={() =>
              onSave({
                id: preset?.id,
                name: name.trim(),
                description: description.trim() || null,
                toggles,
                is_default: preset?.is_default ?? false,
              })
            }
          >
            Save preset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
