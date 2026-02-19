import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { divisions, Division } from "@/data/settingsData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function DivisionsPage() {
  const [items, setItems] = useState<Division[]>(divisions);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Division | null>(null);
  const [formName, setFormName] = useState("");
  const { toast } = useToast();

  const openAdd = () => { setEditItem(null); setFormName(""); setDialogOpen(true); };
  const openEdit = (item: Division) => { setEditItem(item); setFormName(item.name); setDialogOpen(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editItem) {
      setItems(prev => prev.map(i => i.id === editItem.id ? { ...i, name: formName } : i));
      toast({ title: "Updated" });
    } else {
      setItems(prev => [...prev, { id: String(Date.now()), name: formName, isActive: true }]);
      toast({ title: "Added", description: `${formName} division added.` });
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => { setItems(prev => prev.filter(i => i.id !== id)); toast({ title: "Deleted" }); };

  return (
    <div className="space-y-6">
      <PageHeader title="Divisions" description="Manage company divisions.">
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add Division</Button>
      </PageHeader>
      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Division</TableHead><TableHead className="font-semibold">Status</TableHead><TableHead className="font-semibold text-right">Actions</TableHead>
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
          <DialogHeader><DialogTitle>{editItem ? "Edit Division" : "Add Division"}</DialogTitle><DialogDescription>Configure division.</DialogDescription></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={formName} onChange={e => setFormName(e.target.value)} required /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit">{editItem ? "Update" : "Add"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
