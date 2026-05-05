import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { usePayrollSetups } from "@/contexts/PayrollSetupContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Pencil } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function PayrollSetupViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getSetupById } = usePayrollSetups();
  const setup = id ? getSetupById(id) : undefined;

  if (!setup) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-muted-foreground">Setup not found.</p>
        <Button variant="outline" onClick={() => navigate("/payroll/setup")}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
      </div>
    );
  }

  const earnings = setup.payslipComponents.filter(c => c.type === "earning" && c.status === "active");
  const deductions = setup.payslipComponents.filter(c => c.type === "deduction" && c.status === "active");

  const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={setup.name}
        description={`${setup.country} · ${setup.currency} · Last updated: ${setup.lastUpdated}`}
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/payroll/setup")}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
          <Button onClick={() => navigate(`/payroll/setup/${setup.id}`)}><Pencil className="h-4 w-4 mr-1" />Edit Setup</Button>
        </div>
      </PageHeader>

      {/* Top summary */}
      <div className="rounded-lg border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Field label="Setup Name" value={setup.name} />
          <Field label="Country" value={setup.country} />
          <Field label="Currency" value={setup.currency} />
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <div><Badge variant={setup.status === "active" ? "default" : "secondary"}>{setup.status}</Badge></div>
          </div>
        </div>
      </div>

      {/* Tabs - same as edit but read-only */}
      <Tabs defaultValue="schedule" className="space-y-4">
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-auto">
            <TabsTrigger value="schedule">Pay Schedule</TabsTrigger>
            <TabsTrigger value="components">Components</TabsTrigger>
            <TabsTrigger value="tax">Tax Rules</TabsTrigger>
            <TabsTrigger value="salary">Salary Rules</TabsTrigger>
            <TabsTrigger value="overtime">Overtime</TabsTrigger>
            <TabsTrigger value="auto-deductions">Auto Deductions</TabsTrigger>
            <TabsTrigger value="loan">Loan & Advance</TabsTrigger>
            <TabsTrigger value="settlement">Final Settlement</TabsTrigger>
            <TabsTrigger value="approval">Approval</TabsTrigger>
          </TabsList>
        </ScrollArea>

        <div className="rounded-lg border p-6">
          {/* Pay Schedule */}
          <TabsContent value="schedule">
            <h3 className="text-lg font-semibold mb-4">Pay Schedule</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Field label="Pay Frequency" value={<span className="capitalize">{setup.paySchedule.payFrequency}</span>} />
              <Field label="Cycle Start Date" value={setup.paySchedule.cycleStartDate} />
              <Field label="Cycle End Date" value={setup.paySchedule.cycleEndDate} />
              <Field label="Pay Date" value={setup.paySchedule.payDate} />
              <Field label="Cutoff Date" value={setup.paySchedule.cutoffDate} />
            </div>
          </TabsContent>

          {/* Components */}
          <TabsContent value="components">
            <h3 className="text-lg font-semibold mb-4">Payslip Components</h3>
            {earnings.length > 0 && (
              <div className="mb-6">
                <p className="text-sm font-semibold text-muted-foreground mb-2">Earnings</p>
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Calculation</TableHead><TableHead>Value</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>{earnings.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="capitalize">{c.calculationType}</TableCell>
                      <TableCell>{c.calculationType === "percentage" ? `${c.value}%` : c.value.toLocaleString()}</TableCell>
                      <TableCell><Badge variant="default" className="text-[10px]">{c.status}</Badge></TableCell>
                    </TableRow>
                  ))}</TableBody>
                </Table>
              </div>
            )}
            {deductions.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-2">Deductions</p>
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Calculation</TableHead><TableHead>Value</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>{deductions.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="capitalize">{c.calculationType}</TableCell>
                      <TableCell>{c.calculationType === "percentage" ? `${c.value}%` : c.value.toLocaleString()}</TableCell>
                      <TableCell><Badge variant="destructive" className="text-[10px]">{c.status}</Badge></TableCell>
                    </TableRow>
                  ))}</TableBody>
                </Table>
              </div>
            )}
            {earnings.length === 0 && deductions.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No components configured.</p>}
          </TabsContent>

          {/* Tax Rules */}
          <TabsContent value="tax">
            <h3 className="text-lg font-semibold mb-4">Tax Rules</h3>
            {setup.taxRules.length > 0 ? (
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Income From</TableHead><TableHead>Income To</TableHead><TableHead>Percentage</TableHead><TableHead>Fixed Amount</TableHead></TableRow></TableHeader>
                <TableBody>{setup.taxRules.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>{t.incomeFrom.toLocaleString()}</TableCell>
                    <TableCell>{t.incomeTo.toLocaleString()}</TableCell>
                    <TableCell>{t.percentage}%</TableCell>
                    <TableCell>{t.fixedAmount ?? "—"}</TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            ) : <p className="text-sm text-muted-foreground py-8 text-center">No tax rules configured.</p>}
          </TabsContent>

          {/* Salary Rules */}
          <TabsContent value="salary">
            <h3 className="text-lg font-semibold mb-4">Salary Rules</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Field label="Salary Type" value={<span className="capitalize">{setup.salaryRules.salaryType}</span>} />
              <Field label="Proration Rule" value={<span className="capitalize">{setup.salaryRules.prorationRule.replace(/-/g, " ")}</span>} />
              <Field label="Working Days / Month" value={setup.salaryRules.workingDaysPerMonth} />
            </div>
          </TabsContent>

          {/* Overtime */}
          <TabsContent value="overtime">
            <h3 className="text-lg font-semibold mb-4">Overtime</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Field label="Enabled" value={setup.overtime.enabled ? "Yes" : "No"} />
              <Field label="Rate Multiplier" value={`${setup.overtime.rateMultiplier}x`} />
              <Field label="Max Overtime Hours" value={`${setup.overtime.maxOvertimeHours}h`} />
            </div>
          </TabsContent>

          {/* Auto Deductions */}
          <TabsContent value="auto-deductions">
            <h3 className="text-lg font-semibold mb-4">Auto Deductions</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <Label className="text-sm">Late Penalty</Label>
                  <span className="text-sm font-medium">{setup.autoDeductions.latePenaltyEnabled ? setup.autoDeductions.latePenaltyAmount : "Disabled"}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <Label className="text-sm">Absence Deduction / Day</Label>
                  <span className="text-sm font-medium">{setup.autoDeductions.absenceDeductionEnabled ? setup.autoDeductions.absenceDeductionPerDay : "Disabled"}</span>
                </div>
              </div>
              {setup.autoDeductions.customRules.length > 0 && (
                <>
                  <Separator />
                  <p className="text-sm font-semibold text-muted-foreground">Custom Rules</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {setup.autoDeductions.customRules.map(r => (
                      <div key={r.id} className="flex items-center justify-between rounded-lg border p-4">
                        <span className="text-sm">{r.name}</span>
                        <span className="text-sm font-medium">{r.enabled ? r.amount : "Disabled"}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* Loan & Advance */}
          <TabsContent value="loan">
            <h3 className="text-lg font-semibold mb-4">Loan & Advance</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Field label="Advance Deduction" value={setup.loanAdvance.enableAdvanceDeduction ? "Enabled" : "Disabled"} />
              <Field label="Max Deduction %" value={`${setup.loanAdvance.maxDeductionPercentage}%`} />
              <Field label="Auto Deduct Remaining" value={setup.loanAdvance.autoDeductRemaining ? "Yes" : "No"} />
            </div>
          </TabsContent>

          {/* Final Settlement */}
          <TabsContent value="settlement">
            <h3 className="text-lg font-semibold mb-4">Final Settlement</h3>
            <div className="space-y-4">
              <Field label="Notice Period Recovery Days" value={setup.finalSettlement.noticePeriodRecoveryDays} />
            </div>
          </TabsContent>

          {/* Approval */}
          <TabsContent value="approval">
            <h3 className="text-lg font-semibold mb-4">Approval Workflow</h3>
            <div className="space-y-4">
              <Field label="Enabled" value={setup.approvalWorkflow.enabled ? "Yes" : "No"} />
              {setup.approvalWorkflow.enabled && setup.approvalWorkflow.levels.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Approval Levels</Label>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {setup.approvalWorkflow.levels.map((l, i) => (
                      <Badge key={i} variant="outline" className="text-sm">{i + 1}. {l}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
