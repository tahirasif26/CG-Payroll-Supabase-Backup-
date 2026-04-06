import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CountryMultiSelect, CountryBadges } from "@/components/CountryMultiSelect";
import { EmployeeTypeMultiSelect, EmployeeTypeBadges } from "@/components/EmployeeTypeMultiSelect";

export interface EOSBenefitConfig {
  id: string;
  name: string;
  type: "gratuity" | "provident_fund" | "other";
  calculationBasis: "basic_salary" | "gross_salary";
  tiers: EOSTier[];
  appliesTo: string[];
  appliesToCountries?: string[];
  isActive: boolean;
}

export interface EOSTier {
  fromYear: number;
  toYear: number | null;
  daysPerYear: number;
  fraction: number;
}

const defaultConfigs: EOSBenefitConfig[] = [
  {
    id: "1",
    name: "Saudi Gratuity (End of Service Award)",
    type: "gratuity",
    calculationBasis: "basic_salary",
    tiers: [
      { fromYear: 0, toYear: 2, daysPerYear: 10, fraction: 0.5 },
      { fromYear: 2, toYear: 5, daysPerYear: 15, fraction: 0.5 },
      { fromYear: 5, toYear: 10, daysPerYear: 30, fraction: 1 },
      { fromYear: 10, toYear: null, daysPerYear: 30, fraction: 1 },
    ],
    appliesTo: ["direct"],
    appliesToCountries: ["Saudi Arabia"],
    isActive: true,
  },
  {
    id: "2",
    name: "Provident Fund",
    type: "provident_fund",
    calculationBasis: "basic_salary",
    tiers: [{ fromYear: 0, toYear: null, daysPerYear: 30, fraction: 1 }],
    appliesTo: ["direct", "it_developer"],
    isActive: false,
  },
  {
    id: "3",
    name: "Contractor End of Contract Bonus",
    type: "other",
    calculationBasis: "gross_salary",
    tiers: [
      { fromYear: 0, toYear: 2, daysPerYear: 7, fraction: 0.5 },
      { fromYear: 2, toYear: null, daysPerYear: 15, fraction: 1 },
    ],
    appliesTo: ["contractor"],
    appliesToCountries: ["Saudi Arabia", "UAE"],
    isActive: true,
  },
  {
    id: "4",
    name: "Intern Completion Gratuity",
    type: "gratuity",
    calculationBasis: "basic_salary",
    tiers: [{ fromYear: 0, toYear: null, daysPerYear: 5, fraction: 0.5 }],
    appliesTo: ["intern"],
    isActive: true,
  },
];

export function calculateEOSBenefit(
  config: EOSBenefitConfig,
  yearsOfService: number,
  monthlySalaryBasis: number
): number {
  if (!config.isActive || yearsOfService <= 0) return 0;
  const dailySalary = monthlySalaryBasis / 30;
  let total = 0;

  for (const tier of config.tiers) {
    const from = tier.fromYear;
    const to = tier.toYear ?? Infinity;
    if (yearsOfService <= from) break;
    const yearsInTier = Math.min(yearsOfService, to) - from;
    if (yearsInTier <= 0) continue;
    total += dailySalary * tier.daysPerYear * tier.fraction * yearsInTier;
  }

  return Math.round(total);
}

export const eosBenefitConfigs = defaultConfigs;

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
  const [configs, setConfigs] = useState<EOSBenefitConfig[]>(defaultConfigs);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<EOSBenefitConfig | null>(null);
  const { toast } = useToast();

  const openAdd = () => {
    setEditItem({
      id: String(Date.now()),
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
      isActive: true,
    });
    setEditOpen(true);
  };

  const openEdit = (c: EOSBenefitConfig) => {
    setEditItem({ ...c, tiers: c.tiers.map(t => ({ ...t })) });
    setEditOpen(true);
  };

  const handleSave = () => {
    if (!editItem || !editItem.name) return;
    setConfigs(prev => {
      const exists = prev.find(c => c.id === editItem.id);
      if (exists) return prev.map(c => c.id === editItem.id ? editItem : c);
      return [...prev, editItem];
    });
    setEditOpen(false);
    toast({ title: "Saved", description: `${editItem.name} configuration saved.` });
  };

  const handleDelete = (id: string) => {
    setConfigs(prev => prev.filter(c => c.id !== id));
    toast({ title: "Deleted", description: "EOS benefit configuration removed." });
  };

  const handleToggle = (id: string) => {
    setConfigs(prev => prev.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c));
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
                  <Switch checked={c.isActive} onCheckedChange={() => handleToggle(c.id)} />
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
            <DialogTitle>{editItem?.name ? "Edit" : "Add"} EOS Benefit</DialogTitle>
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

              {/* Tier Editor */}
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
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
