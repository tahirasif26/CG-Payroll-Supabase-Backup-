import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2, Trash2, Undo2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { employees } from "@/data/mockData";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface SeparationRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  empId: string;
  department: string;
  lastDate: string;
  reason: string;
  noticePeriodDays: number;
  noticePeriodServed: boolean;
  settlementAmount: number;
  status: "processed" | "reversed";
  processedDate: string;
}

// Mock separation records
const mockSeparations: SeparationRecord[] = [
  {
    id: "sep-1",
    employeeId: "10",
    employeeName: "Yusuf Kareem",
    empId: "CG-010",
    department: "Technology",
    lastDate: "2025-01-31",
    reason: "resignation",
    noticePeriodDays: 30,
    noticePeriodServed: true,
    settlementAmount: 45200,
    status: "processed",
    processedDate: "2025-01-15",
  },
];

export default function SeparationsPage() {
  const [separations, setSeparations] = useState<SeparationRecord[]>(mockSeparations);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<SeparationRecord | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const openEdit = (sep: SeparationRecord) => {
    setEditItem({ ...sep });
    setEditOpen(true);
  };

  const handleSave = () => {
    if (!editItem) return;
    setSeparations(prev => prev.map(s => s.id === editItem.id ? editItem : s));
    setEditOpen(false);
    toast({ title: "Updated", description: `Separation record for ${editItem.employeeName} updated.` });
  };

  const handleDelete = (id: string) => {
    const sep = separations.find(s => s.id === id);
    setSeparations(prev => prev.filter(s => s.id !== id));
    setDeleteConfirmOpen(false);
    setDeleteId(null);
    toast({
      title: "Separation Reversed",
      description: `${sep?.employeeName}'s separation has been reversed. Employee is now active again.`,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Separations" description="View and manage all employee separations. Deleting a separation will reactivate the employee." />

      <div className="bg-card rounded-xl border overflow-hidden">
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Employee</TableHead>
                <TableHead className="font-semibold">ID</TableHead>
                <TableHead className="font-semibold">Department</TableHead>
                <TableHead className="font-semibold">Last Date</TableHead>
                <TableHead className="font-semibold">Reason</TableHead>
                <TableHead className="font-semibold">Settlement (SAR)</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {separations.length > 0 ? separations.map(sep => (
                <TableRow key={sep.id}>
                  <TableCell className="font-medium">{sep.employeeName}</TableCell>
                  <TableCell className="font-mono text-sm">{sep.empId}</TableCell>
                  <TableCell>{sep.department}</TableCell>
                  <TableCell>{sep.lastDate}</TableCell>
                  <TableCell className="capitalize">{sep.reason}</TableCell>
                  <TableCell className="font-semibold">{sep.settlementAmount.toLocaleString()}</TableCell>
                  <TableCell><StatusBadge status={sep.status === "processed" ? "completed" : "active"} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(sep)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeleteId(sep.id); setDeleteConfirmOpen(true); }}>
                        <Undo2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No separations recorded.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Separation</DialogTitle>
            <DialogDescription>Update separation details for {editItem?.employeeName}.</DialogDescription>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Last Working Date</Label>
                <Input type="date" value={editItem.lastDate} onChange={e => setEditItem({ ...editItem, lastDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Select value={editItem.reason} onValueChange={v => setEditItem({ ...editItem, reason: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resignation">Resignation</SelectItem>
                    <SelectItem value="termination">Termination</SelectItem>
                    <SelectItem value="retirement">Retirement</SelectItem>
                    <SelectItem value="end_of_contract">End of Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notice Period (days)</Label>
                <Input type="number" value={editItem.noticePeriodDays} onChange={e => setEditItem({ ...editItem, noticePeriodDays: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Settlement Amount (SAR)</Label>
                <Input type="number" value={editItem.settlementAmount} onChange={e => setEditItem({ ...editItem, settlementAmount: Number(e.target.value) })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reverse Separation</DialogTitle>
            <DialogDescription>This will reverse the separation and reactivate the employee. Are you sure?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>
              <Undo2 className="h-4 w-4 mr-2" />Reverse & Reactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
