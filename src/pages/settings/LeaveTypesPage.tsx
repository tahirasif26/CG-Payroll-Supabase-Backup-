import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useLeaveTypes, LeaveType } from "@/contexts/LeaveTypeContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/StatusBadge";

export default function LeaveTypesPage() {
  const { leaveTypes, addLeaveType, updateLeaveType, deleteLeaveType } = useLeaveTypes();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", defaultDays: 21, isActive: true, isPaid: true });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { toast } = useToast();

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: "", defaultDays: 21, isActive: true, isPaid: true });
    setDialogOpen(true);
  };

  const openEdit = (lt: LeaveType) => {
    setEditingId(lt.id);
    setForm({ name: lt.name, defaultDays: lt.defaultDays, isActive: lt.isActive, isPaid: lt.isPaid });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editingId) {
      updateLeaveType(editingId, form);
      toast({ title: "Leave Type Updated", description: `${form.name} has been updated.` });
    } else {
      addLeaveType(form);
      toast({ title: "Leave Type Added", description: `${form.name} has been added.` });
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    const lt = leaveTypes.find(l => l.id === id);
    deleteLeaveType(id);
    setDeleteConfirm(null);
    toast({ title: "Leave Type Deleted", description: `${lt?.name} has been removed.` });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Leave Types" description="Configure leave categories and default entitlements.">
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />Add Leave Type
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Leave Type</TableHead>
                <TableHead className="font-semibold">Default Days</TableHead>
                <TableHead className="font-semibold">Paid</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaveTypes.map(lt => (
                <TableRow key={lt.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{lt.name}</TableCell>
                  <TableCell>{lt.defaultDays}</TableCell>
                  <TableCell>{lt.isPaid ? "Yes" : "No"}</TableCell>
                  <TableCell><StatusBadge status={lt.isActive ? "active" : "inactive"} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(lt)}><Edit2 className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteConfirm(lt.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {leaveTypes.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No leave types configured.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit" : "Add"} Leave Type</DialogTitle>
            <DialogDescription>{editingId ? "Update the leave type configuration." : "Add a new leave type category."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input placeholder="e.g. Annual Leave" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Default Days per Year</Label>
              <Input type="number" min={0} value={form.defaultDays} onChange={e => setForm({ ...form, defaultDays: Number(e.target.value) })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Paid Leave</Label>
              <Switch checked={form.isPaid} onCheckedChange={v => setForm({ ...form, isPaid: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={form.isActive} onCheckedChange={v => setForm({ ...form, isActive: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Leave Type</DialogTitle>
            <DialogDescription>Are you sure? This will also remove all employee allocations for this leave type.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
