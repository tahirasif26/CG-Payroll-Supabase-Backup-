import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useEmployees as useEmployeesCtx } from "@/contexts/EmployeeContext";
import { useActiveEmployees } from "@/hooks/useActiveEmployees";
import { Search, Filter, Plus, Eye } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePerformanceCycles, usePerformanceAssessments, useUpsertPerformanceAssessment } from "@/hooks/queries/usePerformance";

export default function PeerAssessmentPage() {
  const { employees } = useEmployeesCtx();
  const activeEmployees = useActiveEmployees();
  const { data: cycles = [] } = usePerformanceCycles();
  const [selectedCycleId, setSelectedCycleId] = useState<string>("");
  const cycleId = selectedCycleId || cycles[0]?.id || "";
  const selectedCycle = cycles.find(c => c.id === cycleId);
  const { data: reviews = [], isLoading } = usePerformanceAssessments({ cycle_id: cycleId || undefined, type: "peer" });
  const upsert = useUpsertPerformanceAssessment();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewId, setViewId] = useState<string | null>(null);
  const [showAssign, setShowAssign] = useState(false);
  const [assignReviewee, setAssignReviewee] = useState("");
  const [assignReviewer, setAssignReviewer] = useState("");

  const getEmp = (id: string | null) => id ? employees.find(e => e.id === id) : undefined;

  const filtered = reviews.filter(r => {
    const reviewee = getEmp(r.employee_id);
    const reviewer = getEmp(r.reviewer_id);
    if (!reviewee) return false;
    const q = search.toLowerCase();
    const matchSearch = !q || `${reviewee.firstName} ${reviewee.lastName}`.toLowerCase().includes(q) || (reviewer && `${reviewer.firstName} ${reviewer.lastName}`.toLowerCase().includes(q));
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleAssign = async () => {
    if (!assignReviewee || !assignReviewer || assignReviewee === assignReviewer || !cycleId) {
      toast({ title: "Invalid", description: "Pick reviewee, reviewer (different) and a cycle.", variant: "destructive" });
      return;
    }
    await upsert.mutateAsync({
      cycle_id: cycleId,
      employee_id: assignReviewee,
      reviewer_id: assignReviewer,
      type: "peer",
      status: "pending",
      responses: {},
    });
    setShowAssign(false);
    setAssignReviewee("");
    setAssignReviewer("");
  };

  const viewReview = reviews.find(r => r.id === viewId);

  return (
    <div className="space-y-6">
      <PageHeader title="Peer Assessments" description="Manage and track peer-to-peer performance feedback and reviews.">
        <Button onClick={() => setShowAssign(true)} disabled={!cycleId}><Plus className="h-4 w-4 mr-1" />Assign Review</Button>
      </PageHeader>

      <div className="flex items-center gap-3">
        <Label className="text-sm font-medium">Cycle:</Label>
        <Select value={cycleId} onValueChange={setSelectedCycleId}>
          <SelectTrigger className="w-[220px] h-9"><SelectValue placeholder="Select cycle" /></SelectTrigger>
          <SelectContent>{cycles.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Completed</p><p className="text-2xl font-bold text-success">{reviews.filter(r => r.status === "completed" || r.status === "submitted").length}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Pending</p><p className="text-2xl font-bold text-warning">{reviews.filter(r => r.status === "pending").length}</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by employee name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-9"><Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Reviewee</TableHead>
                <TableHead>Reviewer</TableHead>
                <TableHead>Cycle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No peer reviews assigned.</TableCell></TableRow>
              )}
              {filtered.map(r => {
                const reviewee = getEmp(r.employee_id);
                const reviewer = getEmp(r.reviewer_id);
                if (!reviewee) return null;
                const done = r.status === "completed" || r.status === "submitted";
                return (
                  <TableRow key={r.id}>
                    <TableCell><p className="text-sm font-medium">{reviewee.firstName} {reviewee.lastName}</p><p className="text-xs text-muted-foreground">{reviewee.department}</p></TableCell>
                    <TableCell><p className="text-sm">{reviewer ? `${reviewer.firstName} ${reviewer.lastName}` : "—"}</p></TableCell>
                    <TableCell className="text-sm font-mono">{selectedCycle?.name}</TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${done ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                        {r.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setViewId(r.id)}><Eye className="h-3 w-3 mr-1" />View</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      <Dialog open={!!viewReview} onOpenChange={open => { if (!open) setViewId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Peer Review</DialogTitle>
            <DialogDescription>{viewReview && (() => { const re = getEmp(viewReview.employee_id); const rr = getEmp(viewReview.reviewer_id); return re && rr ? `${re.firstName} reviewed by ${rr.firstName}` : ""; })()}</DialogDescription>
          </DialogHeader>
          {viewReview && (
            <div className="space-y-4">
              {Object.entries(viewReview.responses || {}).map(([k, v]) => (
                <div key={k}><p className="text-xs text-muted-foreground font-semibold uppercase mb-1">{k}</p><p className="text-sm">{String(v)}</p></div>
              ))}
              <div><p className="text-xs text-muted-foreground font-semibold uppercase mb-1">Rating</p><p className="text-sm font-medium">{viewReview.rating ?? "—"}</p></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewId(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Peer Review</DialogTitle>
            <DialogDescription>Select who should be reviewed and by whom.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reviewee</Label>
              <Select value={assignReviewee} onValueChange={setAssignReviewee}>
                <SelectTrigger><SelectValue placeholder="Select employee..." /></SelectTrigger>
                <SelectContent>{activeEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reviewer</Label>
              <Select value={assignReviewer} onValueChange={setAssignReviewer}>
                <SelectTrigger><SelectValue placeholder="Select peer..." /></SelectTrigger>
                <SelectContent>{activeEmployees.filter(e => e.id !== assignReviewee).map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssign(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={upsert.isPending}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
