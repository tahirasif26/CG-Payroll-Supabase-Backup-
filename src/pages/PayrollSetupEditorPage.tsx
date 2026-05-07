import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { usePayrollSetups } from "@/contexts/PayrollSetupContext";
import { PayrollSetup } from "@/types/payrollSetup";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

import PayScheduleTab from "@/components/payrollSetup/PayScheduleTab";
import PayslipComponentsTab from "@/components/payrollSetup/PayslipComponentsTab";
import TaxRulesTab from "@/components/payrollSetup/TaxRulesTab";
import SalaryRulesTab from "@/components/payrollSetup/SalaryRulesTab";
import OvertimeTab from "@/components/payrollSetup/OvertimeTab";
import AutoDeductionsTab from "@/components/payrollSetup/AutoDeductionsTab";
import LoanAdvanceTab from "@/components/payrollSetup/LoanAdvanceTab";
import LeavesTab from "@/components/payrollSetup/LeavesTab";
import BonusTab, { syncBonusComponent } from "@/components/payrollSetup/BonusTab";
import GratuityTab, { syncGratuityComponent } from "@/components/payrollSetup/GratuityTab";
import ProvidentFundTab, { syncProvidentFundComponent } from "@/components/payrollSetup/ProvidentFundTab";
import FinalSettlementTab from "@/components/payrollSetup/FinalSettlementTab";


export const DEFAULT_PAYROLL_SETUP: PayrollSetup = {
  id: "",
  name: "",
  country: "Saudi Arabia",
  currency: "SAR",
  status: "active",
  lastUpdated: new Date().toISOString().split("T")[0],
  paySchedule: { payFrequency: "monthly", cycleStartDate: "1", cycleEndDate: "30", payDate: "28", cutoffDate: "25" },
  options: { includeOvertime: false, includeUnpaidLeave: false, enableTaxCalculation: false, allowNegativeSalary: false },
  payslipComponents: [],
  taxRules: [],
  salaryRules: { salaryType: "fixed", prorationRule: "calendar-days", workingDaysPerMonth: 30 },
  overtime: { enabled: false, rateMultiplier: 1.5, maxOvertimeHours: 40 },
  autoDeductions: { latePenaltyEnabled: false, latePenaltyAmount: 0, absenceDeductionEnabled: false, absenceDeductionPerDay: 0, customRules: [] },
  loanAdvance: { enableAdvanceDeduction: false, maxDeductionPercentage: 0, autoDeductRemaining: false },
  finalSettlement: { noticePeriodRecoveryDays: 30 },
  retirement: { enablePF: false, employeeContributionPct: 0, employerContributionPct: 0, enableVPS: false, vpsContributionRules: "" },
  leaves: {
    includeUnpaidLeave: false,
    leaveTypes: {
      annual: { enabled: true, days: 21 },
      sick: { enabled: true, days: 10 },
      emergency: { enabled: true, days: 3 },
      maternity: { enabled: true, days: 60 },
      paternity: { enabled: true, days: 3 },
      hajj: { enabled: true, days: 14 },
      unpaid: { enabled: true, days: 0 },
    },
    allowCarryForward: false,
    maxCarryForwardDays: 10,
  },
  bonus: { enabled: false, method: "percentage", value: 0, frequency: "annual", includeInPayslip: true },
  gratuity: { enabled: true, method: "saudi", slab1Days: 0, slab2Days: 15, slab3Days: 21, slab4Days: 30, maxMonths: 24, basis: "basic" },
  providentFund: { enabled: false, scheme: "gosi_saudi", employeeRate: 9.75, employerRate: 9.75, basis: "basic", autoDeduct: true },
  approvalWorkflow: { enabled: false, levels: [] },
};

export default function PayrollSetupEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getSetupById, addSetup, updateSetup } = usePayrollSetups();
  const isNew = !id || id === "new";

  const [setup, setSetup] = useState<PayrollSetup>({ ...DEFAULT_PAYROLL_SETUP, id: `ps-${Date.now()}` });

  useEffect(() => {
    if (!isNew && id) {
      const existing = getSetupById(id);
      if (existing) setSetup(existing);
    }
  }, [id, isNew, getSetupById]);

  const handleSave = async () => {
    if (!setup.name.trim()) {
      toast({ title: "Setup name is required", variant: "destructive" });
      return;
    }
    try {
      if (isNew) {
        await addSetup(setup);
        toast({ title: "Payroll setup created" });
      } else {
        await updateSetup(setup);
        toast({ title: "Payroll setup updated" });
      }
      navigate("/payroll/setup");
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message ?? String(e), variant: "destructive" });
    }
  };

  const countries = ["Saudi Arabia", "UAE", "Qatar", "Bahrain", "Kuwait", "Oman"];
  const currencies = ["SAR", "AED", "QAR", "BHD", "KWD", "OMR", "USD"];

  // Helpers for the inline option toggles surfaced in tax / salary / overtime tabs.
  const setOption = (key: keyof PayrollSetup["options"], v: boolean) =>
    setSetup(s => ({ ...s, options: { ...s.options, [key]: v } }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={isNew ? "New Payroll Setup" : `Edit: ${setup.name}`}
        description={isNew ? "Create a new payroll configuration." : "Modify payroll rules for this setup."}
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/payroll/setup")}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
          <Button onClick={handleSave}><Save className="h-4 w-4 mr-1" />Save Setup</Button>
        </div>
      </PageHeader>

      {/* Top section */}
      <div className="rounded-lg border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Setup Name</Label>
            <Input value={setup.name} onChange={e => setSetup(s => ({ ...s, name: e.target.value }))} placeholder="e.g. Saudi Full-Time" />
          </div>
          <div className="space-y-2">
            <Label>Country</Label>
            <Select value={setup.country} onValueChange={v => setSetup(s => ({ ...s, country: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={setup.currency} onValueChange={v => setSetup(s => ({ ...s, currency: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="flex items-center gap-2 pt-1">
              <Switch checked={setup.status === "active"} onCheckedChange={v => setSetup(s => ({ ...s, status: v ? "active" : "inactive" }))} />
              <span className="text-sm capitalize">{setup.status}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
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
            <TabsTrigger value="leaves">Leaves</TabsTrigger>
            <TabsTrigger value="bonus">Bonus</TabsTrigger>
            <TabsTrigger value="gratuity">Gratuity</TabsTrigger>
            <TabsTrigger value="provident">Provident Fund</TabsTrigger>
            <TabsTrigger value="settlement">Final Settlement</TabsTrigger>
          </TabsList>
        </ScrollArea>

        <div className="rounded-lg border p-6">
          <TabsContent value="schedule"><PayScheduleTab data={setup.paySchedule} onChange={d => setSetup(s => ({ ...s, paySchedule: d }))} /></TabsContent>
          <TabsContent value="components"><PayslipComponentsTab data={setup.payslipComponents} onChange={d => setSetup(s => ({ ...s, payslipComponents: d }))} /></TabsContent>

          <TabsContent value="tax">
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label>Enable tax calculation</Label>
                  <p className="text-xs text-muted-foreground">Apply configured tax slabs to payroll runs</p>
                </div>
                <Switch checked={setup.options.enableTaxCalculation} onCheckedChange={v => setOption("enableTaxCalculation", v)} />
              </div>
              <TaxRulesTab data={setup.taxRules} onChange={d => setSetup(s => ({ ...s, taxRules: d }))} />
            </div>
          </TabsContent>

          <TabsContent value="salary">
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label>Allow negative salary</Label>
                  <p className="text-xs text-muted-foreground">Permit net pay below zero after deductions</p>
                </div>
                <Switch checked={setup.options.allowNegativeSalary} onCheckedChange={v => setOption("allowNegativeSalary", v)} />
              </div>
              <SalaryRulesTab data={setup.salaryRules} onChange={d => setSetup(s => ({ ...s, salaryRules: d }))} />
            </div>
          </TabsContent>

          <TabsContent value="overtime">
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label>Include overtime in payroll</Label>
                  <p className="text-xs text-muted-foreground">Add overtime earnings to payslips</p>
                </div>
                <Switch checked={setup.options.includeOvertime} onCheckedChange={v => setOption("includeOvertime", v)} />
              </div>
              <OvertimeTab data={setup.overtime} onChange={d => setSetup(s => ({ ...s, overtime: d }))} />
            </div>
          </TabsContent>

          <TabsContent value="auto-deductions"><AutoDeductionsTab data={setup.autoDeductions} onChange={d => setSetup(s => ({ ...s, autoDeductions: d }))} /></TabsContent>
          <TabsContent value="loan"><LoanAdvanceTab data={setup.loanAdvance} onChange={d => setSetup(s => ({ ...s, loanAdvance: d }))} /></TabsContent>

          <TabsContent value="leaves">
            <LeavesTab
              data={setup.leaves}
              onChange={d => setSetup(s => ({
                ...s,
                leaves: d,
                // mirror unpaid-leave master toggle into legacy options for downstream calc
                options: { ...s.options, includeUnpaidLeave: d.includeUnpaidLeave },
              }))}
            />
          </TabsContent>
          <TabsContent value="bonus"><BonusTab data={setup.bonus} onChange={d => setSetup(s => ({ ...s, bonus: d, payslipComponents: syncBonusComponent(s.payslipComponents, d) }))} /></TabsContent>
          <TabsContent value="gratuity"><GratuityTab data={setup.gratuity} onChange={d => setSetup(s => ({ ...s, gratuity: d, payslipComponents: syncGratuityComponent(s.payslipComponents, d) }))} /></TabsContent>
          <TabsContent value="provident">
            <ProvidentFundTab
              data={setup.providentFund}
              onChange={d => setSetup(s => ({
                ...s,
                providentFund: d,
                // Mirror to legacy retirement object so existing summary/calc paths keep working.
                retirement: {
                  ...s.retirement,
                  enablePF: d.enabled,
                  employeeContributionPct: d.employeeRate,
                  employerContributionPct: d.employerRate,
                },
                payslipComponents: syncProvidentFundComponent(s.payslipComponents, d),
              }))}
            />
          </TabsContent>

          <TabsContent value="settlement"><FinalSettlementTab data={setup.finalSettlement} onChange={d => setSetup(s => ({ ...s, finalSettlement: d }))} /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
