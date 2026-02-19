import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { expenseCategories, ExpenseCategory } from "@/data/settingsData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export default function ExpenseCategoriesPage() {
  const [items, setItems] = useState<ExpenseCategory[]>(expenseCategories);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<ExpenseCategory | null>(null);
  const [formName, setFormName] = useState("");
  const [formMax, setFormMax] = useState("");
  const [formApproval, setFormApproval] = useState(true);
  const { toast } = useToast();

  const openAdd = () => { setEditItem(null); setFormName(""); setFormMax(""); setFormApproval(true); setDialogOpen(true); };
  const openEdit = (item: ExpenseCategory) => { setEditItem(item); setFormName(item.name); setFormMax(item.maxAmount ? String(item.maxAmount) : ""); setFormApproval(item.requiresApproval); setDialogOpen(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const maxAmt = formMax ? Number(formMax) : null;
    if (editItem) {
      setItems(prev => prev.map(i => i.id === editItem.id ? { ...i, name: formName, maxAmount: maxAmt, requiresApproval: formApproval } : i));
      toast({ title: "Updated" });
    } else {
      setItems(prev => [...prev, { id: String(Date.now()), name: formName, maxAmount: maxAmt, requiresApproval: formApproval, isActive: true }]);
      toast({ title: "Added" });
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => { setItems(prev => prev.filter(i => i.id !== id)); toast({ title: "Deleted" }); };

  return (
    <div className="space-y-6">
      <PageHeader title="Expense Categories" description="Configure expense types and limits.">
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add Category</Button>
      </PageHeader>
      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Category</TableHead><TableHead className="font-semibold text-right">Max Amount</TableHead><TableHead className="font-semibold">Approval Required</TableHead><TableHead className="font-semibold">Status</TableHead><TableHead className="font-semibold text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-right">{item.maxAmount ? `SAR ${item.maxAmount.toLocaleString()}` : "No limit"}</TableCell>
                <TableCell>{item.requiresApproval ? "Yes" : "No"}</TableCell>
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
          <DialogHeader><DialogTitle>{editItem ? "Edit Category" : "Add Category"}</DialogTitle><DialogDescription>Configure expense category.</DialogDescription></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={formName} onChange={e => setFormName(e.target.value)} required /></div>
            <div className="space-y-2"><Label>Max Amount (SAR)</Label><Input type="number" value={formMax} onChange={e => setFormMax(e.target.value)} placeholder="Leave empty for no limit" /></div>
            <div className="flex items-center gap-3"><Switch checked={formApproval} onCheckedChange={setFormApproval} /><Label>Requires Approval</Label></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit">{editItem ? "Update" : "Add"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
