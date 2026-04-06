import { useState } from "react";
import { TaxSlab } from "@/types/payrollSetup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Props {
  data: TaxSlab[];
  onChange: (data: TaxSlab[]) => void;
}

const empty: TaxSlab = { id: "", name: "", incomeFrom: 0, incomeTo: 0, percentage: 0, fixedAmount: 0 };

export default function TaxRulesTab({ data, onChange }: Props) {
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Tax Rules</h3>
        <Button size="sm" onClick={() => { setEditing(empty); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add Slab</Button>
      </div>
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
