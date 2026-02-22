import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useSeparations } from "@/contexts/SeparationContext";
import { usePerformanceCycles, PerformanceCycle } from "@/contexts/PerformanceCycleContext";
import { useToast } from "@/hooks/use-toast";

interface EmployeeRating {
  employeeId: string;
  cycleId: string;
  selfRating: string;
  peerRating: string;
  managerRating: string;
  calibratedRating: string;
  finalRating: string;
}

const ratingColors: Record<string, string> = {
  outstanding: "bg-success/10 text-success",
  exceeds: "bg-info/10 text-info",
  meets: "bg-primary/10 text-primary",
  below: "bg-warning/10 text-warning",
  unsatisfactory: "bg-destructive/10 text-destructive",
};

function RatingBadge({ rating }: { rating: string }) {
  if (!rating) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold capitalize ${ratingColors[rating] || "bg-muted text-muted-foreground"}`}>
      {rating}
    </span>
  );
}

export default function RatingsOverviewPage() {
  const { employees } = useEmployees();
  const { separations } = useSeparations();
  const { cycles, addCycle, updateCycle, deleteCycle } = usePerformanceCycles();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [selectedCycleId, setSelectedCycleId] = useState(cycles[0]?.id || "");
  const [cycleDialogOpen, setCycleDialogOpen] = useState(false);
  const [editCycle, setEditCycle] = useState<PerformanceCycle | null>(null);

  const separatedIds = new Set(separations.filter(s => s.status === "approved").map(s => s.employeeId));
  const activeEmployees = employees.filter(e => !separatedIds.has(e.id) && (e.status === "active" || e.status === "on-leave"));
  const departments = Array.from(new Set(activeEmployees.map(e => e.department)));

  // Mock ratings for selected cycle
  const [mockRatings] = useState<EmployeeRating[]>(() =>
    activeEmployees.slice(0, 6).map((emp, i) => ({
      employeeId: emp.id,
      cycleId: cycles[0]?.id || "1",
      selfRating: i < 4 ? ["exceeds", "meets", "", "outstanding"][i] : "",
      peerRating: i < 4 ? ["exceeds", "meets", "", "outstanding"][i] : "",
      managerRating: i < 5 ? ["exceeds", "meets", "meets", "outstanding", "meets"][i] : "",
      calibratedRating: i < 4 ? ["exceeds", "meets", "below", "exceeds"][i] : "",
      finalRating: i < 4 ? ["exceeds", "meets", "", "exceeds"][i] : "",
    }))
  );

  const selectedCycle = cycles.find(c => c.id === selectedCycleId);
  const cycleRatings = mockRatings.filter(r => r.cycleId === selectedCycleId);

  const filtered = cycleRatings.filter(r => {
    const emp = activeEmployees.find(e => e.id === r.employeeId);
    if (!emp) return false;
    const q = search.toLowerCase();
    const matchSearch = !q || `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q);
    const matchDept = deptFilter === "all" || emp.department === deptFilter;
    return matchSearch && matchDept;
  });

  const distribution = cycleRatings.reduce((acc, r) => {
    if (r.finalRating) acc[r.finalRating] = (acc[r.finalRating] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const openAddCycle = () => {
    setEditCycle({ id: String(Date.now()), name: "", startDate: "", endDate: "", status: "active", createdAt: new Date().toISOString().split("T")[0] });
    setCycleDialogOpen(true);
  };

  const openEditCycle = (c: PerformanceCycle) => {
    setEditCycle({ ...c });
    setCycleDialogOpen(true);
  };

  const handleSaveCycle = () => {
    if (!editCycle || !editCycle.name) return;
    const exists = cycles.find(c => c.id === editCycle.id);
    if (exists) {
      updateCycle(editCycle.id, editCycle);
    } else {
      addCycle(editCycle);
      setSelectedCycleId(editCycle.id);
    }
    setCycleDialogOpen(false);
    toast({ title: "Cycle Saved", description: `Performance cycle "${editCycle.name}" saved.` });
  };

  const handleDeleteCycle = (id: string) => {
    deleteCycle(id);
    if (selectedCycleId === id) setSelectedCycleId(cycles.find(c => c.id !== id)?.id || "");
    toast({ title: "Cycle Deleted" });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Ratings Overview" description="Consolidated view of all performance ratings across assessment types.">
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={openAddCycle}>
          <Plus className="h-4 w-4 mr-2" />New Cycle
        </Button>
      </PageHeader>

      {/* Cycle Selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <Label className="text-sm font-medium">Performance Cycle:</Label>
        <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select cycle" /></SelectTrigger>
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
            <span className="text-xs text-muted-foreground">{selectedCycle.startDate} — {selectedCycle.endDate}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditCycle(selectedCycle)}><Edit2 className="h-3 w-3" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteCycle(selectedCycle.id)}><Trash2 className="h-3 w-3" /></Button>
          </>
        )}
      </div>

      {selectedCycle && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {["outstanding", "exceeds", "meets", "below", "unsatisfactory"].map(r => (
              <Card key={r}>
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground capitalize">{r === "exceeds" ? "Exceeds Exp." : r === "below" ? "Below Exp." : r}</p>
                  <p className="text-2xl font-bold">{distribution[r] || 0}</p>
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
                  {filtered.map(r => {
                    const emp = activeEmployees.find(e => e.id === r.employeeId);
                    if (!emp) return null;
                    return (
                      <TableRow key={r.employeeId}>
                        <TableCell><p className="text-sm font-medium">{emp.firstName} {emp.lastName}</p><p className="text-xs text-muted-foreground">{emp.designation}</p></TableCell>
                        <TableCell className="text-sm">{emp.department}</TableCell>
                        <TableCell><RatingBadge rating={r.selfRating} /></TableCell>
                        <TableCell><RatingBadge rating={r.peerRating} /></TableCell>
                        <TableCell><RatingBadge rating={r.managerRating} /></TableCell>
                        <TableCell><RatingBadge rating={r.calibratedRating} /></TableCell>
                        <TableCell><RatingBadge rating={r.finalRating} /></TableCell>
                      </TableRow>
                    );
                  })}
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

      {/* Cycle Dialog */}
      <Dialog open={cycleDialogOpen} onOpenChange={setCycleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editCycle && cycles.find(c => c.id === editCycle.id) ? "Edit" : "Create"} Performance Cycle</DialogTitle>
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
                  <Input type="date" value={editCycle.startDate} onChange={e => setEditCycle({ ...editCycle, startDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" value={editCycle.endDate} onChange={e => setEditCycle({ ...editCycle, endDate: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editCycle.status} onValueChange={v => setEditCycle({ ...editCycle, status: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
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
