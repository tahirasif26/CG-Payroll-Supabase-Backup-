import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { usePayrollSetups } from "@/contexts/PayrollSetupContext";
import { useEmployees } from "@/contexts/EmployeeContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Copy, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function PayrollSetupPage() {
  const { setups, deleteSetup, duplicateSetup, toggleStatus } = usePayrollSetups();
  const { employees } = useEmployees();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const getAssignedCount = (setupId: string) => employees.filter(e => e.payrollSetupId === setupId).length;

  const handleDelete = () => {
    if (deleteId) {
      deleteSetup(deleteId);
      toast({ title: "Setup deleted" });
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll Setup"
        description="Configure payroll rules and structures for different employee groups."
        actions={
          <Button onClick={() => navigate("/payroll/setup/new")}>
            <Plus className="h-4 w-4 mr-1" />New Setup
          </Button>
        }
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Setup Name</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Employees Assigned</TableHead>
              <TableHead>Pay Schedule</TableHead>
              <TableHead>Status</TableHead>
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
                <TableCell>
                  <Badge variant={s.status === "active" ? "default" : "secondary"} className="text-[10px]">
                    {s.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">{s.lastUpdated}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" title="Edit" onClick={() => navigate(`/payroll/setup/${s.id}`)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" title="Duplicate" onClick={() => { duplicateSetup(s.id); toast({ title: "Setup duplicated" }); }}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" title={s.status === "active" ? "Deactivate" : "Activate"} onClick={() => { toggleStatus(s.id); toast({ title: `Setup ${s.status === "active" ? "deactivated" : "activated"}` }); }}>
                      {s.status === "active" ? <ToggleRight className="h-3 w-3" /> : <ToggleLeft className="h-3 w-3" />}
                    </Button>
                    <Button variant="ghost" size="sm" title="Delete" onClick={() => setDeleteId(s.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {setups.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">No payroll setups configured yet.</TableCell></TableRow>
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
    </div>
  );
}
