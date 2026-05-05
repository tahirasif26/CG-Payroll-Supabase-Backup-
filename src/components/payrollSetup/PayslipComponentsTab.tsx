import { useState } from "react";
import { PayslipComponent } from "@/types/payrollSetup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Props {
  data: PayslipComponent[];
  onChange: (data: PayslipComponent[]) => void;
}

const EARNING_NAMES = [
  "Basic Salary",
  "Housing Allowance (HRA)",
  "Transport Allowance",
  "Food Allowance",
  "Communication Allowance",
  "Medical Allowance",
  "Overtime Pay",
  "Performance Bonus",
  "Other Earning",
];

const DEDUCTION_NAMES = [
  "GOSI (Employee 9.75%)",
  "Income Tax",
  "Loan Deduction",
  "Advance Recovery",
  "Absence Deduction",
  "Late Penalty",
  "Health Insurance",
  "Other Deduction",
];

const empty: PayslipComponent = { id: "", name: "", type: "earning", calculationType: "fixed", value: 0, status: "active" };

export default function PayslipComponentsTab({ data, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PayslipComponent>(empty);

  const save = () => {
    if (!editing.name) return;
    if (editing.id) {
      onChange(data.map(c => c.id === editing.id ? editing : c));
    } else {
      onChange([...data, { ...editing, id: `comp-${Date.now()}` }]);
    }
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Payslip Components</h3>
        <Button size="sm" onClick={() => { setEditing(empty); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add Component</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Calculation</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-20">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map(c => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.name}</TableCell>
              <TableCell><Badge variant={c.type === "earning" ? "default" : "destructive"} className="text-[10px]">{c.type}</Badge></TableCell>
              <TableCell className="capitalize">{c.calculationType}</TableCell>
              <TableCell>{c.calculationType === "percentage" ? `${c.value}%` : c.value.toLocaleString()}</TableCell>
              <TableCell><Badge variant={c.status === "active" ? "default" : "secondary"} className="text-[10px]">{c.status}</Badge></TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => onChange(data.filter(x => x.id !== c.id))}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {data.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No components configured</TableCell></TableRow>}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing.id ? "Edit" : "Add"} Component</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={editing.type} onValueChange={v => setEditing({ ...editing, type: v as any, name: "" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="earning">Earning</SelectItem><SelectItem value="deduction">Deduction</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Calculation Type</Label>
                <Select value={editing.calculationType} onValueChange={v => setEditing({ ...editing, calculationType: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="fixed">Fixed</SelectItem><SelectItem value="percentage">Percentage</SelectItem><SelectItem value="formula">Formula</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Component Name</Label>
              <Select value={editing.name} onValueChange={v => setEditing({ ...editing, name: v })}>
                <SelectTrigger><SelectValue placeholder="Select a name" /></SelectTrigger>
                <SelectContent>
                  {(editing.type === "earning" ? EARNING_NAMES : DEDUCTION_NAMES).map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Value {editing.calculationType === "percentage" ? "(%)" : ""}</Label><Input type="number" value={editing.value} onChange={e => setEditing({ ...editing, value: Number(e.target.value) })} /></div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editing.status} onValueChange={v => setEditing({ ...editing, status: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
