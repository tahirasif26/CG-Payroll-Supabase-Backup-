import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { departments, Department, divisions } from "@/data/settingsData";
import { employees } from "@/data/mockData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function DepartmentsPage() {
  const [items, setItems] = useState<Department[]>(departments);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Department | null>(null);
  const [formName, setFormName] = useState("");
  const [formDivision, setFormDivision] = useState("");
  const [formHead, setFormHead] = useState("");
  const { toast } = useToast();

  const openAdd = () => { setEditItem(null); setFormName(""); setFormDivision(divisions[0]?.name || ""); setFormHead(""); setDialogOpen(true); };
  const openEdit = (item: Department) => { setEditItem(item); setFormName(item.name); setFormDivision(item.division); setFormHead(item.headId || ""); setDialogOpen(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editItem) {
      setItems(prev => prev.map(i => i.id === editItem.id ? { ...i, name: formName, division: formDivision, headId: formHead || null } : i));
      toast({ title: "Updated" });
    } else {
      setItems(prev => [...prev, { id: String(Date.now()), name: formName, division: formDivision, headId: formHead || null, isActive: true }]);
      toast({ title: "Added", description: `${formName} department added.` });
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => { setItems(prev => prev.filter(i => i.id !== id)); toast({ title: "Deleted" }); };

  return (
    <div className="space-y-6">
      <PageHeader title="Departments" description="Manage company departments.">
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add Department</Button>
      </PageHeader>
      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Department</TableHead><TableHead className="font-semibold">Division</TableHead><TableHead className="font-semibold">Head</TableHead><TableHead className="font-semibold">Status</TableHead><TableHead className="font-semibold text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.map(item => {
              const head = employees.find(e => e.id === item.headId);
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell><Badge variant="outline">{item.division}</Badge></TableCell>
                  <TableCell>{head ? `${head.firstName} ${head.lastName}` : "—"}</TableCell>
                  <TableCell><StatusBadge status={item.isActive ? "active" : "inactive"} /></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? "Edit Department" : "Add Department"}</DialogTitle><DialogDescription>Configure department details.</DialogDescription></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={formName} onChange={e => setFormName(e.target.value)} required /></div>
            <div className="space-y-2"><Label>Division</Label>
              <Select value={formDivision} onValueChange={setFormDivision}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{divisions.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Department Head</Label>
              <Select value={formHead} onValueChange={setFormHead}><SelectTrigger><SelectValue placeholder="Select head" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit">{editItem ? "Update" : "Add"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
