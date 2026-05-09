import { useState, useEffect } from "react";
import { PayslipComponent } from "@/types/payrollSetup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Lock } from "lucide-react";

interface Props {
  data: PayslipComponent[];
  onChange: (data: PayslipComponent[]) => void;
}

const COMPONENT_NAMES = [
  "Housing Allowance (HRA)",
  "Transport Allowance",
  "Food Allowance",
  "Communication Allowance",
  "Medical Allowance",
  "Overtime Pay",
  "Performance Bonus",
  "Income Tax",
  "Loan Deduction",
  "Advance Recovery",
  "Absence Deduction",
  "Late Penalty",
  "Health Insurance",
];

const OTHER_VALUE = "__other__";

const BASIC_SALARY_ID = "comp-basic-salary";

const defaultBasicSalary = (): PayslipComponent => ({
  id: BASIC_SALARY_ID,
  name: "Basic Salary",
  type: "earning",
  calculationType: "percentage",
  value: 100,
  status: "active",
});

const empty: PayslipComponent = {
  id: "",
  name: "",
  type: "earning",
  calculationType: "percentage",
  value: 0,
  status: "active",
};

export default function PayslipComponentsTab({ data, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PayslipComponent>(empty);

  // Ensure Basic Salary is always present and pinned at the top.
  useEffect(() => {
    const hasBasic = data.some(c => c.id === BASIC_SALARY_ID || c.name === "Basic Salary");
    if (!hasBasic) {
      onChange([defaultBasicSalary(), ...data]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isBasic = (c: PayslipComponent) => c.id === BASIC_SALARY_ID || c.name === "Basic Salary";

  const save = () => {
    if (!editing.name) return;
    const normalized: PayslipComponent = { ...editing, status: "active" };
    if (editing.id) {
      onChange(data.map(c => c.id === editing.id ? normalized : c));
    } else {
      onChange([...data, { ...normalized, id: `comp-${Date.now()}` }]);
    }
    setOpen(false);
  };

  // Sort: Basic Salary first, then the rest in original order.
  const sorted = [...data].sort((a, b) => {
    if (isBasic(a)) return -1;
    if (isBasic(b)) return 1;
    return 0;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Payslip Components</h3>
        <Button size="sm" onClick={() => { setEditing(empty); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" />Add Component
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Basic Salary is the base reference (100%). Additions are added on top of it; Deductions are subtracted from it.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Applied As</TableHead>
            <TableHead>Calculation</TableHead>
            <TableHead>Value</TableHead>
            <TableHead className="w-20">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map(c => {
            const locked = isBasic(c);
            return (
              <TableRow key={c.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                    {c.name}
                    {locked && <Badge variant="secondary" className="text-[10px]">Default</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  {locked ? (
                    <Badge variant="outline" className="text-[10px]">Base</Badge>
                  ) : (
                    <Badge variant={c.type === "earning" ? "default" : "destructive"} className="text-[10px]">
                      {c.type === "earning" ? "Earnings" : "Deduction"}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="capitalize">{c.calculationType}</TableCell>
                <TableCell>
                  {c.calculationType === "percentage" ? `${c.value}%` : c.value.toLocaleString()}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {!locked && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(c); setOpen(true); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onChange(data.filter(x => x.id !== c.id))}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing.id ? "Edit" : "Add"} Component</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Applied As</Label>
                <Select value={editing.type} onValueChange={v => setEditing({ ...editing, type: v as any, name: "" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="earning">Earnings</SelectItem>
                    <SelectItem value="deduction">Deduction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Calculation Type</Label>
                <Select value={editing.calculationType} onValueChange={v => setEditing({ ...editing, calculationType: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Component Name</Label>
              <Select value={editing.name} onValueChange={v => setEditing({ ...editing, name: v })}>
                <SelectTrigger><SelectValue placeholder="Select a name" /></SelectTrigger>
                <SelectContent>
                  {COMPONENT_NAMES.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Value {editing.calculationType === "percentage" ? "(% of Basic Salary)" : "(fixed amount)"}</Label>
              <Input type="number" value={editing.value} onChange={e => setEditing({ ...editing, value: Number(e.target.value) })} />
            </div>
          </div>
          <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
