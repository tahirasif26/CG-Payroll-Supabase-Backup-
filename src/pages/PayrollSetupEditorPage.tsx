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
import PayrollOptionsTab from "@/components/payrollSetup/PayrollOptionsTab";
import PayslipComponentsTab from "@/components/payrollSetup/PayslipComponentsTab";
import TaxRulesTab from "@/components/payrollSetup/TaxRulesTab";
import SalaryRulesTab from "@/components/payrollSetup/SalaryRulesTab";
import OvertimeTab from "@/components/payrollSetup/OvertimeTab";
import AutoDeductionsTab from "@/components/payrollSetup/AutoDeductionsTab";
import LoanAdvanceTab from "@/components/payrollSetup/LoanAdvanceTab";
import LeaveEncashmentTab from "@/components/payrollSetup/LeaveEncashmentTab";
import FinalSettlementTab from "@/components/payrollSetup/FinalSettlementTab";
import RetirementPoliciesTab from "@/components/payrollSetup/RetirementPoliciesTab";
import ApprovalWorkflowTab from "@/components/payrollSetup/ApprovalWorkflowTab";

const defaultSetup: PayrollSetup = {
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
  leaveEncashment: { enabled: false, formula: "" },
  finalSettlement: { includeLeaveEncashment: false, includePendingSalary: true, includeDeductions: true, noticePeriodRecoveryDays: 30 },
  retirement: { enablePF: false, employeeContributionPct: 0, employerContributionPct: 0, enableVPS: false, vpsContributionRules: "" },
  approvalWorkflow: { enabled: false, levels: [] },
};

export default function PayrollSetupEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getSetupById, addSetup, updateSetup } = usePayrollSetups();
  const isNew = !id || id === "new";

  const [setup, setSetup] = useState<PayrollSetup>({ ...defaultSetup, id: `ps-${Date.now()}` });

  useEffect(() => {
    if (!isNew && id) {
      const existing = getSetupById(id);
      if (existing) setSetup(existing);
    }
  }, [id, isNew, getSetupById]);

  const handleSave = () => {
    if (!setup.name.trim()) {
      toast({ title: "Setup name is required", variant: "destructive" });
      return;
    }
    if (isNew) {
      addSetup(setup);
      toast({ title: "Payroll setup created" });
    } else {
      updateSetup(setup);
      toast({ title: "Payroll setup updated" });
    }
    navigate("/payroll/setup");
  };

  const countries = ["Saudi Arabia", "UAE", "Qatar", "Bahrain", "Kuwait", "Oman"];
  const currencies = ["SAR", "AED", "QAR", "BHD", "KWD", "OMR", "USD"];

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
            <TabsTrigger value="options">Options</TabsTrigger>
            <TabsTrigger value="components">Components</TabsTrigger>
            <TabsTrigger value="tax">Tax Rules</TabsTrigger>
            <TabsTrigger value="salary">Salary Rules</TabsTrigger>
            <TabsTrigger value="overtime">Overtime</TabsTrigger>
            <TabsTrigger value="auto-deductions">Auto Deductions</TabsTrigger>
            <TabsTrigger value="loan">Loan & Advance</TabsTrigger>
            <TabsTrigger value="leave">Leave & Encash</TabsTrigger>
            <TabsTrigger value="settlement">Final Settlement</TabsTrigger>
            <TabsTrigger value="retirement">Retirement</TabsTrigger>
            <TabsTrigger value="approval">Approval</TabsTrigger>
          </TabsList>
        </ScrollArea>

        <div className="rounded-lg border p-6">
          <TabsContent value="schedule"><PayScheduleTab data={setup.paySchedule} onChange={d => setSetup(s => ({ ...s, paySchedule: d }))} /></TabsContent>
          <TabsContent value="options"><PayrollOptionsTab data={setup.options} onChange={d => setSetup(s => ({ ...s, options: d }))} /></TabsContent>
          <TabsContent value="components"><PayslipComponentsTab data={setup.payslipComponents} onChange={d => setSetup(s => ({ ...s, payslipComponents: d }))} /></TabsContent>
          <TabsContent value="tax"><TaxRulesTab data={setup.taxRules} onChange={d => setSetup(s => ({ ...s, taxRules: d }))} /></TabsContent>
          <TabsContent value="salary"><SalaryRulesTab data={setup.salaryRules} onChange={d => setSetup(s => ({ ...s, salaryRules: d }))} /></TabsContent>
          <TabsContent value="overtime"><OvertimeTab data={setup.overtime} onChange={d => setSetup(s => ({ ...s, overtime: d }))} /></TabsContent>
          <TabsContent value="auto-deductions"><AutoDeductionsTab data={setup.autoDeductions} onChange={d => setSetup(s => ({ ...s, autoDeductions: d }))} /></TabsContent>
          <TabsContent value="loan"><LoanAdvanceTab data={setup.loanAdvance} onChange={d => setSetup(s => ({ ...s, loanAdvance: d }))} /></TabsContent>
          <TabsContent value="leave"><LeaveEncashmentTab data={setup.leaveEncashment} onChange={d => setSetup(s => ({ ...s, leaveEncashment: d }))} /></TabsContent>
          <TabsContent value="settlement"><FinalSettlementTab data={setup.finalSettlement} onChange={d => setSetup(s => ({ ...s, finalSettlement: d }))} /></TabsContent>
          <TabsContent value="retirement"><RetirementPoliciesTab data={setup.retirement} onChange={d => setSetup(s => ({ ...s, retirement: d }))} /></TabsContent>
          <TabsContent value="approval"><ApprovalWorkflowTab data={setup.approvalWorkflow} onChange={d => setSetup(s => ({ ...s, approvalWorkflow: d }))} /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
