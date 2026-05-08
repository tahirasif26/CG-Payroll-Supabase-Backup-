import { useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useRole } from "@/contexts/RoleContext";
import { useViewScope } from "@/contexts/ViewScopeContext";
import { useTimesheets, useCreateTimesheet, useApproveTimesheet } from "@/hooks/queries/useTimesheets";
import { useProjects } from "@/hooks/queries/useProjects";
import { useEmployees } from "@/hooks/queries/useEmployees";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TimesheetsPage() {
  const { role, currentEmployeeId } = useRole();
  const { scope } = useViewScope();
  const [logOpen, setLogOpen] = useState(false);
  const [approveId, setApproveId] = useState<string | null>(null);

  const { data: projects = [] } = useProjects();
  const { data: employees = [] } = useEmployees({ status: "active" });
  const myEmployee = useMemo(
    () => employees.find((e: any) => e.id === currentEmployeeId || e.user_id === currentEmployeeId),
    [employees, currentEmployeeId]
  );

  // Me scope (or employee role) → only fetch own timesheets.
  const isMeScope = scope === "me" || role === "employee";
  const { data: allTimesheets = [] } = useTimesheets(
    isMeScope && myEmployee ? { employee_id: myEmployee.id } : undefined
  );
  const createTimesheet = useCreateTimesheet();
  const approveTimesheet = useApproveTimesheet();

  // People scope: filter to active employees only.
  const displayTimesheets = isMeScope
    ? allTimesheets
    : allTimesheets.filter((t: any) => t.employees?.status === "active");

  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myEmployee) return;
    const f = e.target as any;
    await createTimesheet.mutateAsync({
      employee_id: myEmployee.id,
      project_id: f.project.value,
      week_starting: f.week.value,
      hours: Number(f.hours.value),
      status: "submitted",
      submitted_at: new Date().toISOString(),
    });
    setLogOpen(false);
  };

  const handleApprove = async () => {
    if (!approveId) return;
    await approveTimesheet.mutateAsync(approveId);
    setApproveId(null);
  };

  const approveTs = displayTimesheets.find((t: any) => t.id === approveId);

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
            {displayTimesheets.map((ts: any) => (
              <TableRow key={ts.id} className="hover:bg-muted/30 transition-colors">
                {role === "employer" && (
                  <TableCell className="font-medium">{ts.employees?.first_name} {ts.employees?.last_name}</TableCell>
                )}
                <TableCell>{ts.projects?.name || "—"}</TableCell>
                <TableCell>{ts.week_starting}</TableCell>
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
            ))}
            {displayTimesheets.length === 0 && (
              <TableRow>
                <TableCell colSpan={role === "employer" ? 6 : 4} className="text-center text-muted-foreground py-8">
                  No timesheets yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Time</DialogTitle>
            <DialogDescription>Record your working hours for a project.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLogTime} className="space-y-4">
            <div className="space-y-2">
              <Label>Project</Label>
              <Select name="project" required>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {projects.filter((p: any) => p.status === "active").map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Week Starting</Label><Input name="week" type="date" required /></div>
            <div className="space-y-2"><Label>Hours</Label><Input name="hours" type="number" placeholder="0" required min={1} max={60} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createTimesheet.isPending}>Submit</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!approveId} onOpenChange={() => setApproveId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Timesheet</DialogTitle>
            <DialogDescription>Confirm you want to approve this timesheet entry.</DialogDescription>
          </DialogHeader>
          {approveTs && (
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Employee:</span> {approveTs.employees?.first_name} {approveTs.employees?.last_name}</p>
              <p><span className="font-medium">Project:</span> {approveTs.projects?.name}</p>
              <p><span className="font-medium">Week:</span> {approveTs.week_starting}</p>
              <p><span className="font-medium">Hours:</span> {approveTs.hours}h</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveId(null)}>Cancel</Button>
            <Button onClick={handleApprove} disabled={approveTimesheet.isPending}>Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
