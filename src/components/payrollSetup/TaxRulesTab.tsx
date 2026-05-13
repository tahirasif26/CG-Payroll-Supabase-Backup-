import { useState } from "react";
import { TaxSlab, PayslipComponent } from "@/types/payrollSetup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";

const TAX_COMPONENT_ID = "__income_tax__";

/**
 * Maintain a single Income Tax deduction row on the payslip components list.
 * The actual amount is computed at payroll time from slab brackets — here we
 * just expose the component so it shows on payslips. We use calculationType
 * "formula" with formula="tax_slabs" as a marker for the calculator.
 */
export function syncTaxComponent(
  components: PayslipComponent[],
  taxComponentName: string | undefined,
  enabled: boolean,
  hasSlabs: boolean,
): PayslipComponent[] {
  const name = (taxComponentName ?? "").trim();
  const nameLower = name.toLowerCase();
  // Drop the previous synced row AND any other deduction with the same name
  // (case-insensitive) so the slab-driven row is the single source of truth.
  const others = components.filter(c => {
    if (c.id === TAX_COMPONENT_ID) return false;
    if (nameLower && c.type === "deduction" && (c.name ?? "").trim().toLowerCase() === nameLower) return false;
    return true;
  });
  if (!enabled || !name || !hasSlabs) return others;
  return [
    ...others,
    {
      id: TAX_COMPONENT_ID,
      name,
      type: "deduction",
      calculationType: "formula",
      value: 0,
      formula: "tax_slabs",
      status: "active",
    },
  ];
}

interface Props {
  data: TaxSlab[];
  onChange: (data: TaxSlab[]) => void;
  componentName?: string;
  onComponentNameChange?: (name: string) => void;
  enabled?: boolean;
  onEnabledChange?: (v: boolean) => void;
  basis?: "basic" | "gross";
  onBasisChange?: (b: "basic" | "gross") => void;
  bracketBasis?: "monthly" | "annual";
  onBracketBasisChange?: (b: "monthly" | "annual") => void;
}

const empty: TaxSlab = { id: "", name: "", incomeFrom: 0, incomeTo: 0, percentage: 0, fixedAmount: 0 };

export default function TaxRulesTab({ data, onChange, componentName, onComponentNameChange, enabled = true, onEnabledChange, basis = "gross", onBasisChange, bracketBasis = "annual", onBracketBasisChange }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TaxSlab>(empty);

  const save = () => {
    if (!editing.name) return;
    if (editing.id) {
      onChange(data.map(t => t.id === editing.id ? editing : t));
    } else {
      onChange([...data, { ...editing, id: `tax-${Date.now()}` }]);
    }
    setOpen(false);
  };

  const nameMissing = enabled && data.length > 0 && !(componentName ?? "").trim();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Tax Rules</h3>
        <Button size="sm" onClick={() => { setEditing(empty); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add Slab</Button>
      </div>

      {onEnabledChange && (
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label>Enable tax calculation</Label>
            <p className="text-xs text-muted-foreground">Apply configured tax slabs to payroll runs and show on payslip</p>
          </div>
          <Switch checked={enabled} onCheckedChange={onEnabledChange} />
        </div>
      )}

      {onComponentNameChange && (
        <div className="space-y-2 rounded-lg border p-4">
          <Label>
            Payslip component name <span className="text-destructive">*</span>
          </Label>
          <Input
            value={componentName ?? ""}
            placeholder="e.g. Income Tax"
            onChange={e => onComponentNameChange(e.target.value)}
            aria-invalid={nameMissing}
          />
          <p className="text-xs text-muted-foreground">
            A single deduction row with this name appears on the payslip. The amount is calculated from the slab brackets based on each employee's salary — only the applicable slab(s) apply per employee.
          </p>
          {nameMissing && (
            <p className="text-xs text-destructive">Component name is required when tax slabs are configured.</p>
          )}
        </div>
      )}

      {onBasisChange && (
        <div className="space-y-2 rounded-lg border p-4">
          <Label>Apply tax slabs on</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={basis === "basic" ? "default" : "outline"}
              onClick={() => onBasisChange("basic")}
            >
              Basic Salary
            </Button>
            <Button
              type="button"
              size="sm"
              variant={basis === "gross" ? "default" : "outline"}
              onClick={() => onBasisChange("gross")}
            >
              Gross (Basic + Earnings)
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Monthly {basis === "basic" ? "basic salary" : "gross pay"} is matched against the slab brackets.
          </p>
        </div>
      )}


      <Table>
        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Income From</TableHead><TableHead>Income To</TableHead><TableHead>%</TableHead><TableHead>Fixed Amt</TableHead><TableHead className="w-20">Actions</TableHead></TableRow></TableHeader>
        <TableBody>
          {data.map(t => (
            <TableRow key={t.id}>
              <TableCell className="font-medium">{t.name}</TableCell>
              <TableCell>{t.incomeFrom.toLocaleString()}</TableCell>
              <TableCell>{t.incomeTo.toLocaleString()}</TableCell>
              <TableCell>{t.percentage}%</TableCell>
              <TableCell>{t.fixedAmount?.toLocaleString() || "—"}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(t); setOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => onChange(data.filter(x => x.id !== t.id))}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {data.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No tax rules configured</TableCell></TableRow>}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing.id ? "Edit" : "Add"} Tax Slab</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Income From</Label><Input type="number" value={editing.incomeFrom} onChange={e => setEditing({ ...editing, incomeFrom: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Income To</Label><Input type="number" value={editing.incomeTo} onChange={e => setEditing({ ...editing, incomeTo: Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Percentage (%)</Label><Input type="number" value={editing.percentage} onChange={e => setEditing({ ...editing, percentage: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Fixed Amount (optional)</Label><Input type="number" value={editing.fixedAmount || 0} onChange={e => setEditing({ ...editing, fixedAmount: Number(e.target.value) })} /></div>
            </div>
          </div>
          <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
