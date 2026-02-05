import { PageHeader } from "@/components/PageHeader";
import { useRole } from "@/contexts/RoleContext";
import { timesheets, projects, employees } from "@/data/mockData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

export default function TimesheetsPage() {
  const { role, currentEmployeeId } = useRole();

  const displayTimesheets = role === "employee"
    ? timesheets.filter(t => t.employeeId === currentEmployeeId)
    : timesheets;

  return (
    <div className="space-y-6">
      <PageHeader
        title={role === "employee" ? "My Timesheets" : "All Timesheets"}
        description={role === "employee" ? "Log and track your time allocations." : "Review and approve employee timesheets."}
      >
        {role === "employee" && (
          <Button size="sm" className="gradient-ey text-primary-foreground font-semibold">
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
                        <Button variant="outline" size="sm">Approve</Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
