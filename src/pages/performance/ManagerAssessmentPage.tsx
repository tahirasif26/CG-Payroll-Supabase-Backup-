import { useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeletonRows } from "@/components/LoadingState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEmployees as useEmployeesCtx } from "@/contexts/EmployeeContext";
import { useActiveEmployees } from "@/hooks/useActiveEmployees";
import { Search, Filter, Edit2, Eye, Plus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePerformanceCycles, usePerformanceAssessments, useUpsertPerformanceAssessment, useAssessmentRatings, DBPerformanceAssessment } from "@/hooks/queries/usePerformance";

export default function ManagerAssessmentPage() {
  const { employees } = useEmployeesCtx();
  const activeEmployees = useActiveEmployees();
  const { data: cycles = [] } = usePerformanceCycles();
  const { data: ratingScale = [] } = useAssessmentRatings();
  const [selectedCycleId, setSelectedCycleId] = useState<string>("");
  const cycleId = selectedCycleId || cycles[0]?.id || "";
  const selectedCycle = cycles.find(c => c.id === cycleId);
  const { data: assessments = [], isLoading } = usePerformanceAssessments({ cycle_id: cycleId || undefined, type: "manager" });
  const upsert = useUpsertPerformanceAssessment();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewId, setViewId] = useState<string | null>(null);
  const [editAssessment, setEditAssessment] = useState<DBPerformanceAssessment | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ employee_id: "", performance: "", strengths: "", development: "", goals: "", rating: 0 });

  const sortedRatings = useMemo(() => [...ratingScale].sort((a, b) => Number(b.value) - Number(a.value)), [ratingScale]);

  const getEmp = (id: string | null) => id ? employees.find(e => e.id === id) : undefined;

  const filtered = assessments.filter(a => {
    const emp = getEmp(a.employee_id);
    if (!emp) return false;
    const q = search.toLowerCase();
    const matchSearch = !q || `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openEdit = (a: DBPerformanceAssessment) => {
    setEditAssessment(a);
    const r = a.responses || {};
    setForm({
      employee_id: a.employee_id,
      performance: r.performance || "",
      strengths: r.strengths || "",
      development: r.development || "",
      goals: r.goals || "",
      rating: Number(a.rating) || 0,
    });
  };

  const openCreate = () => {
    setEditAssessment(null);
    setForm({ employee_id: "", performance: "", strengths: "", development: "", goals: "", rating: 0 });
    setCreateOpen(true);
  };

  const handleSave = async () => {
    if (!cycleId || !form.employee_id) return;
    await upsert.mutateAsync({
      id: editAssessment?.id,
      cycle_id: cycleId,
      employee_id: form.employee_id,
      type: "manager",
      status: "submitted",
      rating: form.rating || null,
      responses: {
        performance: form.performance,
        strengths: form.strengths,
        development: form.development,
        goals: form.goals,
      },
    });
    setEditAssessment(null);
    setCreateOpen(false);
  };

  const viewAssessment = assessments.find(a => a.id === viewId);

  return (
    <div className="space-y-6">
      <PageHeader title="Manager Assessments" description="Complete and review performance assessments for direct reports.">
        <Button onClick={openCreate} disabled={!cycleId}><Plus className="h-4 w-4 mr-1" />New Assessment</Button>
      </PageHeader>

      <div className="flex items-center gap-3">
        <Label className="text-sm font-medium">Cycle:</Label>
        <Select value={cycleId} onValueChange={setSelectedCycleId}>
          <SelectTrigger className="w-[220px] h-9"><SelectValue placeholder="Select cycle" /></SelectTrigger>
          <SelectContent>{cycles.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Submitted</p><p className="text-2xl font-bold text-success">{assessments.filter(a => a.status === "submitted" || a.status === "completed").length}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Drafts</p><p className="text-2xl font-bold text-warning">{assessments.filter(a => a.status === "draft" || a.status === "in-progress").length}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Acknowledged</p><p className="text-2xl font-bold text-info">{assessments.filter(a => a.status === "acknowledged").length}</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] h-9"><Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="acknowledged">Acknowledged</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Employee</TableHead>
                <TableHead>Cycle</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableSkeletonRows colSpan={5} />}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No manager assessments yet.</TableCell></TableRow>
              )}
              {filtered.map(a => {
                const emp = getEmp(a.employee_id);
                if (!emp) return null;
                return (
                  <TableRow key={a.id}>
                    <TableCell><p className="text-sm font-medium">{emp.firstName} {emp.lastName}</p><p className="text-xs text-muted-foreground">{emp.designation}</p></TableCell>
                    <TableCell className="text-sm font-mono">{selectedCycle?.name}</TableCell>
                    <TableCell><span className="text-sm font-medium">{a.rating ?? "—"}</span></TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                        a.status === "submitted" || a.status === "completed" ? "bg-success/10 text-success" :
                        a.status === "acknowledged" ? "bg-info/10 text-info" :
                        "bg-warning/10 text-warning"
                      }`}>{a.status}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => setViewId(a.id)}><Eye className="h-3 w-3 mr-1" />View</Button>
                        <Button size="sm" variant="outline" onClick={() => openEdit(a)}><Edit2 className="h-3 w-3 mr-1" />Edit</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      <Dialog open={!!viewAssessment && !editAssessment} onOpenChange={open => { if (!open) setViewId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manager Assessment</DialogTitle>
            <DialogDescription>{viewAssessment && (() => { const e = getEmp(viewAssessment.employee_id); return e ? `${e.firstName} ${e.lastName} — ${selectedCycle?.name || ""}` : ""; })()}</DialogDescription>
          </DialogHeader>
          {viewAssessment && (
            <div className="space-y-4">
              {Object.entries(viewAssessment.responses || {}).map(([k, v]) => (
                <div key={k}><p className="text-xs text-muted-foreground font-semibold uppercase mb-1">{k}</p><p className="text-sm">{String(v)}</p></div>
              ))}
              <div><p className="text-xs text-muted-foreground font-semibold uppercase mb-1">Rating</p><p className="text-sm font-medium">{viewAssessment.rating ?? "—"}</p></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewId(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editAssessment || createOpen} onOpenChange={open => { if (!open) { setEditAssessment(null); setCreateOpen(false); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editAssessment ? "Edit" : "New"} Assessment</DialogTitle>
            <DialogDescription>Provide the manager's evaluation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!editAssessment && (
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={form.employee_id} onValueChange={v => setForm({ ...form, employee_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{activeEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2"><Label>Performance Summary</Label><Textarea value={form.performance} onChange={e => setForm({ ...form, performance: e.target.value })} rows={3} /></div>
            <div className="space-y-2"><Label>Strengths</Label><Input value={form.strengths} onChange={e => setForm({ ...form, strengths: e.target.value })} /></div>
            <div className="space-y-2"><Label>Development Areas</Label><Input value={form.development} onChange={e => setForm({ ...form, development: e.target.value })} /></div>
            <div className="space-y-2"><Label>Goals</Label><Input value={form.goals} onChange={e => setForm({ ...form, goals: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Rating</Label>
              <Select value={String(form.rating || "")} onValueChange={v => setForm({ ...form, rating: Number(v) })}>
                <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
                <SelectContent>
                  {sortedRatings.map(r => <SelectItem key={r.id} value={String(r.value)}>{r.name} ({r.value})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditAssessment(null); setCreateOpen(false); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsert.isPending}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
