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
import { Plus, Edit2, Trash2, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface EOSBenefitConfig {
  id: string;
  name: string;
  type: "gratuity" | "provident_fund" | "other";
  calculationBasis: "basic_salary" | "gross_salary";
  tiers: EOSTier[];
  appliesTo: "all" | "direct" | "contractor";
  isActive: boolean;
}

export interface EOSTier {
  fromYear: number;
  toYear: number | null; // null = unlimited
  daysPerYear: number; // days of salary per year of service
  fraction: number; // e.g. 0.5 = half pay, 1 = full pay
}

// Default Saudi Labor Law gratuity tiers
const defaultGratuityTiers: EOSTier[] = [
  { fromYear: 0, toYear: 5, daysPerYear: 15, fraction: 0.5 },
  { fromYear: 5, toYear: null, daysPerYear: 30, fraction: 1 },
];

const defaultConfigs: EOSBenefitConfig[] = [
  {
    id: "1",
    name: "Saudi Gratuity (End of Service Award)",
    type: "gratuity",
    calculationBasis: "basic_salary",
    tiers: defaultGratuityTiers,
    appliesTo: "direct",
    isActive: true,
  },
  {
    id: "2",
    name: "Provident Fund",
    type: "provident_fund",
    calculationBasis: "basic_salary",
    tiers: [{ fromYear: 0, toYear: null, daysPerYear: 30, fraction: 1 }],
    appliesTo: "all",
    isActive: false,
  },
];

// Export for use in payslip and separation
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
      tiers: [{ fromYear: 0, toYear: 5, daysPerYear: 15, fraction: 0.5 }],
      appliesTo: "all",
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
      <PageHeader title="End of Service Benefits" description="Configure gratuity, provident fund, and other end-of-service benefit rules based on labor law.">
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />Add Benefit
        </Button>
      </PageHeader>

      {/* Info Card */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4 text-primary" />Saudi Labor Law — Gratuity Reference</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Under Saudi Arabia's Labor Law (Article 84), employees are entitled to an end-of-service award (gratuity) calculated as:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>First 5 years:</strong> Half month's wage (15 days) for each year of service</li>
            <li><strong>After 5 years:</strong> One month's wage (30 days) for each additional year</li>
            <li>Calculated on the <strong>last basic salary</strong></li>
            <li>Pro-rated for partial years</li>
          </ul>
          <p className="text-xs">UAE EOSB follows similar principles under Federal Decree-Law No. 33/2021: 21 days for first 5 years, 30 days thereafter, capped at 2 years' total salary.</p>
        </CardContent>
      </Card>

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Benefit Name</TableHead>
              <TableHead className="font-semibold">Type</TableHead>
              <TableHead className="font-semibold">Basis</TableHead>
              <TableHead className="font-semibold">Applies To</TableHead>
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
                <TableCell className="capitalize">{c.appliesTo === "all" ? "All" : c.appliesTo === "direct" ? "Direct" : "Contractor"}</TableCell>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem?.name ? "Edit" : "Add"} EOS Benefit</DialogTitle>
            <DialogDescription>Configure the end-of-service benefit rules and tier structure.</DialogDescription>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input value={editItem.name} onChange={e => setEditItem({ ...editItem, name: e.target.value })} placeholder="e.g. Saudi Gratuity" /></div>
              <div className="grid grid-cols-2 gap-4">
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
              </div>
              <div className="space-y-2">
                <Label>Applies To</Label>
                <Select value={editItem.appliesTo} onValueChange={v => setEditItem({ ...editItem, appliesTo: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    <SelectItem value="direct">Direct Employees</SelectItem>
                    <SelectItem value="contractor">Contractors</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tiers */}
              <div className="space-y-2">
                <Label>Service Tiers</Label>
                {editItem.tiers.map((tier, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2 items-end">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">From Year</p>
                      <Input type="number" value={tier.fromYear} onChange={e => {
                        const tiers = [...editItem.tiers];
                        tiers[i] = { ...tiers[i], fromYear: Number(e.target.value) };
                        setEditItem({ ...editItem, tiers });
                      }} className="h-8" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">To Year</p>
                      <Input type="number" value={tier.toYear ?? ""} placeholder="∞" onChange={e => {
                        const tiers = [...editItem.tiers];
                        tiers[i] = { ...tiers[i], toYear: e.target.value ? Number(e.target.value) : null };
                        setEditItem({ ...editItem, tiers });
                      }} className="h-8" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Days/Year</p>
                      <Input type="number" value={tier.daysPerYear} onChange={e => {
                        const tiers = [...editItem.tiers];
                        tiers[i] = { ...tiers[i], daysPerYear: Number(e.target.value) };
                        setEditItem({ ...editItem, tiers });
                      }} className="h-8" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Fraction</p>
                      <Input type="number" step="0.1" value={tier.fraction} onChange={e => {
                        const tiers = [...editItem.tiers];
                        tiers[i] = { ...tiers[i], fraction: Number(e.target.value) };
                        setEditItem({ ...editItem, tiers });
                      }} className="h-8" />
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setEditItem({ ...editItem, tiers: [...editItem.tiers, { fromYear: 0, toYear: null, daysPerYear: 30, fraction: 1 }] })}>
                  <Plus className="h-3 w-3 mr-1" />Add Tier
                </Button>
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
