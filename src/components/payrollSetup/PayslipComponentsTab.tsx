import { useMemo, useState } from "react";
import { PayslipComponent } from "@/types/payrollSetup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Calculator, MinusCircle, PlusCircle } from "lucide-react";

interface Props {
  data: PayslipComponent[];
  onChange: (data: PayslipComponent[]) => void;
}

const DEDUCTION_NAMES = [
  "GOSI (Employee 9.75%)",
  "GOSI (Employer 9.75%)",
  "Income Tax",
  "Absence Deduction",
  "Late Penalty",
  "Loan Deduction",
  "Advance Recovery",
  "Health Insurance",
  "Other Deduction",
];

const ADDITION_NAMES = [
  "Housing Allowance (HRA)",
  "Transport Allowance",
  "Food Allowance",
  "Communication Allowance",
  "Medical Allowance",
  "Performance Bonus",
  "Overtime Pay",
  "Other Allowance",
];

type Section = "deduction" | "addition";

const calcAmount = (c: PayslipComponent, base: number) =>
  c.calculationType === "percentage" ? Math.round((base * c.value) / 100) : c.value;

export default function PayslipComponentsTab({ data, onChange }: Props) {
  const [previewBase, setPreviewBase] = useState<number>(10000);
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<Section>("deduction");
  const [name, setName] = useState("");
  const [calculationType, setCalculationType] = useState<"percentage" | "fixed">("percentage");
  const [value, setValue] = useState<number>(0);

  // Derive sections from existing flat array (keeps persisted shape intact).
  const deductions = useMemo(
    () => data.filter(c => c.type === "deduction"),
    [data]
  );
  const additions = useMemo(
    () => data.filter(c => c.type === "earning" && !/^basic/i.test(c.name)),
    [data]
  );

  const totalDeductionAmount = deductions.reduce((s, c) => s + calcAmount(c, previewBase), 0);
  const netBase = previewBase - totalDeductionAmount;
  const deductionPercent = previewBase > 0 ? (totalDeductionAmount / previewBase) * 100 : 0;
  const totalAdditionAmount = additions.reduce((s, c) => s + calcAmount(c, previewBase), 0);
  const grossTotal = netBase + totalAdditionAmount;

  const openAdd = (s: Section) => {
    setSection(s);
    setName("");
    setCalculationType("percentage");
    setValue(0);
    setOpen(true);
  };

  const save = () => {
    if (!name) return;
    const next: PayslipComponent = {
      id: `comp-${Date.now()}`,
      name,
      type: section === "deduction" ? "deduction" : "earning",
      calculationType,
      value: Number(value) || 0,
      status: "active",
    };
    onChange([...data, next]);
    setOpen(false);
  };

  const remove = (id: string) => onChange(data.filter(c => c.id !== id));

  const renderRow = (c: PayslipComponent) => (
    <div
      key={c.id}
      className="flex items-center justify-between gap-3 px-3 py-2 border-b last:border-b-0 text-sm"
    >
      <span className="font-medium flex-1 truncate">{c.name}</span>
      <span className="w-24 text-right tabular-nums text-muted-foreground">
        {c.calculationType === "percentage" ? `${c.value}%` : "Fixed"}
      </span>
      <span className="w-32 text-right tabular-nums">
        SAR {calcAmount(c, previewBase).toLocaleString()}
      </span>
      <Button variant="ghost" size="sm" onClick={() => remove(c.id)} className="shrink-0">
        <Trash2 className="h-3.5 w-3.5 text-destructive" />
      </Button>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Preview Base Salary */}
      <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border">
        <Label className="text-sm font-medium whitespace-nowrap">Preview with Base Salary:</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">SAR</span>
          <Input
            type="number"
            className="w-32 h-8 text-sm"
            value={previewBase}
            onChange={e => setPreviewBase(Number(e.target.value) || 0)}
            placeholder="10000"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          (for preview only — actual salary set per employee)
        </span>
      </div>

      {/* Base Salary panel */}
      <Card>
        <CardContent className="flex items-center justify-between py-3">
          <div>
            <div className="text-sm font-semibold">Base Salary</div>
            <div className="text-xs text-muted-foreground">Always 100% — entered per employee</div>
          </div>
          <div className="text-base font-semibold tabular-nums">SAR {previewBase.toLocaleString()}</div>
        </CardContent>
      </Card>

      {/* Deductions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MinusCircle className="h-4 w-4 text-destructive" />
            <h3 className="text-sm font-semibold uppercase tracking-wide">Deductions</h3>
            <span className="text-xs text-muted-foreground">(from Base Salary)</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => openAdd("deduction")}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Deduction
          </Button>
        </div>
        <Card>
          <CardContent className="p-0">
            {deductions.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-6">No deductions configured</div>
            ) : (
              deductions.map(renderRow)
            )}
          </CardContent>
        </Card>
        {deductions.length > 0 && (
          <div className="text-xs text-muted-foreground mt-2 pl-1">
            Base Salary after deductions:{" "}
            <span className="font-medium text-foreground">
              SAR {netBase.toLocaleString()} ({(100 - deductionPercent).toFixed(2)}%)
            </span>
          </div>
        )}
      </div>

      {/* Additions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold uppercase tracking-wide">Additions</h3>
            <span className="text-xs text-muted-foreground">(on top of Base Salary)</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => openAdd("addition")}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Allowance
          </Button>
        </div>
        <Card>
          <CardContent className="p-0">
            {additions.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-6">No allowances configured</div>
            ) : (
              additions.map(renderRow)
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live Breakdown */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Live Salary Breakdown Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 font-mono text-sm">
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Base Salary</span>
              <span className="font-semibold tabular-nums">SAR {previewBase.toLocaleString()}</span>
            </div>

            {deductions.map(d => (
              <div key={d.id} className="flex justify-between py-0.5 text-destructive/80">
                <span>− {d.name}</span>
                <span className="tabular-nums">
                  SAR {calcAmount(d, previewBase).toLocaleString()}
                  <span className="text-xs ml-2 opacity-60">
                    ({d.calculationType === "percentage" ? `${d.value}%` : "fixed"})
                  </span>
                </span>
              </div>
            ))}

            <div className="flex justify-between py-1 border-t border-border mt-1 font-medium">
              <span>Net Base ({(100 - deductionPercent).toFixed(2)}%)</span>
              <span className="tabular-nums">SAR {netBase.toLocaleString()}</span>
            </div>

            {additions.map(a => (
              <div key={a.id} className="flex justify-between py-0.5 text-emerald-600">
                <span>+ {a.name}</span>
                <span className="tabular-nums">
                  SAR {calcAmount(a, previewBase).toLocaleString()}
                  <span className="text-xs ml-2 opacity-60">
                    ({a.calculationType === "percentage" ? `${a.value}% of base` : "fixed"})
                  </span>
                </span>
              </div>
            ))}

            <div className="flex justify-between py-2 border-t-2 border-primary/30 mt-1 font-bold text-base">
              <span>Gross Total</span>
              <span className="text-primary tabular-nums">SAR {grossTotal.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {section === "deduction" ? "Deduction" : "Allowance"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Select value={name} onValueChange={setName}>
                <SelectTrigger><SelectValue placeholder="Select a name" /></SelectTrigger>
                <SelectContent>
                  {(section === "deduction" ? DEDUCTION_NAMES : ADDITION_NAMES).map(n => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Calculation Type</Label>
                <Select value={calculationType} onValueChange={v => setCalculationType(v as "percentage" | "fixed")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">% of Base Salary</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Value {calculationType === "percentage" ? "(%)" : "(SAR)"}</Label>
                <Input
                  type="number"
                  value={value}
                  onChange={e => setValue(Number(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={save} disabled={!name}>
              Add {section === "deduction" ? "Deduction" : "Allowance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
