import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useRole } from "@/contexts/RoleContext";
import { projects, timesheets, employees } from "@/data/mockData";
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
import { useToast } from "@/hooks/use-toast";

export default function ProjectsPage() {
  const { role, currentEmployeeId } = useRole();
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [logTimeOpen, setLogTimeOpen] = useState(false);
  const { toast } = useToast();

  const handleNewProject = (e: React.FormEvent) => {
    e.preventDefault();
    setNewProjectOpen(false);
    toast({ title: "Project Created", description: "The new project has been created successfully." });
  };

  const handleLogTime = (e: React.FormEvent) => {
    e.preventDefault();
    setLogTimeOpen(false);
    toast({ title: "Time Logged", description: "Your time entry has been submitted." });
  };

  if (role === "employee") {
    const myTimesheets = timesheets.filter(t => t.employeeId === currentEmployeeId);

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
              {myTimesheets.map(ts => {
                const project = projects.find(p => p.id === ts.projectId);
                return (
                  <TableRow key={ts.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">{project?.name || ts.projectId}</TableCell>
                    <TableCell>{ts.weekStarting}</TableCell>
                    <TableCell className="text-right font-semibold">{ts.hours}h</TableCell>
                    <TableCell><StatusBadge status={ts.status} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Log Time Dialog */}
        <Dialog open={logTimeOpen} onOpenChange={setLogTimeOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Time</DialogTitle>
              <DialogDescription>Allocate your working hours to a project.</DialogDescription>
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
                <Button type="button" variant="outline" onClick={() => setLogTimeOpen(false)}>Cancel</Button>
                <Button type="submit">Submit</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Employer view
  const activeProjects = projects.filter(p => p.status === "active").length;
  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);

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
        {projects.map(project => (
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
                <span className="font-medium">{project.client}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Budget</span>
                <span className="font-semibold">SAR {project.budget.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Duration</span>
                <span>{new Date(project.startDate).toLocaleDateString()} — {new Date(project.endDate).toLocaleDateString()}</span>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Completion</span>
                  <span className="font-medium">{project.completion}%</span>
                </div>
                <Progress value={project.completion} className="h-2" />
              </div>
              <div className="flex gap-1 flex-wrap">
                {project.teamMembers.map(memberId => {
                  const emp = employees.find(e => e.id === memberId);
                  return emp ? (
                    <div key={memberId} className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center" title={`${emp.firstName} ${emp.lastName}`}>
                      <span className="text-[9px] font-bold text-secondary-foreground">{emp.firstName[0]}{emp.lastName[0]}</span>
                    </div>
                  ) : null;
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* New Project Dialog */}
      <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>Set up a new project with budget and team details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleNewProject} className="space-y-4">
            <div className="space-y-2">
              <Label>Project Name</Label>
              <Input placeholder="e.g. ACME Corp Audit" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project Code</Label>
                <Input placeholder="PRJ-2025-006" required />
              </div>
              <div className="space-y-2">
                <Label>Client</Label>
                <Input placeholder="Client name" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Budget (SAR)</Label>
              <Input type="number" placeholder="0" required min={1} />
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewProjectOpen(false)}>Cancel</Button>
              <Button type="submit">Create Project</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
