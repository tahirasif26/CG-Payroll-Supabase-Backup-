import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { usePayrollSetups } from "@/contexts/PayrollSetupContext";
import { useEmployees } from "@/contexts/EmployeeContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyTableRow } from "@/components/EmptyState";
import { Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Copy, Trash2, ToggleLeft, ToggleRight, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { PayrollSetup } from "@/types/payrollSetup";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import AddPayrollSetupWizard from "@/components/payrollSetup/AddPayrollSetupWizard";

function SetupViewDialog({ setup, open, onClose }: { setup: PayrollSetup | null; open: boolean; onClose: () => void }) {
  if (!setup) return null;
  const earnings = setup.payslipComponents.filter(c => c.type === "earning");
  const deductions = setup.payslipComponents.filter(c => c.type === "deduction");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            {setup.name}
            <Badge variant={setup.status === "active" ? "default" : "secondary"} className="ml-2 text-[10px]">{setup.status}</Badge>
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{setup.country} · {setup.currency}</p>
        </DialogHeader>
        <ScrollArea className="max-h-[68vh] px-6 pb-6">
          <Tabs defaultValue="schedule" className="space-y-4">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="schedule">Pay Schedule</TabsTrigger>
              <TabsTrigger value="components">Components</TabsTrigger>
              <TabsTrigger value="tax">Tax Rules</TabsTrigger>
              <TabsTrigger value="overtime">Overtime</TabsTrigger>
              <TabsTrigger value="deductions">Auto Deductions</TabsTrigger>
              <TabsTrigger value="loan">Loan & Advance</TabsTrigger>
              <TabsTrigger value="settlement">Final Settlement</TabsTrigger>
            </TabsList>

            <TabsContent value="schedule">
              <Card><CardHeader><CardTitle className="text-sm">Pay Schedule</CardTitle></CardHeader><CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><Label className="text-muted-foreground text-xs">Frequency</Label><p className="capitalize">{setup.paySchedule.payFrequency}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Cycle</Label><p>{setup.paySchedule.cycleStartDate} – {setup.paySchedule.cycleEndDate === "EOM" ? "End of month" : setup.paySchedule.cycleEndDate}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Pay Date</Label><p>{setup.paySchedule.payDate}</p></div>
                </div>
              </CardContent></Card>
            </TabsContent>


            <TabsContent value="components">
              <Card><CardHeader><CardTitle className="text-sm">Payslip Components</CardTitle></CardHeader><CardContent className="space-y-4">
                {earnings.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Earnings</p>
                    <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Value</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                      <TableBody>{earnings.map(c => (
                        <TableRow key={c.id}><TableCell>{c.name}</TableCell><TableCell className="capitalize">{c.calculationType}</TableCell><TableCell>{c.calculationType === "percentage" ? `${c.value}%` : c.value}</TableCell><TableCell><Badge variant={c.status === "active" ? "default" : "secondary"} className="text-[10px]">{c.status}</Badge></TableCell></TableRow>
                      ))}</TableBody></Table>
                  </div>
                )}
                {deductions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Deductions</p>
                    <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Value</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                      <TableBody>{deductions.map(c => (
                        <TableRow key={c.id}><TableCell>{c.name}</TableCell><TableCell className="capitalize">{c.calculationType}</TableCell><TableCell>{c.calculationType === "percentage" ? `${c.value}%` : c.value}</TableCell><TableCell><Badge variant={c.status === "active" ? "default" : "secondary"} className="text-[10px]">{c.status}</Badge></TableCell></TableRow>
                      ))}</TableBody></Table>
                  </div>
                )}
                {earnings.length === 0 && deductions.length === 0 && <p className="text-sm text-muted-foreground">No components configured.</p>}
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="tax">
              <Card><CardHeader><CardTitle className="text-sm">Tax Rules</CardTitle></CardHeader><CardContent>
                {setup.taxRules.length > 0 ? (
                  <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>%</TableHead></TableRow></TableHeader>
                    <TableBody>{setup.taxRules.map(t => (
                      <TableRow key={t.id}><TableCell>{t.name}</TableCell><TableCell>{t.incomeFrom.toLocaleString()}</TableCell><TableCell>{t.incomeTo.toLocaleString()}</TableCell><TableCell>{t.percentage}%</TableCell></TableRow>
                    ))}</TableBody></Table>
                ) : <p className="text-sm text-muted-foreground">No tax rules configured.</p>}
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="overtime">
              <Card><CardHeader><CardTitle className="text-sm">Overtime</CardTitle></CardHeader><CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><Label className="text-muted-foreground text-xs">Enabled</Label><p>{setup.overtime.enabled ? "Yes" : "No"}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Rate Multiplier</Label><p>{setup.overtime.rateMultiplier}x</p></div>
                  <div><Label className="text-muted-foreground text-xs">Max Hours</Label><p>{setup.overtime.maxOvertimeHours}h</p></div>
                </div>
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="deductions">
              <Card><CardHeader><CardTitle className="text-sm">Auto Deductions</CardTitle></CardHeader><CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Late Penalty</span><span>{setup.autoDeductions.latePenaltyEnabled ? `${setup.autoDeductions.latePenaltyAmount}` : "Disabled"}</span></div>
                  <div className="flex justify-between"><span>Absence Deduction/Day</span><span>{setup.autoDeductions.absenceDeductionEnabled ? `${setup.autoDeductions.absenceDeductionPerDay}` : "Disabled"}</span></div>
                  {setup.autoDeductions.customRules.length > 0 && (
                    <>
                      <Separator />
                      <p className="text-xs font-semibold text-muted-foreground">Custom Rules</p>
                      {setup.autoDeductions.customRules.map(r => (
                        <div key={r.id} className="flex justify-between"><span>{r.name}</span><span>{r.enabled ? r.amount : "Disabled"}</span></div>
                      ))}
                    </>
                  )}
                </div>
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="loan">
              <Card><CardHeader><CardTitle className="text-sm">Loan & Advance</CardTitle></CardHeader><CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><Label className="text-muted-foreground text-xs">Advance Deduction</Label><p>{setup.loanAdvance.enableAdvanceDeduction ? "Enabled" : "Disabled"}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Max Deduction %</Label><p>{setup.loanAdvance.maxDeductionPercentage}%</p></div>
                  <div><Label className="text-muted-foreground text-xs">Auto Deduct Remaining</Label><p>{setup.loanAdvance.autoDeductRemaining ? "Yes" : "No"}</p></div>
                </div>
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="settlement">
              <Card><CardHeader><CardTitle className="text-sm">Final Settlement</CardTitle></CardHeader><CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><Label className="text-muted-foreground text-xs">Notice Period Recovery Days</Label><p>{setup.finalSettlement.noticePeriodRecoveryDays}</p></div>
                </div>
              </CardContent></Card>
            </TabsContent>


          </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default function PayrollSetupPage() {
  const { setups, deleteSetup, duplicateSetup, toggleStatus } = usePayrollSetups();
  const { employees } = useEmployees();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewSetup, setViewSetup] = useState<PayrollSetup | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editSetup, setEditSetup] = useState<PayrollSetup | null>(null);

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
      >
        <Button onClick={() => { setEditSetup(null); setWizardOpen(true); }}>
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
              <TableHead>Status</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="w-44">Actions</TableHead>
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
                    <Button variant="ghost" size="sm" title="View Details" onClick={() => navigate(`/payroll/setup/${s.id}/view`)}>
                      <Eye className="h-3 w-3 text-primary" />
                    </Button>
                    <Button variant="ghost" size="sm" title="Edit" onClick={() => { setEditSetup(s); setWizardOpen(true); }}>
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
              <EmptyTableRow
                colSpan={7}
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

      <SetupViewDialog setup={viewSetup} open={!!viewSetup} onClose={() => setViewSetup(null)} />

      <AddPayrollSetupWizard
        key={editSetup?.id ?? "new"}
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        initial={editSetup ?? undefined}
        editId={editSetup?.id}
      />
    </div>
  );
}