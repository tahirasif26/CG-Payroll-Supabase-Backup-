import { useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useRole } from "@/contexts/RoleContext";
import { useProjects, useCreateProject } from "@/hooks/queries/useProjects";
import { useTimesheets, useCreateTimesheet } from "@/hooks/queries/useTimesheets";
import { useEmployees } from "@/hooks/queries/useEmployees";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, FolderKanban, Clock, Users } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ProjectsPage() {
  const { role, currentEmployeeId } = useRole();
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [logTimeOpen, setLogTimeOpen] = useState(false);

  const { data: projects = [] } = useProjects();
  const { data: employees = [] } = useEmployees({ status: "active" });
  const createProject = useCreateProject();
  const createTimesheet = useCreateTimesheet();

  // Find current employee row by user/profile linkage
  const myEmployee = useMemo(
    () => employees.find((e: any) => e.id === currentEmployeeId || e.user_id === currentEmployeeId),
    [employees, currentEmployeeId]
  );
  const { data: myTimesheets = [] } = useTimesheets(
    role === "employee" && myEmployee ? { employee_id: myEmployee.id } : undefined
  );

  const handleNewProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const f = e.target as any;
    await createProject.mutateAsync({
      name: f.name.value,
      code: f.code.value,
      client_name: f.client.value,
      budget: Number(f.budget.value) * 100,
      start_date: f.start.value,
      end_date: f.end.value,
      status: "active",
      completion: 0,
    });
    setNewProjectOpen(false);
  };

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
    setLogTimeOpen(false);
  };

  if (role === "employee") {
    return (
      <div className="space-y-6">
        <PageHeader title="My Timesheets" description="Allocate your time to projects.">
          <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={() => setLogTimeOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />Log Time
          </Button>
        </PageHeader>

        <div className="bg-card rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Project</TableHead>
                <TableHead className="font-semibold">Week</TableHead>
                <TableHead className="font-semibold text-right">Hours</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myTimesheets.map((ts: any) => (
                <TableRow key={ts.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">{ts.projects?.name || "—"}</TableCell>
                  <TableCell>{ts.week_starting}</TableCell>
                  <TableCell className="text-right font-semibold">{ts.hours}h</TableCell>
                  <TableCell><StatusBadge status={ts.status} /></TableCell>
                </TableRow>
              ))}
              {myTimesheets.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No entries yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={logTimeOpen} onOpenChange={setLogTimeOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Time</DialogTitle>
              <DialogDescription>Allocate your working hours to a project.</DialogDescription>
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
                <Button type="button" variant="outline" onClick={() => setLogTimeOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createTimesheet.isPending}>Submit</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const activeProjects = projects.filter((p: any) => p.status === "active").length;
  const totalBudget = projects.reduce((s: number, p: any) => s + (p.budget ?? 0), 0) / 100;

  return (
    <div className="space-y-6">
      <PageHeader title="Project Management" description="Manage projects, budgets, and resource allocation.">
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={() => setNewProjectOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />New Project
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Projects" value={projects.length} icon={FolderKanban} variant="primary" />
        <StatCard title="Active Projects" value={activeProjects} icon={Clock} variant="success" />
        <StatCard title="Total Budget" value={`SAR ${totalBudget.toLocaleString()}`} icon={Users} variant="info" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {projects.map((project: any) => (
          <Card key={project.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">{project.name}</CardTitle>
                <StatusBadge status={project.status} />
              </div>
              <p className="text-xs text-muted-foreground font-mono">{project.code}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Client</span>
                <span className="font-medium">{project.client_name || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Budget</span>
                <span className="font-semibold">SAR {((project.budget ?? 0) / 100).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Duration</span>
                <span>{project.start_date ? new Date(project.start_date).toLocaleDateString() : "—"} — {project.end_date ? new Date(project.end_date).toLocaleDateString() : "—"}</span>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Completion</span>
                  <span className="font-medium">{Number(project.completion ?? 0)}%</span>
                </div>
                <Progress value={Number(project.completion ?? 0)} className="h-2" />
              </div>
            </CardContent>
          </Card>
        ))}
        {projects.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-2 text-center py-12">No projects yet. Click "New Project" to get started.</p>
        )}
      </div>

      <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>Set up a new project with budget and team details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleNewProject} className="space-y-4">
            <div className="space-y-2"><Label>Project Name</Label><Input name="name" placeholder="e.g. ACME Corp Audit" required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Project Code</Label><Input name="code" placeholder="PRJ-2025-006" required /></div>
              <div className="space-y-2"><Label>Client</Label><Input name="client" placeholder="Client name" required /></div>
            </div>
            <div className="space-y-2"><Label>Budget (SAR)</Label><Input name="budget" type="number" placeholder="0" required min={1} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Start Date</Label><Input name="start" type="date" required /></div>
              <div className="space-y-2"><Label>End Date</Label><Input name="end" type="date" required /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewProjectOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createProject.isPending}>Create Project</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
