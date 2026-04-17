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
import { Search, Filter, Plus, Eye, Users } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PeerReview {
  id: string;
  revieweeId: string;
  reviewerId: string;
  cycle: string;
  status: "pending" | "completed";
  collaboration: string;
  communication: string;
  feedback: string;
  rating: string;
}

const mockReviews: PeerReview[] = [
  { id: "1", revieweeId: "1", reviewerId: "3", cycle: "2025-H1", status: "completed", collaboration: "Excellent team player, always willing to help.", communication: "Clear and concise in meetings.", feedback: "Great colleague to work with.", rating: "exceeds" },
  { id: "2", revieweeId: "1", reviewerId: "5", cycle: "2025-H1", status: "pending", collaboration: "", communication: "", feedback: "", rating: "" },
  { id: "3", revieweeId: "2", reviewerId: "8", cycle: "2025-H1", status: "completed", collaboration: "Knowledgeable, provides good guidance.", communication: "Sometimes slow to respond to emails.", feedback: "Overall solid collaborator.", rating: "meets" },
  { id: "4", revieweeId: "4", reviewerId: "2", cycle: "2025-H1", status: "completed", collaboration: "Strong leader, inspires the team.", communication: "Excellent presentation skills.", feedback: "Exceptional leadership qualities.", rating: "outstanding" },
  { id: "5", revieweeId: "8", reviewerId: "1", cycle: "2025-H1", status: "pending", collaboration: "", communication: "", feedback: "", rating: "" },
];

export default function PeerAssessmentPage() {
  const activeEmployees = useActiveEmployees();
  const [reviews, setReviews] = useState(mockReviews);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewReview, setViewReview] = useState<PeerReview | null>(null);
  const [showAssign, setShowAssign] = useState(false);
  const [assignReviewee, setAssignReviewee] = useState("");
  const [assignReviewer, setAssignReviewer] = useState("");
  const { toast } = useToast();

  const getEmp = (id: string) => employees.find(e => e.id === id);

  const filtered = reviews.filter(r => {
    const reviewee = getEmp(r.revieweeId);
    const reviewer = getEmp(r.reviewerId);
    if (!reviewee || !reviewer) return false;
    const q = search.toLowerCase();
    const matchSearch = !q || `${reviewee.firstName} ${reviewee.lastName}`.toLowerCase().includes(q) || `${reviewer.firstName} ${reviewer.lastName}`.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleAssign = () => {
    if (!assignReviewee || !assignReviewer || assignReviewee === assignReviewer) {
      toast({ title: "Invalid", description: "Please select different employees.", variant: "destructive" });
      return;
    }
    setReviews(prev => [...prev, {
      id: String(Date.now()),
      revieweeId: assignReviewee,
      reviewerId: assignReviewer,
      cycle: "2025-H1",
      status: "pending",
      collaboration: "", communication: "", feedback: "", rating: "",
    }]);
    toast({ title: "Assigned", description: "Peer review assignment created." });
    setShowAssign(false);
    setAssignReviewee("");
    setAssignReviewer("");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Peer Assessments" description="Manage and track peer-to-peer performance feedback and reviews.">
        <Button onClick={() => setShowAssign(true)}><Plus className="h-4 w-4 mr-1" />Assign Review</Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Completed</p><p className="text-2xl font-bold text-success">{reviews.filter(r => r.status === "completed").length}</p></CardContent></Card>
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
              {filtered.map(r => {
                const reviewee = getEmp(r.revieweeId);
                const reviewer = getEmp(r.reviewerId);
                if (!reviewee || !reviewer) return null;
                return (
                  <TableRow key={r.id}>
                    <TableCell><p className="text-sm font-medium">{reviewee.firstName} {reviewee.lastName}</p><p className="text-xs text-muted-foreground">{reviewee.department}</p></TableCell>
                    <TableCell><p className="text-sm">{reviewer.firstName} {reviewer.lastName}</p></TableCell>
                    <TableCell className="text-sm font-mono">{r.cycle}</TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${r.status === "completed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                        {r.status === "completed" ? "Completed" : "Pending"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status === "completed" && (
                        <Button size="sm" variant="outline" onClick={() => setViewReview(r)}><Eye className="h-3 w-3 mr-1" />View</Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      <Dialog open={!!viewReview} onOpenChange={open => { if (!open) setViewReview(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Peer Review</DialogTitle>
            <DialogDescription>{viewReview && `${getEmp(viewReview.revieweeId)?.firstName} reviewed by ${getEmp(viewReview.reviewerId)?.firstName}`}</DialogDescription>
          </DialogHeader>
          {viewReview && (
            <div className="space-y-4">
              <div><p className="text-xs text-muted-foreground font-semibold uppercase mb-1">Collaboration</p><p className="text-sm">{viewReview.collaboration}</p></div>
              <div><p className="text-xs text-muted-foreground font-semibold uppercase mb-1">Communication</p><p className="text-sm">{viewReview.communication}</p></div>
              <div><p className="text-xs text-muted-foreground font-semibold uppercase mb-1">Overall Feedback</p><p className="text-sm">{viewReview.feedback}</p></div>
              <div><p className="text-xs text-muted-foreground font-semibold uppercase mb-1">Rating</p><p className="text-sm font-medium capitalize">{viewReview.rating}</p></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewReview(null)}>Close</Button></DialogFooter>
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
            <Button onClick={handleAssign}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
