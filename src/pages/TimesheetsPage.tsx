import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useRole } from "@/contexts/RoleContext";
import { timesheets, projects, employees } from "@/data/mockData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function TimesheetsPage() {
  const { role, currentEmployeeId } = useRole();
  const [logOpen, setLogOpen] = useState(false);
  const [approveId, setApproveId] = useState<string | null>(null);
  const { toast } = useToast();

  const displayTimesheets = role === "employee"
    ? timesheets.filter(t => t.employeeId === currentEmployeeId)
    : timesheets;

  const handleLogTime = (e: React.FormEvent) => {
    e.preventDefault();
    setLogOpen(false);
    toast({ title: "Time Logged", description: "Your timesheet entry has been submitted." });
  };

  const handleApprove = () => {
    setApproveId(null);
    toast({ title: "Timesheet Approved", description: "The timesheet has been approved." });
  };

  const approveTs = timesheets.find(t => t.id === approveId);

  return (
    <div className="space-y-6">
      <PageHeader
        title={role === "employee" ? "My Timesheets" : "All Timesheets"}
        description={role === "employee" ? "Log and track your time allocations." : "Review and approve employee timesheets."}
      >
        {role === "employee" && (
          <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={() => setLogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />Log Time
          </Button>
        )}
      </PageHeader>

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {role === "employer" && <TableHead className="font-semibold">Employee</TableHead>}
              <TableHead className="font-semibold">Project</TableHead>
              <TableHead className="font-semibold">Week Starting</TableHead>
              <TableHead className="font-semibold text-right">Hours</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              {role === "employer" && <TableHead className="font-semibold text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayTimesheets.map(ts => {
              const project = projects.find(p => p.id === ts.projectId);
              const emp = employees.find(e => e.id === ts.employeeId);
              return (
                <TableRow key={ts.id} className="hover:bg-muted/30 transition-colors">
                  {role === "employer" && <TableCell className="font-medium">{emp?.firstName} {emp?.lastName}</TableCell>}
                  <TableCell>{project?.name || ts.projectId}</TableCell>
                  <TableCell>{ts.weekStarting}</TableCell>
                  <TableCell className="text-right font-semibold">{ts.hours}h</TableCell>
                  <TableCell><StatusBadge status={ts.status} /></TableCell>
                  {role === "employer" && (
                    <TableCell className="text-right">
                      {ts.status === "submitted" && (
                        <Button variant="outline" size="sm" onClick={() => setApproveId(ts.id)}>Approve</Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Log Time Dialog */}
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Time</DialogTitle>
            <DialogDescription>Record your working hours for a project.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLogTime} className="space-y-4">
            <div className="space-y-2">
              <Label>Project</Label>
              <Select required>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {projects.filter(p => p.status === "active").map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Week Starting</Label>
              <Input type="date" required />
            </div>
            <div className="space-y-2">
              <Label>Hours</Label>
              <Input type="number" placeholder="0" required min={1} max={60} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLogOpen(false)}>Cancel</Button>
              <Button type="submit">Submit</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={!!approveId} onOpenChange={() => setApproveId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Timesheet</DialogTitle>
            <DialogDescription>Confirm you want to approve this timesheet entry.</DialogDescription>
          </DialogHeader>
          {approveTs && (
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Employee:</span> {employees.find(e => e.id === approveTs.employeeId)?.firstName} {employees.find(e => e.id === approveTs.employeeId)?.lastName}</p>
              <p><span className="font-medium">Project:</span> {projects.find(p => p.id === approveTs.projectId)?.name}</p>
              <p><span className="font-medium">Week:</span> {approveTs.weekStarting}</p>
              <p><span className="font-medium">Hours:</span> {approveTs.hours}h</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveId(null)}>Cancel</Button>
            <Button onClick={handleApprove}>Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
