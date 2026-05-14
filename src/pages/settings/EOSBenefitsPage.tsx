import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { CountryMultiSelect, CountryBadges } from "@/components/CountryMultiSelect";
import { EmployeeTypeMultiSelect, EmployeeTypeBadges } from "@/components/EmployeeTypeMultiSelect";
import {
  useEosBenefitConfigs,
  useUpsertEosBenefitConfig,
  useDeleteEosBenefitConfig,
  calculateEOSBenefit as _calc,
  type EOSBenefitConfig,
  type EOSTier,
} from "@/hooks/queries/useEosBenefitConfigs";

// Re-exports for backwards compatibility with existing imports.
export type { EOSBenefitConfig, EOSTier };
export const calculateEOSBenefit = _calc;

function TierEditor({ tiers, onChange }: { tiers: EOSTier[]; onChange: (t: EOSTier[]) => void }) {
  const updateTier = (i: number, field: keyof EOSTier, value: string) => {
    const updated = [...tiers];
    if (field === "toYear") {
      updated[i] = { ...updated[i], toYear: value ? Number(value) : null };
    } else {
      updated[i] = { ...updated[i], [field]: Number(value) };
    }
    onChange(updated);
  };

  const removeTier = (i: number) => onChange(tiers.filter((_, idx) => idx !== i));

  const addTier = () => {
    if (tiers.length >= 6) return;
    const lastTo = tiers.length > 0 ? (tiers[tiers.length - 1].toYear ?? 0) : 0;
    onChange([...tiers, { fromYear: lastTo, toYear: null, daysPerYear: 30, fraction: 1 }]);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 text-xs text-muted-foreground font-medium">
        <span>From Year</span><span>To Year</span><span>Days / Year of Service</span><span>Salary Fraction</span><span></span>
      </div>
      {tiers.map((tier, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-center">
          <Input type="number" min={0} value={tier.fromYear} onChange={e => updateTier(i, "fromYear", e.target.value)} className="h-8" />
          <Input type="number" min={0} value={tier.toYear ?? ""} placeholder="∞" onChange={e => updateTier(i, "toYear", e.target.value)} className="h-8" />
          <Input type="number" min={0} value={tier.daysPerYear} onChange={e => updateTier(i, "daysPerYear", e.target.value)} className="h-8" />
          <Input type="number" min={0} step={0.1} value={tier.fraction} onChange={e => updateTier(i, "fraction", e.target.value)} className="h-8" />
          {tiers.length > 1 && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeTier(i)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ))}
      {tiers.length < 6 && (
        <Button variant="outline" size="sm" onClick={addTier}>
          <Plus className="h-3 w-3 mr-1" />Add Tier
        </Button>
      )}
    </div>
  );
}

export default function EOSBenefitsPage() {
  const { data: configs = [], isLoading } = useEosBenefitConfigs();
  const upsert = useUpsertEosBenefitConfig();
  const del = useDeleteEosBenefitConfig();
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<EOSBenefitConfig | null>(null);

  const openAdd = () => {
    setEditItem({
      id: "",
      name: "",
      type: "gratuity",
      calculationBasis: "basic_salary",
      tiers: [
        { fromYear: 0, toYear: 2, daysPerYear: 10, fraction: 0.5 },
        { fromYear: 2, toYear: 5, daysPerYear: 15, fraction: 0.5 },
        { fromYear: 5, toYear: 10, daysPerYear: 30, fraction: 1 },
        { fromYear: 10, toYear: null, daysPerYear: 30, fraction: 1 },
      ],
      appliesTo: [],
      appliesToCountries: [],
      isActive: true,
    });
    setEditOpen(true);
  };

  const openEdit = (c: EOSBenefitConfig) => {
    setEditItem({ ...c, tiers: c.tiers.map(t => ({ ...t })) });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editItem || !editItem.name) return;
    await upsert.mutateAsync(editItem);
    setEditOpen(false);
  };

  const handleDelete = async (id: string) => {
    await del.mutateAsync(id);
  };

  const handleToggle = async (c: EOSBenefitConfig) => {
    await upsert.mutateAsync({ ...c, isActive: !c.isActive });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="End of Service Benefits" description="Configure gratuity, provident fund, and other end-of-service benefit rules.">
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />Add Benefit
        </Button>
      </PageHeader>

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Benefit Name</TableHead>
              <TableHead className="font-semibold">Type</TableHead>
              <TableHead className="font-semibold">Calculation Basis</TableHead>
              <TableHead className="font-semibold">Applies To</TableHead>
              <TableHead className="font-semibold">Countries</TableHead>
              <TableHead className="font-semibold">Tiers</TableHead>
              <TableHead className="font-semibold">Active</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>
            )}
            {!isLoading && configs.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No EOS benefit configurations yet.</TableCell></TableRow>
            )}
            {configs.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="capitalize">{c.type.replace("_", " ")}</TableCell>
                <TableCell className="capitalize">{c.calculationBasis.replace("_", " ")}</TableCell>
                <TableCell><EmployeeTypeBadges typeIds={c.appliesTo} /></TableCell>
                <TableCell><CountryBadges countries={c.appliesToCountries} /></TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {c.tiers.map((t, i) => (
                    <span key={i}>{t.fromYear}-{t.toYear ?? "∞"}yr: {t.daysPerYear}d × {t.fraction}{i < c.tiers.length - 1 ? " | " : ""}</span>
                  ))}
                </TableCell>
                <TableCell>
                  <Switch checked={c.isActive} onCheckedChange={() => handleToggle(c)} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Edit2 className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit/Add Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editItem?.id ? "Edit" : "Add"} EOS Benefit</DialogTitle>
            <DialogDescription>Configure the end-of-service benefit rules, calculation basis, and tier structure.</DialogDescription>
          </DialogHeader>
          {editItem && (
            <div className="space-y-5">
              <div className="space-y-2"><Label>Name</Label><Input value={editItem.name} onChange={e => setEditItem({ ...editItem, name: e.target.value })} placeholder="e.g. Saudi Gratuity" /></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={editItem.type} onValueChange={v => setEditItem({ ...editItem, type: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gratuity">Gratuity</SelectItem>
                      <SelectItem value="provident_fund">Provident Fund</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Calculation Basis</Label>
                  <Select value={editItem.calculationBasis} onValueChange={v => setEditItem({ ...editItem, calculationBasis: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic_salary">Basic Salary</SelectItem>
                      <SelectItem value="gross_salary">Gross Salary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Applies To</Label>
                  <EmployeeTypeMultiSelect value={editItem.appliesTo} onChange={v => setEditItem({ ...editItem, appliesTo: v })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Countries</Label>
                <CountryMultiSelect value={editItem.appliesToCountries || []} onChange={c => setEditItem({ ...editItem, appliesToCountries: c })} />
              </div>

              <div className="space-y-2">
                <Label>Service Tiers</Label>
                <p className="text-xs text-muted-foreground">Define how many days of salary per year of service for each bracket. Fraction 1 = full pay, 0.5 = half pay.</p>
                <Card>
                  <CardContent className="pt-4">
                    <TierEditor tiers={editItem.tiers} onChange={tiers => setEditItem({ ...editItem, tiers })} />
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsert.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
