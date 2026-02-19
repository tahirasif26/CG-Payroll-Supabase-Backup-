import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { compensationSettings, CompensationSetting } from "@/data/settingsData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function CompensationSettingsPage() {
  const [items, setItems] = useState<CompensationSetting[]>(compensationSettings);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<CompensationSetting | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<string>("other");
  const [formIsPercentage, setFormIsPercentage] = useState(true);
  const [formDefaultValue, setFormDefaultValue] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  const openAdd = () => {
    setEditItem(null);
    setFormName(""); setFormType("other"); setFormIsPercentage(true); setFormDefaultValue(""); setFormIsActive(true);
    setDialogOpen(true);
  };

  const openEdit = (item: CompensationSetting) => {
    setEditItem(item);
    setFormName(item.name); setFormType(item.type); setFormIsPercentage(item.isPercentage);
    setFormDefaultValue(String(item.defaultValue)); setFormIsActive(item.isActive);
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editItem) {
      setItems(prev => prev.map(i => i.id === editItem.id ? { ...i, name: formName, type: formType as any, isPercentage: formIsPercentage, defaultValue: Number(formDefaultValue), isActive: formIsActive } : i));
      toast({ title: "Updated", description: `${formName} has been updated.` });
    } else {
      const newItem: CompensationSetting = { id: String(Date.now()), name: formName, type: formType as any, isPercentage: formIsPercentage, defaultValue: Number(formDefaultValue), isActive: formIsActive };
      setItems(prev => [...prev, newItem]);
      toast({ title: "Added", description: `${formName} has been added.` });
    }
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (deleteId) {
      setItems(prev => prev.filter(i => i.id !== deleteId));
      toast({ title: "Deleted", description: "Compensation component removed." });
    }
    setDeleteOpen(false);
    setDeleteId(null);
  };

  const totalPercentage = items.filter(i => i.isActive && i.isPercentage).reduce((s, i) => s + i.defaultValue, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Compensation Settings" description="Configure salary components and allowance structure.">
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />Add Component
        </Button>
      </PageHeader>

      {totalPercentage !== 100 && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm text-warning">
          ⚠ Active percentage components total {totalPercentage}% — should equal 100%.
        </div>
      )}

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Component</TableHead>
              <TableHead className="font-semibold">Type</TableHead>
              <TableHead className="font-semibold">Calculation</TableHead>
              <TableHead className="font-semibold text-right">Default Value</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{item.type}</Badge></TableCell>
                <TableCell>{item.isPercentage ? "Percentage of Total" : "Fixed Amount"}</TableCell>
                <TableCell className="text-right font-semibold">{item.isPercentage ? `${item.defaultValue}%` : `SAR ${item.defaultValue.toLocaleString()}`}</TableCell>
                <TableCell><StatusBadge status={item.isActive ? "active" : "inactive"} /></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeleteId(item.id); setDeleteOpen(true); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Component" : "Add Component"}</DialogTitle>
            <DialogDescription>Configure a salary compensation component.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Housing Allowance" required /></div>
            <div className="space-y-2"><Label>Type</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="base">Base</SelectItem><SelectItem value="housing">Housing</SelectItem>
                  <SelectItem value="travel">Travel</SelectItem><SelectItem value="medical">Medical</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3"><Switch checked={formIsPercentage} onCheckedChange={setFormIsPercentage} /><Label>Percentage-based</Label></div>
            <div className="space-y-2"><Label>{formIsPercentage ? "Default Percentage (%)" : "Default Amount (SAR)"}</Label><Input type="number" value={formDefaultValue} onChange={e => setFormDefaultValue(e.target.value)} required min={0} /></div>
            <div className="flex items-center gap-3"><Switch checked={formIsActive} onCheckedChange={setFormIsActive} /><Label>Active</Label></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editItem ? "Update" : "Add"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Component</DialogTitle><DialogDescription>Are you sure? This will affect compensation calculations.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
