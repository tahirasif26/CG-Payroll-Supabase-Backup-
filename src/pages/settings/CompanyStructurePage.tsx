import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import type { JobTitle } from "@/data/settingsData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useEmployeeTypes } from "@/contexts/EmployeeTypeContext";
import {
  useDivisions, useCreateDivision, useUpdateDivision, useDeleteDivision,
  useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment,
  useDesignations, useCreateDesignation, useUpdateDesignation, useDeleteDesignation,
} from "@/api";

const LEVEL_TO_NAME: Record<number, string> = { 4: "Leadership", 3: "Management", 2: "Professional", 1: "Entry" };
const NAME_TO_LEVEL: Record<string, number> = { Leadership: 4, Management: 3, Professional: 2, Entry: 1 };

/** Read an API error's `error.message` / fallback to `.message`. */
function describeError(err: unknown, fallback: string): string {
  return (
    (err as { error?: { message?: string } })?.error?.message ??
    (err as { message?: string })?.message ??
    fallback
  );
}

export default function CompanyStructurePage() {
  const { toast } = useToast();
  const { employeeTypes, addEmployeeType, updateEmployeeType, deleteEmployeeType } = useEmployeeTypes();

  // ─── Data ────────────────────────────────────────────────────────────────
  const { data: divisions = [] } = useDivisions();
  const { data: departments = [] } = useDepartments();
  const { data: designations = [] } = useDesignations();

  const createDivMut = useCreateDivision();
  const updateDivMut = useUpdateDivision();
  const deleteDivMut = useDeleteDivision();

  const createDeptMut = useCreateDepartment();
  const updateDeptMut = useUpdateDepartment();
  const deleteDeptMut = useDeleteDepartment();

  const createDesigMut = useCreateDesignation();
  const updateDesigMut = useUpdateDesignation();
  const deleteDesigMut = useDeleteDesignation();

  // ─── Division dialog ─────────────────────────────────────────────────────
  type DivisionItem = { id: string; name: string; isActive: boolean };
  const [divDialogOpen, setDivDialogOpen] = useState(false);
  const [divEdit, setDivEdit] = useState<DivisionItem | null>(null);
  const [divName, setDivName] = useState("");
  const openAddDiv = () => { setDivEdit(null); setDivName(""); setDivDialogOpen(true); };
  const openEditDiv = (item: DivisionItem) => { setDivEdit(item); setDivName(item.name); setDivDialogOpen(true); };
  const handleDivSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (divEdit) {
        await updateDivMut.mutateAsync({ id: divEdit.id, body: { name: divName } });
        toast({ title: "Updated" });
      } else {
        await createDivMut.mutateAsync({ name: divName });
        toast({ title: "Added", description: `${divName} division added.` });
      }
      setDivDialogOpen(false);
    } catch (err) {
      toast({ title: "Save failed", description: describeError(err, "Could not save."), variant: "destructive" });
    }
  };
  const handleDivDelete = async (id: string) => {
    try {
      await deleteDivMut.mutateAsync(id);
      toast({ title: "Deleted" });
    } catch (err) {
      toast({ title: "Delete failed", description: describeError(err, "Could not delete."), variant: "destructive" });
    }
  };

  // ─── Department dialog ───────────────────────────────────────────────────
  type DeptItem = { id: string; name: string; isActive: boolean };
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [deptEdit, setDeptEdit] = useState<DeptItem | null>(null);
  const [deptName, setDeptName] = useState("");
  const openAddDept = () => { setDeptEdit(null); setDeptName(""); setDeptDialogOpen(true); };
  const openEditDept = (item: DeptItem) => { setDeptEdit(item); setDeptName(item.name); setDeptDialogOpen(true); };
  const handleDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (deptEdit) {
        await updateDeptMut.mutateAsync({ id: deptEdit.id, body: { name: deptName } });
        toast({ title: "Updated" });
      } else {
        await createDeptMut.mutateAsync({ name: deptName });
        toast({ title: "Added", description: `${deptName} department added.` });
      }
      setDeptDialogOpen(false);
    } catch (err) {
      toast({ title: "Save failed", description: describeError(err, "Could not save."), variant: "destructive" });
    }
  };
  const handleDeptDelete = async (id: string) => {
    try {
      await deleteDeptMut.mutateAsync(id);
      toast({ title: "Deleted" });
    } catch (err) {
      toast({ title: "Delete failed", description: describeError(err, "Could not delete."), variant: "destructive" });
    }
  };

  // ─── Job Title (Designation) dialog ──────────────────────────────────────
  const [jtDialogOpen, setJtDialogOpen] = useState(false);
  const [jtEdit, setJtEdit] = useState<JobTitle | null>(null);
  const [jtTitle, setJtTitle] = useState("");
  const [jtLevel, setJtLevel] = useState("Entry");
  const jtItems: JobTitle[] = designations.map((d) => ({
    id: d.id,
    title: d.name,
    level: d.level != null ? (LEVEL_TO_NAME[d.level] ?? "Entry") : "Entry",
    isActive: d.isActive,
  })) as JobTitle[];
  const openAddJt = () => { setJtEdit(null); setJtTitle(""); setJtLevel("Entry"); setJtDialogOpen(true); };
  const openEditJt = (item: JobTitle) => { setJtEdit(item); setJtTitle(item.title); setJtLevel(item.level); setJtDialogOpen(true); };
  const handleJtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const level = NAME_TO_LEVEL[jtLevel] ?? null;
      if (jtEdit) {
        await updateDesigMut.mutateAsync({ id: jtEdit.id, body: { name: jtTitle, level } });
        toast({ title: "Updated", description: `${jtTitle} updated.` });
      } else {
        await createDesigMut.mutateAsync({ name: jtTitle, level });
        toast({ title: "Added", description: `${jtTitle} added.` });
      }
      setJtDialogOpen(false);
    } catch (err) {
      toast({ title: "Save failed", description: describeError(err, "Could not save."), variant: "destructive" });
    }
  };
  const handleJtDelete = async (id: string) => {
    try {
      await deleteDesigMut.mutateAsync(id);
      toast({ title: "Deleted" });
    } catch (err) {
      toast({ title: "Delete failed", description: describeError(err, "Could not delete."), variant: "destructive" });
    }
  };

  // ─── Employee Types (context-backed, not yet on backend) ─────────────────
  const [etDialogOpen, setEtDialogOpen] = useState(false);
  const [etEdit, setEtEdit] = useState<string | null>(null);
  const [etName, setEtName] = useState("");
  const openAddEt = () => { setEtEdit(null); setEtName(""); setEtDialogOpen(true); };
  const openEditEt = (id: string, name: string) => { setEtEdit(id); setEtName(name); setEtDialogOpen(true); };
  const handleEtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (etEdit) {
      updateEmployeeType(etEdit, { name: etName });
      toast({ title: "Updated", description: `${etName} updated.` });
    } else {
      addEmployeeType(etName);
      toast({ title: "Added", description: `${etName} employee type added.` });
    }
    setEtDialogOpen(false);
  };
  const handleEtDelete = (id: string) => { deleteEmployeeType(id); toast({ title: "Deleted" }); };

  return (
    <div className="space-y-6">
      <PageHeader title="Company Structure" description="Manage divisions, departments, and job titles." />

      <Tabs defaultValue="divisions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="divisions">Divisions</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="job-titles">Job Titles</TabsTrigger>
          <TabsTrigger value="employee-types">Employee Types</TabsTrigger>
        </TabsList>

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
                {divisions.map(item => (
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
                {departments.map(item => (
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
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {jtItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.title}</TableCell>
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

        <TabsContent value="employee-types" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={openAddEt}>
              <Plus className="h-4 w-4 mr-2" />Add Employee Type
            </Button>
          </div>
          <div className="bg-card rounded-xl border overflow-hidden">
            <Table>
              <TableHeader><TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Employee Type</TableHead>
                <TableHead className="font-semibold">Default</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {employeeTypes.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.isDefault ? <Badge variant="secondary">Default</Badge> : <Badge variant="outline">Custom</Badge>}</TableCell>
                    <TableCell><StatusBadge status={item.isActive ? "active" : "inactive"} /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditEt(item.id, item.name)}><Pencil className="h-3.5 w-3.5" /></Button>
                      {!item.isDefault && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleEtDelete(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={divDialogOpen} onOpenChange={setDivDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{divEdit ? "Edit Division" : "Add Division"}</DialogTitle><DialogDescription>Configure division.</DialogDescription></DialogHeader>
          <form onSubmit={handleDivSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={divName} onChange={e => setDivName(e.target.value)} required /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDivDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={createDivMut.isPending || updateDivMut.isPending}>{divEdit ? "Update" : "Add"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{deptEdit ? "Edit Department" : "Add Department"}</DialogTitle><DialogDescription>Configure department name.</DialogDescription></DialogHeader>
          <form onSubmit={handleDeptSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Department Name</Label><Input value={deptName} onChange={e => setDeptName(e.target.value)} required /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDeptDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={createDeptMut.isPending || updateDeptMut.isPending}>{deptEdit ? "Update" : "Add"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={jtDialogOpen} onOpenChange={setJtDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{jtEdit ? "Edit Title" : "Add Title"}</DialogTitle><DialogDescription>Configure a job title.</DialogDescription></DialogHeader>
          <form onSubmit={handleJtSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Title</Label><Input value={jtTitle} onChange={e => setJtTitle(e.target.value)} required /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setJtDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={createDesigMut.isPending || updateDesigMut.isPending}>{jtEdit ? "Update" : "Add"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={etDialogOpen} onOpenChange={setEtDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{etEdit ? "Edit Employee Type" : "Add Employee Type"}</DialogTitle><DialogDescription>Configure an employee type for classification.</DialogDescription></DialogHeader>
          <form onSubmit={handleEtSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Type Name</Label><Input value={etName} onChange={e => setEtName(e.target.value)} placeholder="e.g. IT Developer" required /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setEtDialogOpen(false)}>Cancel</Button><Button type="submit">{etEdit ? "Update" : "Add"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
