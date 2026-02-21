import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { employees } from "@/data/mockData";
import { Search, Filter, Eye, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SelfAssessment {
  employeeId: string;
  cycle: string;
  status: "not-started" | "in-progress" | "submitted";
  submittedDate: string;
  strengths: string;
  improvements: string;
  goals: string;
  selfRating: string;
}

const mockAssessments: SelfAssessment[] = [
  { employeeId: "1", cycle: "2025-H1", status: "submitted", submittedDate: "2025-02-10", strengths: "Strong analytical skills, excellent client communication.", improvements: "Need to improve time management on multiple engagements.", goals: "Complete CPA certification, lead 2 audit engagements.", selfRating: "exceeds" },
  { employeeId: "2", cycle: "2025-H1", status: "submitted", submittedDate: "2025-02-08", strengths: "Deep tax knowledge, mentoring junior staff.", improvements: "Could delegate more effectively.", goals: "Expand advisory services to 3 new clients.", selfRating: "meets" },
  { employeeId: "3", cycle: "2025-H1", status: "in-progress", submittedDate: "", strengths: "", improvements: "", goals: "", selfRating: "" },
  { employeeId: "4", cycle: "2025-H1", status: "submitted", submittedDate: "2025-02-12", strengths: "Strategic thinking, strong client relationships.", improvements: "Work-life balance, documentation quality.", goals: "Launch new consulting practice area.", selfRating: "outstanding" },
  { employeeId: "5", cycle: "2025-H1", status: "not-started", submittedDate: "", strengths: "", improvements: "", goals: "", selfRating: "" },
  { employeeId: "8", cycle: "2025-H1", status: "in-progress", submittedDate: "", strengths: "Technical innovation.", improvements: "", goals: "", selfRating: "" },
];

export default function SelfAssessmentPage() {
  const [assessments] = useState(mockAssessments);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewAssessment, setViewAssessment] = useState<SelfAssessment | null>(null);
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

  const stats = {
    submitted: assessments.filter(a => a.status === "submitted").length,
    inProgress: assessments.filter(a => a.status === "in-progress").length,
    notStarted: assessments.filter(a => a.status === "not-started").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Self Assessments" description="Track and review employee self-assessment submissions for the current performance cycle." />

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Submitted</p><p className="text-2xl font-bold text-success">{stats.submitted}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">In Progress</p><p className="text-2xl font-bold text-warning">{stats.inProgress}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Not Started</p><p className="text-2xl font-bold text-muted-foreground">{stats.notStarted}</p></CardContent></Card>
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
            <SelectItem value="not-started">Not Started</SelectItem>
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
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(a => {
                const emp = getEmp(a.employeeId);
                if (!emp) return null;
                return (
                  <TableRow key={a.employeeId}>
                    <TableCell>
                      <p className="text-sm font-medium">{emp.firstName} {emp.lastName}</p>
                      <p className="text-xs text-muted-foreground">{emp.designation}</p>
                    </TableCell>
                    <TableCell className="text-sm">{emp.department}</TableCell>
                    <TableCell className="text-sm font-mono">{a.cycle}</TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                        a.status === "submitted" ? "bg-success/10 text-success" :
                        a.status === "in-progress" ? "bg-warning/10 text-warning" :
                        "bg-muted text-muted-foreground"
                      }`}>{a.status === "not-started" ? "Not Started" : a.status === "in-progress" ? "In Progress" : "Submitted"}</span>
                    </TableCell>
                    <TableCell className="text-sm">{a.submittedDate || "—"}</TableCell>
                    <TableCell className="text-right">
                      {a.status === "submitted" && (
                        <Button size="sm" variant="outline" onClick={() => setViewAssessment(a)}>
                          <Eye className="h-3 w-3 mr-1" />View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      <Dialog open={!!viewAssessment} onOpenChange={open => { if (!open) setViewAssessment(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Self Assessment</DialogTitle>
            <DialogDescription>{viewAssessment && `${getEmp(viewAssessment.employeeId)?.firstName} ${getEmp(viewAssessment.employeeId)?.lastName} — ${viewAssessment.cycle}`}</DialogDescription>
          </DialogHeader>
          {viewAssessment && (
            <div className="space-y-4">
              <div><p className="text-xs text-muted-foreground font-semibold uppercase mb-1">Strengths</p><p className="text-sm">{viewAssessment.strengths}</p></div>
              <div><p className="text-xs text-muted-foreground font-semibold uppercase mb-1">Areas for Improvement</p><p className="text-sm">{viewAssessment.improvements}</p></div>
              <div><p className="text-xs text-muted-foreground font-semibold uppercase mb-1">Goals</p><p className="text-sm">{viewAssessment.goals}</p></div>
              <div><p className="text-xs text-muted-foreground font-semibold uppercase mb-1">Self Rating</p><p className="text-sm font-medium capitalize">{viewAssessment.selfRating}</p></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewAssessment(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
