import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useEmployees as useEmployeesCtx } from "@/contexts/EmployeeContext";
import { Search, Filter, Edit2, Eye } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ManagerAssessment {
  employeeId: string;
  managerId: string;
  cycle: string;
  status: "draft" | "submitted" | "acknowledged";
  performance: string;
  strengths: string;
  development: string;
  rating: string;
  goals: string;
}

const mockAssessments: ManagerAssessment[] = [
  { employeeId: "1", managerId: "7", cycle: "2025-H1", status: "submitted", performance: "Aisha has consistently delivered high-quality audit work. She demonstrates strong attention to detail and has shown growth in client management skills.", strengths: "Analytical thinking, attention to detail, client rapport.", development: "Take on more leadership roles in team settings.", rating: "exceeds", goals: "Lead 2 audit engagements independently, mentor 1 junior associate." },
  { employeeId: "2", managerId: "7", cycle: "2025-H1", status: "draft", performance: "Omar maintains solid performance in tax advisory.", strengths: "Deep technical expertise.", development: "Delegation and team management.", rating: "meets", goals: "Expand client base by 15%." },
  { employeeId: "3", managerId: "7", cycle: "2025-H1", status: "submitted", performance: "Fatima is developing well as an associate.", strengths: "Quick learner, adaptable.", development: "Needs to improve attention to deadlines.", rating: "meets", goals: "Complete all assigned projects on time." },
  { employeeId: "5", managerId: "7", cycle: "2025-H1", status: "acknowledged", performance: "Sara has shown promising potential as a new hire.", strengths: "Enthusiasm, willingness to learn.", development: "Build technical audit skills.", rating: "meets", goals: "Complete foundational audit training program." },
  { employeeId: "8", managerId: "4", cycle: "2025-H1", status: "submitted", performance: "Tariq continues to drive technology innovation.", strengths: "Technical vision, problem-solving.", development: "Stakeholder communication.", rating: "exceeds", goals: "Deliver new reporting platform." },
];

export default function ManagerAssessmentPage() {
  const { employees } = useEmployeesCtx();
  const [assessments, setAssessments] = useState(mockAssessments);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewAssessment, setViewAssessment] = useState<ManagerAssessment | null>(null);
  const [editAssessment, setEditAssessment] = useState<ManagerAssessment | null>(null);
  const [editData, setEditData] = useState({ performance: "", strengths: "", development: "", rating: "", goals: "" });
  const { toast } = useToast();

  const getEmp = (id: string) => employees.find(e => e.id === id);

  const filtered = assessments.filter(a => {
    const emp = getEmp(a.employeeId);
    if (!emp) return false;
    const q = search.toLowerCase();
    const matchSearch = !q || `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSave = () => {
    if (!editAssessment) return;
    setAssessments(prev => prev.map(a =>
      a.employeeId === editAssessment.employeeId
        ? { ...a, ...editData, status: "submitted" as const }
        : a
    ));
    toast({ title: "Saved", description: "Manager assessment submitted." });
    setEditAssessment(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Manager Assessments" description="Complete and review performance assessments for direct reports." />

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Submitted</p><p className="text-2xl font-bold text-success">{assessments.filter(a => a.status === "submitted").length}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Drafts</p><p className="text-2xl font-bold text-warning">{assessments.filter(a => a.status === "draft").length}</p></CardContent></Card>
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
                <TableHead>Manager</TableHead>
                <TableHead>Cycle</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(a => {
                const emp = getEmp(a.employeeId);
                const mgr = getEmp(a.managerId);
                if (!emp) return null;
                return (
                  <TableRow key={a.employeeId}>
                    <TableCell><p className="text-sm font-medium">{emp.firstName} {emp.lastName}</p><p className="text-xs text-muted-foreground">{emp.designation}</p></TableCell>
                    <TableCell className="text-sm">{mgr ? `${mgr.firstName} ${mgr.lastName}` : "—"}</TableCell>
                    <TableCell className="text-sm font-mono">{a.cycle}</TableCell>
                    <TableCell><span className="text-sm font-medium capitalize">{a.rating || "—"}</span></TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                        a.status === "submitted" ? "bg-success/10 text-success" :
                        a.status === "acknowledged" ? "bg-info/10 text-info" :
                        "bg-warning/10 text-warning"
                      }`}>{a.status.charAt(0).toUpperCase() + a.status.slice(1)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => setViewAssessment(a)}><Eye className="h-3 w-3 mr-1" />View</Button>
                        {a.status === "draft" && (
                          <Button size="sm" variant="outline" onClick={() => { setEditAssessment(a); setEditData({ performance: a.performance, strengths: a.strengths, development: a.development, rating: a.rating, goals: a.goals }); }}>
                            <Edit2 className="h-3 w-3 mr-1" />Edit
                          </Button>
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

      {/* View Dialog */}
      <Dialog open={!!viewAssessment && !editAssessment} onOpenChange={open => { if (!open) setViewAssessment(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manager Assessment</DialogTitle>
            <DialogDescription>{viewAssessment && `${getEmp(viewAssessment.employeeId)?.firstName} ${getEmp(viewAssessment.employeeId)?.lastName} — ${viewAssessment.cycle}`}</DialogDescription>
          </DialogHeader>
          {viewAssessment && (
            <div className="space-y-4">
              <div><p className="text-xs text-muted-foreground font-semibold uppercase mb-1">Performance Summary</p><p className="text-sm">{viewAssessment.performance}</p></div>
              <div><p className="text-xs text-muted-foreground font-semibold uppercase mb-1">Strengths</p><p className="text-sm">{viewAssessment.strengths}</p></div>
              <div><p className="text-xs text-muted-foreground font-semibold uppercase mb-1">Development Areas</p><p className="text-sm">{viewAssessment.development}</p></div>
              <div><p className="text-xs text-muted-foreground font-semibold uppercase mb-1">Goals</p><p className="text-sm">{viewAssessment.goals}</p></div>
              <div><p className="text-xs text-muted-foreground font-semibold uppercase mb-1">Rating</p><p className="text-sm font-medium capitalize">{viewAssessment.rating}</p></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewAssessment(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editAssessment} onOpenChange={open => { if (!open) setEditAssessment(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Assessment</DialogTitle>
            <DialogDescription>{editAssessment && `${getEmp(editAssessment.employeeId)?.firstName} ${getEmp(editAssessment.employeeId)?.lastName}`}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Performance Summary</Label><Textarea value={editData.performance} onChange={e => setEditData({ ...editData, performance: e.target.value })} rows={3} /></div>
            <div className="space-y-2"><Label>Strengths</Label><Input value={editData.strengths} onChange={e => setEditData({ ...editData, strengths: e.target.value })} /></div>
            <div className="space-y-2"><Label>Development Areas</Label><Input value={editData.development} onChange={e => setEditData({ ...editData, development: e.target.value })} /></div>
            <div className="space-y-2"><Label>Goals</Label><Input value={editData.goals} onChange={e => setEditData({ ...editData, goals: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Rating</Label>
              <Select value={editData.rating} onValueChange={v => setEditData({ ...editData, rating: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="outstanding">Outstanding</SelectItem>
                  <SelectItem value="exceeds">Exceeds Expectations</SelectItem>
                  <SelectItem value="meets">Meets Expectations</SelectItem>
                  <SelectItem value="below">Below Expectations</SelectItem>
                  <SelectItem value="unsatisfactory">Unsatisfactory</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAssessment(null)}>Cancel</Button>
            <Button onClick={handleSave}>Submit Assessment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
