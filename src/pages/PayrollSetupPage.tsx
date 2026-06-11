import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { usePayrollSetups } from "@/contexts/PayrollSetupContext";
import { useEmployees } from "@/contexts/EmployeeContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyTableRow } from "@/components/EmptyState";
import { Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Copy, Trash2, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { PayrollSetup } from "@/types/payrollSetup";
import AddPayrollSetupWizard, { type PayrollSetupWizardMode } from "@/components/payrollSetup/AddPayrollSetupWizard";

export default function PayrollSetupPage() {
  const { setups, deleteSetup, duplicateSetup } = usePayrollSetups();
  const { employees } = useEmployees();
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Single wizard instance reused for create / edit / view. `wizardMode`
  // controls which flavour it renders; `wizardSetup` is the row being acted on
  // (null when creating).
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState<PayrollSetupWizardMode>("create");
  const [wizardSetup, setWizardSetup] = useState<PayrollSetup | null>(null);

  const getAssignedCount = (setupId: string) => employees.filter(e => e.payrollSetupId === setupId).length;

  const openCreate = () => {
    setWizardSetup(null);
    setWizardMode("create");
    setWizardOpen(true);
  };
  const openEdit = (s: PayrollSetup) => {
    setWizardSetup(s);
    setWizardMode("edit");
    setWizardOpen(true);
  };
  const openView = (s: PayrollSetup) => {
    setWizardSetup(s);
    setWizardMode("view");
    setWizardOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteSetup(deleteId);
      toast({ title: "Setup deleted" });
      setDeleteId(null);
    } catch (err: unknown) {
      const message =
        (err as { error?: { message?: string }; message?: string })?.error?.message ??
        (err as { message?: string })?.message ??
        "Delete failed.";
      toast({ title: "Could not delete setup", description: message, variant: "destructive" });
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await duplicateSetup(id);
      toast({ title: "Setup duplicated" });
    } catch (err: unknown) {
      const message =
        (err as { error?: { message?: string }; message?: string })?.error?.message ??
        (err as { message?: string })?.message ??
        "Duplicate failed.";
      toast({ title: "Could not duplicate", description: message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll Setup"
        description="Configure payroll rules and structures for different employee groups."
      >
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />New Setup
        </Button>
      </PageHeader>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Setup Name</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Employees Assigned</TableHead>
              <TableHead>Pay Schedule</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="w-36">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {setups.map(s => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.country}</TableCell>
                <TableCell>{getAssignedCount(s.id)}</TableCell>
                <TableCell className="capitalize">{s.paySchedule.payFrequency}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{s.lastUpdated}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" title="View Details" onClick={() => openView(s)}>
                      <Eye className="h-3 w-3 text-primary" />
                    </Button>
                    <Button variant="ghost" size="sm" title="Edit" onClick={() => openEdit(s)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" title="Duplicate" onClick={() => handleDuplicate(s.id)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" title="Delete" onClick={() => setDeleteId(s.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {setups.length === 0 && (
              <EmptyTableRow
                colSpan={6}
                icon={SettingsIcon}
                title="No payroll setups configured"
                description="Create a payroll setup to start running payroll for your employees."
              />
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Setup</DialogTitle></DialogHeader>
          <DialogDescription>Are you sure you want to delete this payroll setup? This action cannot be undone.</DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single wizard instance — its mode prop dictates create / edit / view. */}
      <AddPayrollSetupWizard
        key={`${wizardMode}-${wizardSetup?.id ?? "new"}`}
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        mode={wizardMode}
        initial={wizardSetup ?? undefined}
        editId={wizardMode === "edit" && wizardSetup ? wizardSetup.id : undefined}
      />
    </div>
  );
}
