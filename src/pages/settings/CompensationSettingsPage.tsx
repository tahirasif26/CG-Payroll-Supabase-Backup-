import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { compensationSettings, CompensationSetting } from "@/data/settingsData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { CountryMultiSelect, CountryBadges } from "@/components/CountryMultiSelect";
import { useEmployeeTypes } from "@/contexts/EmployeeTypeContext";

export default function CompensationSettingsPage() {
  const { activeTypes } = useEmployeeTypes();
  const [items, setItems] = useState<CompensationSetting[]>(compensationSettings);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<CompensationSetting | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const [formName, setFormName] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formAppliesTo, setFormAppliesTo] = useState<"all" | "direct" | "contractor">("all");
  const [formCountries, setFormCountries] = useState<string[]>([]);

  const openAdd = () => {
    setEditItem(null);
    setFormName(""); setFormIsActive(true); setFormAppliesTo("all"); setFormCountries([]);
    setDialogOpen(true);
  };

  const openEdit = (item: CompensationSetting) => {
    setEditItem(item);
    setFormName(item.name); setFormIsActive(item.isActive); setFormAppliesTo(item.appliesTo || "all"); setFormCountries(item.appliesToCountries || []);
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editItem) {
      setItems(prev => prev.map(i => i.id === editItem.id ? { ...i, name: formName, isActive: formIsActive, appliesTo: formAppliesTo, appliesToCountries: formCountries } : i));
      toast({ title: "Updated", description: `${formName} has been updated.` });
    } else {
      const newItem: CompensationSetting = { id: String(Date.now()), name: formName, isActive: formIsActive, appliesTo: formAppliesTo, appliesToCountries: formCountries };
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

  return (
    <div className="space-y-6">
      <PageHeader title="Compensation Settings" description="Configure salary components. Values for each component are set per employee.">
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />Add Component
        </Button>
      </PageHeader>

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Component Name</TableHead>
              <TableHead className="font-semibold">Applies To</TableHead>
              <TableHead className="font-semibold">Countries</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="capitalize text-sm">{item.appliesTo || "all"}</TableCell>
                <TableCell><CountryBadges countries={item.appliesToCountries} /></TableCell>
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
            <DialogDescription>Define a compensation component. Amounts are set individually per employee.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Component Name</Label><Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Housing Allowance" required /></div>
            <div className="space-y-2">
              <Label>Applies To</Label>
              <Select value={formAppliesTo} onValueChange={(v) => setFormAppliesTo(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {activeTypes.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name} Only</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Countries</Label>
              <CountryMultiSelect value={formCountries} onChange={setFormCountries} />
            </div>
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
