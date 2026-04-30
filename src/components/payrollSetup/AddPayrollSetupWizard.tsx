import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Calendar, Settings, Layers, Receipt, Wallet, Clock, MinusCircle,
  Banknote, Plane, FileCheck, PiggyBank, Workflow, Check, ArrowLeft, ArrowRight, Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePayrollSetups } from "@/contexts/PayrollSetupContext";
import type { PayrollSetup } from "@/types/payrollSetup";

import PayScheduleTab from "./PayScheduleTab";
import PayrollOptionsTab from "./PayrollOptionsTab";
import PayslipComponentsTab from "./PayslipComponentsTab";
import TaxRulesTab from "./TaxRulesTab";
import SalaryRulesTab from "./SalaryRulesTab";
import OvertimeTab from "./OvertimeTab";
import AutoDeductionsTab from "./AutoDeductionsTab";
import LoanAdvanceTab from "./LoanAdvanceTab";
import LeaveEncashmentTab from "./LeaveEncashmentTab";
import FinalSettlementTab from "./FinalSettlementTab";
import RetirementPoliciesTab from "./RetirementPoliciesTab";
import ApprovalWorkflowTab from "./ApprovalWorkflowTab";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: PayrollSetup;
  /** When provided, wizard runs in EDIT mode and calls updateSetup. */
  editId?: string;
}

const COUNTRIES = ["Saudi Arabia", "UAE", "Qatar", "Bahrain", "Kuwait", "Oman"];
const CURRENCIES = ["SAR", "AED", "QAR", "BHD", "KWD", "OMR", "USD"];

const defaultSetup = (): PayrollSetup => ({
  id: `ps-${Date.now()}`,
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
  leaveEncashment: { enabled: false, formula: "", leaveAllocations: [] },
  finalSettlement: { includeLeaveEncashment: false, includePendingSalary: true, includeDeductions: true, noticePeriodRecoveryDays: 30 },
  retirement: { enablePF: false, employeeContributionPct: 0, employerContributionPct: 0, enableVPS: false, vpsContributionRules: "" },
  approvalWorkflow: { enabled: false, levels: [] },
});

export default function AddPayrollSetupWizard({ open, onOpenChange, initial, editId }: Props) {
  const { addSetup, updateSetup } = usePayrollSetups();
  const { toast } = useToast();
  const [setup, setSetup] = useState<PayrollSetup>(initial ?? defaultSetup());
  const [step, setStep] = useState(0);

  const STEPS = useMemo(() => ([
    {
      id: "basics", label: "Basics", icon: Settings,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Setup Name *</Label>
            <Input value={setup.name} onChange={e => setSetup(s => ({ ...s, name: e.target.value }))} placeholder="e.g. Saudi Full-Time" />
          </div>
          <div className="space-y-2">
            <Label>Country</Label>
            <Select value={setup.country} onValueChange={v => setSetup(s => ({ ...s, country: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={setup.currency} onValueChange={v => setSetup(s => ({ ...s, currency: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Status</Label>
            <div className="flex items-center gap-2 pt-1">
              <Switch checked={setup.status === "active"} onCheckedChange={v => setSetup(s => ({ ...s, status: v ? "active" : "inactive" }))} />
              <span className="text-sm capitalize">{setup.status}</span>
            </div>
          </div>
        </div>
      ),
    },
    { id: "schedule", label: "Pay Schedule", icon: Calendar, content: <PayScheduleTab data={setup.paySchedule} onChange={d => setSetup(s => ({ ...s, paySchedule: d }))} /> },
    { id: "options", label: "Options", icon: Settings, content: <PayrollOptionsTab data={setup.options} onChange={d => setSetup(s => ({ ...s, options: d }))} /> },
    { id: "components", label: "Components", icon: Layers, content: <PayslipComponentsTab data={setup.payslipComponents} onChange={d => setSetup(s => ({ ...s, payslipComponents: d }))} /> },
    { id: "tax", label: "Tax Rules", icon: Receipt, content: <TaxRulesTab data={setup.taxRules} onChange={d => setSetup(s => ({ ...s, taxRules: d }))} /> },
    { id: "salary", label: "Salary Rules", icon: Wallet, content: <SalaryRulesTab data={setup.salaryRules} onChange={d => setSetup(s => ({ ...s, salaryRules: d }))} /> },
    { id: "overtime", label: "Overtime", icon: Clock, content: <OvertimeTab data={setup.overtime} onChange={d => setSetup(s => ({ ...s, overtime: d }))} /> },
    { id: "auto-deductions", label: "Auto Deductions", icon: MinusCircle, content: <AutoDeductionsTab data={setup.autoDeductions} onChange={d => setSetup(s => ({ ...s, autoDeductions: d }))} /> },
    { id: "loan", label: "Loan & Advance", icon: Banknote, content: <LoanAdvanceTab data={setup.loanAdvance} onChange={d => setSetup(s => ({ ...s, loanAdvance: d }))} /> },
    { id: "leave", label: "Leave Encashment", icon: Plane, content: <LeaveEncashmentTab data={setup.leaveEncashment} onChange={d => setSetup(s => ({ ...s, leaveEncashment: d }))} /> },
    { id: "settlement", label: "Final Settlement", icon: FileCheck, content: <FinalSettlementTab data={setup.finalSettlement} onChange={d => setSetup(s => ({ ...s, finalSettlement: d }))} /> },
    { id: "retirement", label: "Retirement", icon: PiggyBank, content: <RetirementPoliciesTab data={setup.retirement} onChange={d => setSetup(s => ({ ...s, retirement: d }))} /> },
    { id: "approval", label: "Approval", icon: Workflow, content: <ApprovalWorkflowTab data={setup.approvalWorkflow} onChange={d => setSetup(s => ({ ...s, approvalWorkflow: d }))} /> },
  ]), [setup]);

  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;
  const canSave = setup.name.trim().length > 0;

  const handleSave = () => {
    if (!canSave) {
      toast({ title: "Setup name is required", variant: "destructive" });
      setStep(0);
      return;
    }
    if (editId) {
      updateSetup({ ...setup, id: editId });
      toast({ title: "Payroll setup updated" });
    } else {
      addSetup(setup);
      toast({ title: "Payroll setup created" });
    }
    onOpenChange(false);
    setSetup(defaultSetup());
    setStep(0);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setStep(0); if (!editId) setSetup(defaultSetup()); } }}>
      <DialogContent className="max-w-5xl p-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle>{editId ? `Edit Payroll Setup` : "New Payroll Setup"}</DialogTitle>
          <DialogDescription>
            Step {step + 1} of {STEPS.length} — {STEPS[step].label}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-[220px_1fr] flex-1 min-h-0">
          {/* Stepper */}
          <ScrollArea className="border-r bg-muted/30">
            <div className="p-2 space-y-1">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const done = i < step;
                const active = i === step;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStep(i)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition",
                      active && "bg-primary text-primary-foreground",
                      !active && done && "text-foreground hover:bg-muted",
                      !active && !done && "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <span className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold shrink-0",
                      active ? "bg-primary-foreground text-primary" : done ? "bg-primary/20 text-primary" : "bg-muted-foreground/20"
                    )}>
                      {done ? <Check className="h-3 w-3" /> : i + 1}
                    </span>
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          {/* Content */}
          <ScrollArea className="min-h-0">
            <div className="p-6">{STEPS[step].content}</div>
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-6 py-3 border-t bg-background">
          <Button variant="outline" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={isFirst}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-2">
            {!isLast && (
              <Button variant="ghost" onClick={handleSave} disabled={!canSave}>
                <Save className="h-4 w-4 mr-1" /> Save & Close
              </Button>
            )}
            {isLast ? (
              <Button onClick={handleSave} disabled={!canSave}>
                <Save className="h-4 w-4 mr-1" /> {editId ? "Update Setup" : "Create Setup"}
              </Button>
            ) : (
              <Button onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
