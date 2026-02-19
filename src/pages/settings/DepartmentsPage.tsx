import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export default function DepartmentsPage() {
  const [items, setItems] = useState<SimpleDepartment[]>(initialDepartments);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<SimpleDepartment | null>(null);
  const [formName, setFormName] = useState("");
  const { toast } = useToast();

  const openAdd = () => { setEditItem(null); setFormName(""); setDialogOpen(true); };
  const openEdit = (item: SimpleDepartment) => { setEditItem(item); setFormName(item.name); setDialogOpen(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editItem) {
      setItems(prev => prev.map(i => i.id === editItem.id ? { ...i, name: formName } : i));
      toast({ title: "Updated" });
    } else {
      setItems(prev => [...prev, { id: String(Date.now()), name: formName, isActive: true }]);
      toast({ title: "Added", description: `${formName} department added.` });
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => { setItems(prev => prev.filter(i => i.id !== id)); toast({ title: "Deleted" }); };

  return (
    <div className="space-y-6">
      <PageHeader title="Departments" description="Configure company departments.">
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add Department</Button>
      </PageHeader>
      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Department</TableHead><TableHead className="font-semibold">Status</TableHead><TableHead className="font-semibold text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell><StatusBadge status={item.isActive ? "active" : "inactive"} /></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? "Edit Department" : "Add Department"}</DialogTitle><DialogDescription>Configure department name.</DialogDescription></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Department Name</Label><Input value={formName} onChange={e => setFormName(e.target.value)} required /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit">{editItem ? "Update" : "Add"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
