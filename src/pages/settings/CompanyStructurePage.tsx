import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useEmployeeTypes } from "@/contexts/EmployeeTypeContext";

interface SimpleDepartment {
  id: string;
  name: string;
  isActive: boolean;
}


export default function CompanyStructurePage() {
  const { toast } = useToast();
  const { clientId } = useRole();
  const qc = useQueryClient();
  const { employeeTypes, addEmployeeType, updateEmployeeType, deleteEmployeeType } = useEmployeeTypes();

  const { data: dbDepartments = [] } = useQuery({
    queryKey: ["departments", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments").select("id, name").eq("client_id", clientId!).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: dbDesignations = [] } = useQuery({
    queryKey: ["designations", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("designations").select("id, name, level").eq("client_id", clientId!).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addDeptMut = useMutation({
    mutationFn: async (name: string) => {
      if (!clientId) throw new Error("No client context");
      const { error } = await supabase.from("departments").insert({ client_id: clientId, name });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments", clientId] }),
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const updateDeptMut = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("departments").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments", clientId] }),
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const deleteDeptMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("departments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments", clientId] }),
    onError: (e: Error) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const levelToInt = (l: string): number | null => {
    const map: Record<string, number> = { Leadership: 4, Management: 3, Professional: 2, Entry: 1 };
    return map[l] ?? null;
  };
  const intToLevel = (n: number | null | undefined): string => {
    const map: Record<number, string> = { 4: "Leadership", 3: "Management", 2: "Professional", 1: "Entry" };
    return n != null ? (map[n] ?? "Entry") : "Entry";
  };

  const addDesigMut = useMutation({
    mutationFn: async ({ name, level }: { name: string; level: string }) => {
      if (!clientId) throw new Error("No client context");
      const { error } = await supabase.from("designations").insert({ client_id: clientId, name, level: levelToInt(level) });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["designations", clientId] }),
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const updateDesigMut = useMutation({
    mutationFn: async ({ id, name, level }: { id: string; name: string; level: string }) => {
      const { error } = await supabase.from("designations").update({ name, level: levelToInt(level) }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["designations", clientId] }),
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const deleteDesigMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("designations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["designations", clientId] }),
    onError: (e: Error) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });


  // Divisions queries (DB-backed)
  const { data: dbDivisions = [] } = useQuery({
    queryKey: ["divisions", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("divisions").select("id, name, is_active").eq("client_id", clientId!).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addDivMut = useMutation({
    mutationFn: async (name: string) => {
      if (!clientId) throw new Error("No client context");
      const { error } = await supabase.from("divisions").insert({ client_id: clientId, name });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["divisions", clientId] }),
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const updateDivMut = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("divisions").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["divisions", clientId] }),
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const deleteDivMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("divisions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["divisions", clientId] }),
    onError: (e: Error) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  // Employee Types state
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

  // Divisions state
  const [divItems, setDivItems] = useState<Division[]>(divisions);
  const [divDialogOpen, setDivDialogOpen] = useState(false);
  const [divEdit, setDivEdit] = useState<Division | null>(null);
  const [divName, setDivName] = useState("");

  // Departments state
  const deptItems: SimpleDepartment[] = dbDepartments.map((d: any) => ({
    id: d.id, name: d.name, isActive: true,
  }));
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [deptEdit, setDeptEdit] = useState<SimpleDepartment | null>(null);
  const [deptName, setDeptName] = useState("");

  // Job Titles derived from DB
  const jtItems: JobTitle[] = dbDesignations.map((d: any) => ({
    id: d.id,
    title: d.name,
    level: intToLevel(d.level),
    isActive: true,
  })) as JobTitle[];
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

  // Department handlers (DB-backed)
  const openAddDept = () => { setDeptEdit(null); setDeptName(""); setDeptDialogOpen(true); };
  const openEditDept = (item: SimpleDepartment) => { setDeptEdit(item); setDeptName(item.name); setDeptDialogOpen(true); };
  const handleDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (deptEdit) {
        await updateDeptMut.mutateAsync({ id: deptEdit.id, name: deptName });
        toast({ title: "Updated" });
      } else {
        await addDeptMut.mutateAsync(deptName);
        toast({ title: "Added", description: `${deptName} department added.` });
      }
      setDeptDialogOpen(false);
    } catch { /* toast shown by mutation */ }
  };
  const handleDeptDelete = async (id: string) => {
    try {
      await deleteDeptMut.mutateAsync(id);
      toast({ title: "Deleted" });
    } catch { /* toast shown by mutation */ }
  };

  // Job Title handlers (DB-backed)
  const openAddJt = () => { setJtEdit(null); setJtTitle(""); setJtLevel("Entry"); setJtDialogOpen(true); };
  const openEditJt = (item: JobTitle) => { setJtEdit(item); setJtTitle(item.title); setJtLevel(item.level); setJtDialogOpen(true); };
  const handleJtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (jtEdit) {
        await updateDesigMut.mutateAsync({ id: jtEdit.id, name: jtTitle, level: jtLevel });
        toast({ title: "Updated", description: `${jtTitle} updated.` });
      } else {
        await addDesigMut.mutateAsync({ name: jtTitle, level: jtLevel });
        toast({ title: "Added", description: `${jtTitle} added.` });
      }
      setJtDialogOpen(false);
    } catch { /* toast shown by mutation */ }
  };
  const handleJtDelete = async (id: string) => {
    try {
      await deleteDesigMut.mutateAsync(id);
      toast({ title: "Deleted" });
    } catch { /* toast shown by mutation */ }
  };

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
        {/* Employee Types Tab */}
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

      {/* Employee Type Dialog */}
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
