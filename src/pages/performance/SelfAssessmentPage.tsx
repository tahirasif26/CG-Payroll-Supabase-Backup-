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
import { useEmployees as useEmployeesCtx } from "@/contexts/EmployeeContext";
import { Search, Filter, Eye } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePerformanceCycles, usePerformanceAssessments, useAssessmentRatings } from "@/hooks/queries/usePerformance";

export default function SelfAssessmentPage() {
  const { employees } = useEmployeesCtx();
  const { data: cycles = [] } = usePerformanceCycles();
  const { data: ratingScale = [] } = useAssessmentRatings();
  const [selectedCycleId, setSelectedCycleId] = useState<string>("");
  const cycleId = selectedCycleId || cycles[0]?.id || "";
  const selectedCycle = cycles.find(c => c.id === cycleId);
  const { data: assessments = [], isLoading } = usePerformanceAssessments({ cycle_id: cycleId || undefined, type: "self" });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewId, setViewId] = useState<string | null>(null);

  const ratingName = useMemo(() => {
    const m = new Map<number, string>();
    ratingScale.forEach(r => m.set(Number(r.value), r.name));
    return (v: number | null | undefined) => v == null ? "—" : (m.get(Number(v)) || String(v));
  }, [ratingScale]);

  const getEmp = (id: string) => employees.find(e => e.id === id);

  const filtered = assessments.filter(a => {
    const emp = getEmp(a.employee_id);
    if (!emp) return false;
    const q = search.toLowerCase();
    const matchSearch = !q || `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    submitted: assessments.filter(a => a.status === "submitted" || a.status === "completed").length,
    inProgress: assessments.filter(a => a.status === "in-progress").length,
    notStarted: assessments.filter(a => a.status === "pending" || a.status === "not-started").length,
  };

  const viewAssessment = assessments.find(a => a.id === viewId);

  return (
    <div className="space-y-6">
      <PageHeader title="Self Assessments" description="Track and review employee self-assessment submissions for the current performance cycle." />

      <div className="flex items-center gap-3">
        <Label className="text-sm font-medium">Cycle:</Label>
        <Select value={cycleId} onValueChange={setSelectedCycleId}>
          <SelectTrigger className="w-[220px] h-9"><SelectValue placeholder="Select cycle" /></SelectTrigger>
          <SelectContent>
            {cycles.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Submitted</p><p className="text-2xl font-bold text-success">{stats.submitted}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">In Progress</p><p className="text-2xl font-bold text-warning">{stats.inProgress}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Pending</p><p className="text-2xl font-bold text-muted-foreground">{stats.notStarted}</p></CardContent></Card>
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
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
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
                <TableHead>Cycle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No self-assessments for this cycle.</TableCell></TableRow>
              )}
              {filtered.map(a => {
                const emp = getEmp(a.employee_id);
                if (!emp) return null;
                const isSubmitted = a.status === "submitted" || a.status === "completed";
                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      <p className="text-sm font-medium">{emp.firstName} {emp.lastName}</p>
                      <p className="text-xs text-muted-foreground">{emp.designation}</p>
                    </TableCell>
                    <TableCell className="text-sm">{emp.department}</TableCell>
                    <TableCell className="text-sm font-mono">{selectedCycle?.name}</TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                        isSubmitted ? "bg-success/10 text-success" :
                        a.status === "in-progress" ? "bg-warning/10 text-warning" :
                        "bg-muted text-muted-foreground"
                      }`}>{a.status}</span>
                    </TableCell>
                    <TableCell className="text-sm">{new Date(a.updated_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setViewId(a.id)}>
                        <Eye className="h-3 w-3 mr-1" />View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      <Dialog open={!!viewAssessment} onOpenChange={open => { if (!open) setViewId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Self Assessment</DialogTitle>
            <DialogDescription>{viewAssessment && (() => { const e = getEmp(viewAssessment.employee_id); return e ? `${e.firstName} ${e.lastName} — ${selectedCycle?.name || ""}` : ""; })()}</DialogDescription>
          </DialogHeader>
          {viewAssessment && (
            <div className="space-y-4">
              {Object.entries(viewAssessment.responses || {}).map(([k, v]) => (
                <div key={k}><p className="text-xs text-muted-foreground font-semibold uppercase mb-1">{k}</p><p className="text-sm">{String(v)}</p></div>
              ))}
              <div><p className="text-xs text-muted-foreground font-semibold uppercase mb-1">Self Rating</p><p className="text-sm font-medium">{ratingName(viewAssessment.rating)}</p></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewId(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
