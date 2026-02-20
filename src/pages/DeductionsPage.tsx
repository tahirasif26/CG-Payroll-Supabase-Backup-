import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { deductions as initialDeductions } from "@/data/mockData";
import { Deduction } from "@/types/hcm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export default function DeductionsPage() {
  const [items, setItems] = useState<Deduction[]>(initialDeductions);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Deduction | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<string>("statutory");
  const [formIsPercentage, setFormIsPercentage] = useState(true);
  const [formValue, setFormValue] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  const openAdd = () => {
    setEditItem(null);
    setFormName(""); setFormType("statutory"); setFormIsPercentage(true); setFormValue(""); setFormIsActive(true);
    setDialogOpen(true);
  };

  const openEdit = (item: Deduction) => {
    setEditItem(item);
    setFormName(item.name); setFormType(item.type);
    setFormIsPercentage(!!item.percentage); setFormValue(String(item.percentage || item.fixedAmount || ""));
    setFormIsActive(item.isActive);
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(formValue);
    const newDed: Deduction = {
      id: editItem?.id || String(Date.now()),
      name: formName,
      type: formType as any,
      percentage: formIsPercentage ? val : undefined,
      fixedAmount: !formIsPercentage ? val : undefined,
      isActive: formIsActive,
    };
    if (editItem) {
      setItems(prev => prev.map(i => i.id === editItem.id ? newDed : i));
      toast({ title: "Updated", description: `${formName} has been updated.` });
    } else {
      setItems(prev => [...prev, newDed]);
      toast({ title: "Added", description: `${formName} has been added.` });
    }
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (deleteId) {
      setItems(prev => prev.filter(i => i.id !== deleteId));
      toast({ title: "Deleted", description: "Deduction removed." });
    }
    setDeleteOpen(false);
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Deductions" description="Configure payroll deduction rules.">
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />Add Deduction
        </Button>
      </PageHeader>

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Type</TableHead>
              <TableHead className="font-semibold text-right">Rate / Amount</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{d.type}</Badge></TableCell>
                <TableCell className="text-right font-semibold">{d.percentage ? `${d.percentage}%` : `SAR ${d.fixedAmount?.toLocaleString()}`}</TableCell>
                <TableCell><StatusBadge status={d.isActive ? "active" : "inactive"} /></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeleteId(d.id); setDeleteOpen(true); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Deduction" : "Add Deduction"}</DialogTitle>
            <DialogDescription>Configure a payroll deduction rule.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. GOSI" required /></div>
            <div className="space-y-2"><Label>Type</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                 <SelectContent>
                  <SelectItem value="statutory">Statutory</SelectItem>
                  <SelectItem value="benefit">Benefit</SelectItem>
                  <SelectItem value="one-off">One Off</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3"><Switch checked={formIsPercentage} onCheckedChange={setFormIsPercentage} /><Label>Percentage-based</Label></div>
            <div className="space-y-2"><Label>{formIsPercentage ? "Percentage (%)" : "Fixed Amount (SAR)"}</Label><Input type="number" value={formValue} onChange={e => setFormValue(e.target.value)} required min={0} step="0.01" /></div>
            <div className="flex items-center gap-3"><Switch checked={formIsActive} onCheckedChange={setFormIsActive} /><Label>Active</Label></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editItem ? "Update" : "Add"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Deduction</DialogTitle><DialogDescription>Are you sure you want to remove this deduction rule?</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
