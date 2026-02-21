import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { leaveRequests } from "@/data/mockData";
import { useActiveEmployees } from "@/hooks/useActiveEmployees";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function LeavePage() {
  const activeEmps = useActiveEmployees();
  const activeIds = new Set(activeEmps.map(e => e.id));
  const filteredLeaves = leaveRequests.filter(l => activeIds.has(l.employeeId));
  const [newOpen, setNewOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setNewOpen(false);
    toast({ title: "Leave Request Submitted", description: "Your leave request has been sent for approval." });
  };

  const handleApprove = () => {
    setApproveOpen(false);
    setSelectedLeave(null);
    toast({ title: "Leave Approved", description: "The leave request has been approved." });
  };

  const handleReject = () => {
    setRejectOpen(false);
    setSelectedLeave(null);
    toast({ title: "Leave Rejected", description: "The leave request has been rejected." });
  };

  const selectedLeaveData = filteredLeaves.find(l => l.id === selectedLeave);

  return (
    <div className="space-y-6">
      <PageHeader title="Leave Management" description="Track and approve employee leave requests.">
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />New Request
        </Button>
      </PageHeader>

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Employee</TableHead>
              <TableHead className="font-semibold">Type</TableHead>
              <TableHead className="font-semibold">From</TableHead>
              <TableHead className="font-semibold">To</TableHead>
              <TableHead className="font-semibold">Days</TableHead>
              <TableHead className="font-semibold">Reason</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeaves.map((leave) => (
              <TableRow key={leave.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-medium">{leave.employeeName}</TableCell>
                <TableCell className="capitalize">{leave.type}</TableCell>
                <TableCell>{new Date(leave.startDate).toLocaleDateString()}</TableCell>
                <TableCell>{new Date(leave.endDate).toLocaleDateString()}</TableCell>
                <TableCell className="font-semibold">{leave.days}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{leave.reason}</TableCell>
                <TableCell><StatusBadge status={leave.status} /></TableCell>
                <TableCell>
                  {leave.status === "pending" && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-success hover:bg-success/10" onClick={() => { setSelectedLeave(leave.id); setApproveOpen(true); }}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => { setSelectedLeave(leave.id); setRejectOpen(true); }}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* New Leave Request Dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Leave Request</DialogTitle>
            <DialogDescription>Submit a new leave request for approval.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitRequest} className="space-y-4">
            <div className="space-y-2">
              <Label>Leave Type</Label>
              <Select required>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="sick">Sick</SelectItem>
                  <SelectItem value="compassionate">Compassionate</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" required />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea placeholder="Provide a reason for your leave..." required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
              <Button type="submit">Submit Request</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Leave Request</DialogTitle>
            <DialogDescription>Are you sure you want to approve this leave request?</DialogDescription>
          </DialogHeader>
          {selectedLeaveData && (
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Employee:</span> {selectedLeaveData.employeeName}</p>
              <p><span className="font-medium">Type:</span> {selectedLeaveData.type}</p>
              <p><span className="font-medium">Duration:</span> {selectedLeaveData.days} days ({selectedLeaveData.startDate} to {selectedLeaveData.endDate})</p>
              <p><span className="font-medium">Reason:</span> {selectedLeaveData.reason}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>Cancel</Button>
            <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>Are you sure you want to reject this leave request?</DialogDescription>
          </DialogHeader>
          {selectedLeaveData && (
            <div className="space-y-3 text-sm">
              <p><span className="font-medium">Employee:</span> {selectedLeaveData.employeeName}</p>
              <p><span className="font-medium">Type:</span> {selectedLeaveData.type} · {selectedLeaveData.days} days</p>
              <div className="space-y-2">
                <Label>Rejection Reason</Label>
                <Textarea placeholder="Provide a reason for rejection..." />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
