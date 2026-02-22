import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { taxConfigs as initialTaxConfigs } from "@/data/mockData";
import { TaxConfig } from "@/types/hcm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { CountryMultiSelect, CountryBadges } from "@/components/CountryMultiSelect";

export default function TaxPage() {
  const [items, setItems] = useState<TaxConfig[]>(initialTaxConfigs);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<TaxConfig | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const [formName, setFormName] = useState("");
  const [formRate, setFormRate] = useState("");
  const [formApplicableTo, setFormApplicableTo] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formAppliesTo, setFormAppliesTo] = useState<"all" | "direct" | "contractor">("all");
  const [formCountries, setFormCountries] = useState<string[]>([]);

  const openAdd = () => {
    setEditItem(null);
    setFormName(""); setFormRate(""); setFormApplicableTo(""); setFormIsActive(true); setFormAppliesTo("all"); setFormCountries([]);
    setDialogOpen(true);
  };

  const openEdit = (item: TaxConfig) => {
    setEditItem(item);
    setFormName(item.name); setFormRate(String(item.rate)); setFormApplicableTo(item.applicableTo);
    setFormIsActive(item.isActive); setFormAppliesTo(item.appliesTo || "all"); setFormCountries(item.appliesToCountries || []);
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTax: TaxConfig = {
      id: editItem?.id || String(Date.now()),
      name: formName, rate: Number(formRate), applicableTo: formApplicableTo,
      isActive: formIsActive, appliesTo: formAppliesTo, appliesToCountries: formCountries,
    };
    if (editItem) {
      setItems(prev => prev.map(i => i.id === editItem.id ? newTax : i));
      toast({ title: "Updated", description: `${formName} updated.` });
    } else {
      setItems(prev => [...prev, newTax]);
      toast({ title: "Added", description: `${formName} added.` });
    }
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (deleteId) {
      setItems(prev => prev.filter(i => i.id !== deleteId));
      toast({ title: "Deleted", description: "Tax rule removed." });
    }
    setDeleteOpen(false); setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Tax Configuration" description="Manage tax rates and rules.">
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add Tax Rule</Button>
      </PageHeader>

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Tax Name</TableHead>
              <TableHead className="font-semibold text-right">Rate (%)</TableHead>
              <TableHead className="font-semibold">Applicable To</TableHead>
              <TableHead className="font-semibold">Employee Type</TableHead>
              <TableHead className="font-semibold">Countries</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="text-right font-semibold">{t.rate}%</TableCell>
                <TableCell>{t.applicableTo}</TableCell>
                <TableCell className="capitalize text-sm">{t.appliesTo || "all"}</TableCell>
                <TableCell><CountryBadges countries={t.appliesToCountries} /></TableCell>
                <TableCell><StatusBadge status={t.isActive ? "active" : "inactive"} /></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeleteId(t.id); setDeleteOpen(true); }}><Trash2 className="h-3.5 w-3.5" /></Button>
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
            <DialogTitle>{editItem ? "Edit Tax Rule" : "Add Tax Rule"}</DialogTitle>
            <DialogDescription>Configure a tax rule.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Tax Name</Label><Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Zakat" required /></div>
            <div className="space-y-2"><Label>Rate (%)</Label><Input type="number" value={formRate} onChange={e => setFormRate(e.target.value)} required min={0} step="0.01" /></div>
            <div className="space-y-2"><Label>Applicable To</Label><Input value={formApplicableTo} onChange={e => setFormApplicableTo(e.target.value)} placeholder="e.g. All Employees" required /></div>
            <div className="space-y-2">
              <Label>Employee Type</Label>
              <Select value={formAppliesTo} onValueChange={(v) => setFormAppliesTo(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  <SelectItem value="direct">Direct Employees Only</SelectItem>
                  <SelectItem value="contractor">Contractors Only</SelectItem>
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
          <DialogHeader><DialogTitle>Delete Tax Rule</DialogTitle><DialogDescription>Are you sure you want to remove this tax rule?</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
