import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { divisions, Division, jobTitles, JobTitle } from "@/data/settingsData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface SimpleDepartment {
  id: string;
  name: string;
  isActive: boolean;
}

const initialDepartments: SimpleDepartment[] = [
  { id: "1", name: "Assurance", isActive: true },
  { id: "2", name: "Tax", isActive: true },
  { id: "3", name: "Advisory", isActive: true },
  { id: "4", name: "Strategy", isActive: true },
  { id: "5", name: "Technology", isActive: true },
];

export default function CompanyStructurePage() {
  const { toast } = useToast();

  // Divisions state
  const [divItems, setDivItems] = useState<Division[]>(divisions);
  const [divDialogOpen, setDivDialogOpen] = useState(false);
  const [divEdit, setDivEdit] = useState<Division | null>(null);
  const [divName, setDivName] = useState("");

  // Departments state
  const [deptItems, setDeptItems] = useState<SimpleDepartment[]>(initialDepartments);
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [deptEdit, setDeptEdit] = useState<SimpleDepartment | null>(null);
  const [deptName, setDeptName] = useState("");

  // Job Titles state
  const [jtItems, setJtItems] = useState<JobTitle[]>(jobTitles);
  const [jtDialogOpen, setJtDialogOpen] = useState(false);
  const [jtEdit, setJtEdit] = useState<JobTitle | null>(null);
  const [jtTitle, setJtTitle] = useState("");
  const [jtLevel, setJtLevel] = useState("Entry");

  // Division handlers
  const openAddDiv = () => { setDivEdit(null); setDivName(""); setDivDialogOpen(true); };
  const openEditDiv = (item: Division) => { setDivEdit(item); setDivName(item.name); setDivDialogOpen(true); };
  const handleDivSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (divEdit) {
      setDivItems(prev => prev.map(i => i.id === divEdit.id ? { ...i, name: divName } : i));
      toast({ title: "Updated" });
    } else {
      setDivItems(prev => [...prev, { id: String(Date.now()), name: divName, isActive: true }]);
      toast({ title: "Added", description: `${divName} division added.` });
    }
    setDivDialogOpen(false);
  };
  const handleDivDelete = (id: string) => { setDivItems(prev => prev.filter(i => i.id !== id)); toast({ title: "Deleted" }); };

  // Department handlers
  const openAddDept = () => { setDeptEdit(null); setDeptName(""); setDeptDialogOpen(true); };
  const openEditDept = (item: SimpleDepartment) => { setDeptEdit(item); setDeptName(item.name); setDeptDialogOpen(true); };
  const handleDeptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (deptEdit) {
      setDeptItems(prev => prev.map(i => i.id === deptEdit.id ? { ...i, name: deptName } : i));
      toast({ title: "Updated" });
    } else {
      setDeptItems(prev => [...prev, { id: String(Date.now()), name: deptName, isActive: true }]);
      toast({ title: "Added", description: `${deptName} department added.` });
    }
    setDeptDialogOpen(false);
  };
  const handleDeptDelete = (id: string) => { setDeptItems(prev => prev.filter(i => i.id !== id)); toast({ title: "Deleted" }); };

  // Job Title handlers
  const openAddJt = () => { setJtEdit(null); setJtTitle(""); setJtLevel("Entry"); setJtDialogOpen(true); };
  const openEditJt = (item: JobTitle) => { setJtEdit(item); setJtTitle(item.title); setJtLevel(item.level); setJtDialogOpen(true); };
  const handleJtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (jtEdit) {
      setJtItems(prev => prev.map(i => i.id === jtEdit.id ? { ...i, title: jtTitle, level: jtLevel } : i));
      toast({ title: "Updated", description: `${jtTitle} updated.` });
    } else {
      setJtItems(prev => [...prev, { id: String(Date.now()), title: jtTitle, level: jtLevel, isActive: true }]);
      toast({ title: "Added", description: `${jtTitle} added.` });
    }
    setJtDialogOpen(false);
  };
  const handleJtDelete = (id: string) => { setJtItems(prev => prev.filter(i => i.id !== id)); toast({ title: "Deleted" }); };

  return (
    <div className="space-y-6">
      <PageHeader title="Company Structure" description="Manage divisions, departments, and job titles." />

      <Tabs defaultValue="divisions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="divisions">Divisions</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="job-titles">Job Titles</TabsTrigger>
        </TabsList>

        {/* Divisions Tab */}
        <TabsContent value="divisions" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={openAddDiv}>
              <Plus className="h-4 w-4 mr-2" />Add Division
            </Button>
          </div>
          <div className="bg-card rounded-xl border overflow-hidden">
            <Table>
              <TableHeader><TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Division</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {divItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell><StatusBadge status={item.isActive ? "active" : "inactive"} /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDiv(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDivDelete(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={openAddDept}>
              <Plus className="h-4 w-4 mr-2" />Add Department
            </Button>
          </div>
          <div className="bg-card rounded-xl border overflow-hidden">
            <Table>
              <TableHeader><TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Department</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {deptItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell><StatusBadge status={item.isActive ? "active" : "inactive"} /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDept(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeptDelete(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Job Titles Tab */}
        <TabsContent value="job-titles" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={openAddJt}>
              <Plus className="h-4 w-4 mr-2" />Add Title
            </Button>
          </div>
          <div className="bg-card rounded-xl border overflow-hidden">
            <Table>
              <TableHeader><TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Title</TableHead>
                <TableHead className="font-semibold">Level</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {jtItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell><Badge variant="outline">{item.level}</Badge></TableCell>
                    <TableCell><StatusBadge status={item.isActive ? "active" : "inactive"} /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditJt(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleJtDelete(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Division Dialog */}
      <Dialog open={divDialogOpen} onOpenChange={setDivDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{divEdit ? "Edit Division" : "Add Division"}</DialogTitle><DialogDescription>Configure division.</DialogDescription></DialogHeader>
          <form onSubmit={handleDivSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={divName} onChange={e => setDivName(e.target.value)} required /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDivDialogOpen(false)}>Cancel</Button><Button type="submit">{divEdit ? "Update" : "Add"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Department Dialog */}
      <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{deptEdit ? "Edit Department" : "Add Department"}</DialogTitle><DialogDescription>Configure department name.</DialogDescription></DialogHeader>
          <form onSubmit={handleDeptSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Department Name</Label><Input value={deptName} onChange={e => setDeptName(e.target.value)} required /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDeptDialogOpen(false)}>Cancel</Button><Button type="submit">{deptEdit ? "Update" : "Add"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Job Title Dialog */}
      <Dialog open={jtDialogOpen} onOpenChange={setJtDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{jtEdit ? "Edit Title" : "Add Title"}</DialogTitle><DialogDescription>Configure a job title.</DialogDescription></DialogHeader>
          <form onSubmit={handleJtSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Title</Label><Input value={jtTitle} onChange={e => setJtTitle(e.target.value)} required /></div>
            <div className="space-y-2"><Label>Level</Label>
              <Select value={jtLevel} onValueChange={setJtLevel}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Leadership">Leadership</SelectItem><SelectItem value="Management">Management</SelectItem><SelectItem value="Professional">Professional</SelectItem><SelectItem value="Entry">Entry</SelectItem></SelectContent>
              </Select>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setJtDialogOpen(false)}>Cancel</Button><Button type="submit">{jtEdit ? "Update" : "Add"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
