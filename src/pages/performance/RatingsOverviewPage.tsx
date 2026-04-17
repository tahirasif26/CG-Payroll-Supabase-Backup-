import { useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Plus, Edit2, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEmployees } from "@/contexts/EmployeeContext";
import {
  usePerformanceCycles,
  useCreatePerformanceCycle,
  useUpdatePerformanceCycle,
  useDeletePerformanceCycle,
  usePerformanceAssessments,
  usePerformanceCalibrations,
  useAssessmentRatings,
  DBPerformanceCycle,
} from "@/hooks/queries/usePerformance";

interface CycleForm {
  id?: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
}

export default function RatingsOverviewPage() {
  const { employees } = useEmployees();
  const { data: cycles = [] } = usePerformanceCycles();
  const { data: ratingScale = [] } = useAssessmentRatings();
  const createCycle = useCreatePerformanceCycle();
  const updateCycle = useUpdatePerformanceCycle();
  const deleteCycle = useDeletePerformanceCycle();

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [selectedCycleId, setSelectedCycleId] = useState<string>("");
  const [cycleDialogOpen, setCycleDialogOpen] = useState(false);
  const [editCycle, setEditCycle] = useState<CycleForm | null>(null);

  const cycleId = selectedCycleId || cycles[0]?.id || "";
  const selectedCycle = cycles.find(c => c.id === cycleId);

  const { data: assessments = [] } = usePerformanceAssessments({ cycle_id: cycleId || undefined });
  const { data: calibrations = [] } = usePerformanceCalibrations(cycleId || undefined);

  const departments = Array.from(new Set(employees.map(e => e.department).filter(Boolean)));

  // Build per-employee ratings map
  const ratingByName = useMemo(() => {
    const m = new Map<number, { name: string; color: string }>();
    ratingScale.forEach(r => m.set(Number(r.value), { name: r.name, color: r.color }));
    return m;
  }, [ratingScale]);

  const labelFor = (v: number | null | undefined) => {
    if (v == null) return null;
    return ratingByName.get(Number(v)) || { name: String(v), color: "bg-muted text-muted-foreground" };
  };

  const empIds = useMemo(() => {
    const set = new Set<string>();
    assessments.forEach(a => set.add(a.employee_id));
    calibrations.forEach((c: any) => set.add(c.employee_id));
    return Array.from(set);
  }, [assessments, calibrations]);

  const rows = useMemo(() => empIds.map(empId => {
    const emp = employees.find(e => e.id === empId);
    const self = assessments.find(a => a.employee_id === empId && a.type === "self");
    const peers = assessments.filter(a => a.employee_id === empId && a.type === "peer");
    const manager = assessments.find(a => a.employee_id === empId && a.type === "manager");
    const calibration = calibrations.find((c: any) => c.employee_id === empId);
    const peerAvg = peers.length ? peers.reduce((s, p) => s + (Number(p.rating) || 0), 0) / peers.length : null;
    return {
      empId,
      emp,
      selfRating: self?.rating ?? null,
      peerRating: peerAvg,
      managerRating: manager?.rating ?? null,
      calibratedRating: calibration?.calibrated_rating ?? null,
      finalRating: calibration?.calibrated_rating ?? manager?.rating ?? null,
    };
  }).filter(r => r.emp), [empIds, employees, assessments, calibrations]);

  const filtered = rows.filter(r => {
    if (!r.emp) return false;
    const q = search.toLowerCase();
    const matchSearch = !q || `${r.emp.firstName} ${r.emp.lastName}`.toLowerCase().includes(q);
    const matchDept = deptFilter === "all" || r.emp.department === deptFilter;
    return matchSearch && matchDept;
  });

  const distribution = rows.reduce((acc, r) => {
    if (r.finalRating != null) {
      const v = Number(r.finalRating);
      acc[v] = (acc[v] || 0) + 1;
    }
    return acc;
  }, {} as Record<number, number>);

  const openAddCycle = () => {
    setEditCycle({ name: "", start_date: "", end_date: "", status: "active" });
    setCycleDialogOpen(true);
  };

  const openEditCycle = (c: DBPerformanceCycle) => {
    setEditCycle({ id: c.id, name: c.name, start_date: c.start_date, end_date: c.end_date, status: c.status });
    setCycleDialogOpen(true);
  };

  const handleSaveCycle = async () => {
    if (!editCycle?.name || !editCycle.start_date || !editCycle.end_date) return;
    if (editCycle.id) {
      await updateCycle.mutateAsync({ id: editCycle.id, name: editCycle.name, start_date: editCycle.start_date, end_date: editCycle.end_date, status: editCycle.status });
    } else {
      const created = await createCycle.mutateAsync({ name: editCycle.name, start_date: editCycle.start_date, end_date: editCycle.end_date, status: editCycle.status });
      setSelectedCycleId(created.id);
    }
    setCycleDialogOpen(false);
  };

  const handleDeleteCycle = async (id: string) => {
    await deleteCycle.mutateAsync(id);
    if (selectedCycleId === id) setSelectedCycleId("");
  };

  const sortedRatingScale = [...ratingScale].sort((a, b) => Number(b.value) - Number(a.value));

  return (
    <div className="space-y-6">
      <PageHeader title="Ratings Overview" description="Consolidated view of all performance ratings across assessment types.">
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={openAddCycle}>
          <Plus className="h-4 w-4 mr-2" />New Cycle
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3 flex-wrap">
        <Label className="text-sm font-medium">Performance Cycle:</Label>
        <Select value={cycleId} onValueChange={setSelectedCycleId}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Select cycle" /></SelectTrigger>
          <SelectContent>
            {cycles.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} {c.status === "active" && <span className="text-xs text-primary">(Active)</span>}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedCycle && (
          <>
            <Badge variant={selectedCycle.status === "active" ? "default" : "secondary"}>{selectedCycle.status}</Badge>
            <span className="text-xs text-muted-foreground">{selectedCycle.start_date} — {selectedCycle.end_date}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditCycle(selectedCycle)}><Edit2 className="h-3 w-3" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteCycle(selectedCycle.id)}><Trash2 className="h-3 w-3" /></Button>
          </>
        )}
      </div>

      {selectedCycle && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {sortedRatingScale.map(r => (
              <Card key={r.id}>
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground">{r.name}</p>
                  <p className="text-2xl font-bold">{distribution[Number(r.value)] || 0}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-[160px] h-9"><Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Self</TableHead>
                    <TableHead>Peer</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Calibrated</TableHead>
                    <TableHead>Final</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => (
                    <TableRow key={r.empId}>
                      <TableCell><p className="text-sm font-medium">{r.emp!.firstName} {r.emp!.lastName}</p><p className="text-xs text-muted-foreground">{r.emp!.designation}</p></TableCell>
                      <TableCell className="text-sm">{r.emp!.department}</TableCell>
                      <TableCell><RatingPill v={r.selfRating} labelFor={labelFor} /></TableCell>
                      <TableCell><RatingPill v={r.peerRating} labelFor={labelFor} /></TableCell>
                      <TableCell><RatingPill v={r.managerRating} labelFor={labelFor} /></TableCell>
                      <TableCell><RatingPill v={r.calibratedRating} labelFor={labelFor} /></TableCell>
                      <TableCell><RatingPill v={r.finalRating} labelFor={labelFor} /></TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No ratings for this cycle yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </>
      )}

      {!selectedCycle && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No performance cycle selected. Create one to get started.</CardContent></Card>
      )}

      <Dialog open={cycleDialogOpen} onOpenChange={setCycleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editCycle?.id ? "Edit" : "Create"} Performance Cycle</DialogTitle>
            <DialogDescription>Define the performance review cycle period.</DialogDescription>
          </DialogHeader>
          {editCycle && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Cycle Name</Label>
                <Input value={editCycle.name} onChange={e => setEditCycle({ ...editCycle, name: e.target.value })} placeholder="e.g. 2025-H1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={editCycle.start_date} onChange={e => setEditCycle({ ...editCycle, start_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" value={editCycle.end_date} onChange={e => setEditCycle({ ...editCycle, end_date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editCycle.status} onValueChange={v => setEditCycle({ ...editCycle, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCycleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCycle}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RatingPill({ v, labelFor }: { v: number | null | undefined; labelFor: (v: number | null | undefined) => { name: string; color: string } | null }) {
  const info = labelFor(v);
  if (!info) return <span className="text-xs text-muted-foreground">—</span>;
  return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${info.color}`}>{info.name}</span>;
}
