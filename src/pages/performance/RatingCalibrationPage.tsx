import { useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useEmployees as useEmployeesCtx } from "@/contexts/EmployeeContext";
import { Search, Filter, Edit2, CheckCircle2, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  usePerformanceCycles,
  usePerformanceAssessments,
  usePerformanceCalibrations,
  useUpsertCalibration,
  useAssessmentRatings,
} from "@/hooks/queries/usePerformance";

interface CalibrationRow {
  employeeId: string;
  managerRating: number | null;
  calibratedRating: number | null;
  status: string;
  notes: string;
  calibrationId?: string;
}

export default function RatingCalibrationPage() {
  const { employees } = useEmployeesCtx();
  const { data: cycles = [] } = usePerformanceCycles();
  const { data: ratingScale = [] } = useAssessmentRatings();
  const [selectedCycleId, setSelectedCycleId] = useState<string>("");
  const cycleId = selectedCycleId || cycles[0]?.id || "";
  const { data: managerAssessments = [] } = usePerformanceAssessments({ cycle_id: cycleId || undefined, type: "manager" });
  const { data: calibrations = [], isLoading } = usePerformanceCalibrations(cycleId || undefined);
  const upsertCal = useUpsertCalibration();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editRow, setEditRow] = useState<CalibrationRow | null>(null);
  const [editRating, setEditRating] = useState<number>(0);
  const [editNotes, setEditNotes] = useState("");

  const sortedRatings = useMemo(() => [...ratingScale].sort((a, b) => Number(b.value) - Number(a.value)), [ratingScale]);
  const ratingInfo = (v: number | null) => {
    if (v == null) return { name: "—", color: "bg-muted text-muted-foreground" };
    const r = ratingScale.find(x => Number(x.value) === Number(v));
    return r ? { name: r.name, color: r.color } : { name: String(v), color: "bg-muted text-muted-foreground" };
  };

  // Build rows: union of manager assessments + existing calibrations
  const rows: CalibrationRow[] = useMemo(() => {
    const map = new Map<string, CalibrationRow>();
    managerAssessments.forEach(m => {
      map.set(m.employee_id, {
        employeeId: m.employee_id,
        managerRating: m.rating == null ? null : Number(m.rating),
        calibratedRating: null,
        status: "pending",
        notes: "",
      });
    });
    calibrations.forEach((c: any) => {
      const existing = map.get(c.employee_id) || { employeeId: c.employee_id, managerRating: c.original_rating == null ? null : Number(c.original_rating), calibratedRating: null, status: "pending", notes: "" };
      map.set(c.employee_id, {
        ...existing,
        calibratedRating: c.calibrated_rating == null ? null : Number(c.calibrated_rating),
        status: c.status || "pending",
        notes: c.notes || "",
        calibrationId: c.id,
      });
    });
    return Array.from(map.values());
  }, [managerAssessments, calibrations]);

  const getEmp = (id: string) => employees.find(e => e.id === id);

  const filtered = rows.filter(r => {
    const emp = getEmp(r.employeeId);
    if (!emp) return false;
    const q = search.toLowerCase();
    const matchSearch = !q || `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q) || (emp.department || "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: rows.length,
    pending: rows.filter(r => r.status === "pending").length,
    calibrated: rows.filter(r => r.status === "calibrated").length,
    finalized: rows.filter(r => r.status === "finalized").length,
  };

  const handleSave = async () => {
    if (!editRow || !cycleId) return;
    await upsertCal.mutateAsync({
      id: editRow.calibrationId,
      cycle_id: cycleId,
      employee_id: editRow.employeeId,
      original_rating: editRow.managerRating,
      calibrated_rating: editRating,
      notes: editNotes,
      status: "calibrated",
    });
    setEditRow(null);
  };

  const handleFinalize = async (row: CalibrationRow) => {
    if (!cycleId) return;
    await upsertCal.mutateAsync({
      id: row.calibrationId,
      cycle_id: cycleId,
      employee_id: row.employeeId,
      original_rating: row.managerRating,
      calibrated_rating: row.calibratedRating,
      notes: row.notes,
      status: "finalized",
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Rating Calibration" description="Review and calibrate employee performance ratings for consistency across departments." />

      <div className="flex items-center gap-3">
        <Label className="text-sm font-medium">Cycle:</Label>
        <Select value={cycleId} onValueChange={setSelectedCycleId}>
          <SelectTrigger className="w-[220px] h-9"><SelectValue placeholder="Select cycle" /></SelectTrigger>
          <SelectContent>{cycles.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Pending</p><p className="text-2xl font-bold text-warning">{stats.pending}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Calibrated</p><p className="text-2xl font-bold text-info">{stats.calibrated}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Finalized</p><p className="text-2xl font-bold text-success">{stats.finalized}</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or department..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] h-9"><Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="calibrated">Calibrated</SelectItem>
            <SelectItem value="finalized">Finalized</SelectItem>
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
                <TableHead>Manager Rating</TableHead>
                <TableHead>Calibrated Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No manager ratings to calibrate.</TableCell></TableRow>
              )}
              {filtered.map(row => {
                const emp = getEmp(row.employeeId);
                if (!emp) return null;
                const mInfo = ratingInfo(row.managerRating);
                const cInfo = ratingInfo(row.calibratedRating);
                return (
                  <TableRow key={row.employeeId}>
                    <TableCell>
                      <p className="text-sm font-medium">{emp.firstName} {emp.lastName}</p>
                      <p className="text-xs text-muted-foreground">{emp.designation}</p>
                    </TableCell>
                    <TableCell className="text-sm">{emp.department}</TableCell>
                    <TableCell><span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${mInfo.color}`}>{mInfo.name}</span></TableCell>
                    <TableCell>
                      {row.calibratedRating != null
                        ? <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${cInfo.color}`}>{cInfo.name}</span>
                        : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                        row.status === "finalized" ? "bg-success/10 text-success" :
                        row.status === "calibrated" ? "bg-info/10 text-info" :
                        "bg-warning/10 text-warning"
                      }`}>
                        {row.status === "finalized" ? <CheckCircle2 className="h-3 w-3" /> : row.status === "pending" ? <AlertTriangle className="h-3 w-3" /> : null}
                        {row.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {row.status !== "finalized" && (
                          <Button size="sm" variant="outline" onClick={() => { setEditRow(row); setEditRating(row.calibratedRating ?? row.managerRating ?? 0); setEditNotes(row.notes); }}>
                            <Edit2 className="h-3 w-3 mr-1" />Calibrate
                          </Button>
                        )}
                        {row.status === "calibrated" && (
                          <Button size="sm" onClick={() => handleFinalize(row)} disabled={upsertCal.isPending}>Finalize</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      <Dialog open={!!editRow} onOpenChange={open => { if (!open) setEditRow(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Calibrate Rating</DialogTitle>
            <DialogDescription>{editRow && (() => { const e = getEmp(editRow.employeeId); return e ? `${e.firstName} ${e.lastName}` : ""; })()}</DialogDescription>
          </DialogHeader>
          {editRow && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Manager Rating</p>
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${ratingInfo(editRow.managerRating).color}`}>{ratingInfo(editRow.managerRating).name}</span>
              </div>
              <div className="space-y-2">
                <Label>Calibrated Rating</Label>
                <Select value={String(editRating)} onValueChange={v => setEditRating(Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Select rating..." /></SelectTrigger>
                  <SelectContent>
                    {sortedRatings.map(r => <SelectItem key={r.id} value={String(r.value)}>{r.name} ({r.value})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Calibration Notes</Label>
                <Input value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Reason for calibration adjustment..." />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRow(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsertCal.isPending}>Save Calibration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
