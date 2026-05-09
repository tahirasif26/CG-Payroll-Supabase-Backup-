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
  Calendar, Settings, Layers, Wallet, FileCheck, Check, ArrowLeft, ArrowRight, Save,
  Plane, SlidersHorizontal,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePayrollSetups } from "@/contexts/PayrollSetupContext";
import type { PayrollSetup } from "@/types/payrollSetup";

import PayScheduleTab from "./PayScheduleTab";
import PayslipComponentsTab from "./PayslipComponentsTab";
import SalaryRulesTab from "./SalaryRulesTab";
import LeavesTab from "./LeavesTab";
import FinalSettlementTab from "./FinalSettlementTab";
import OptionsTab from "./OptionsTab";
import { useClient } from "@/contexts/ClientContext";
import { COUNTRY_NAMES, CURRENCIES } from "@/lib/countries";


interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: PayrollSetup;
  /** When provided, wizard runs in EDIT mode and calls updateSetup. */
  editId?: string;
}

const defaultSetup = (clientCountry: string, clientCurrency: string): PayrollSetup => ({
  id: `ps-${Date.now()}`,
  name: "",
  country: clientCountry,
  currency: clientCurrency,
  status: "active",
  lastUpdated: new Date().toISOString().split("T")[0],
  paySchedule: { payFrequency: "monthly", cycleStartDate: "1", cycleEndDate: "30", payDate: "28", cutoffDate: "25" },
  options: { includeOvertime: false, includeUnpaidLeave: false, enableTaxCalculation: false, allowNegativeSalary: false },
  payslipComponents: [
    { id: "comp-basic-salary", name: "Basic Salary", type: "earning", calculationType: "percentage", value: 100, status: "active" },
  ],
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
    { id: "components", label: "Components", icon: Layers, content: <PayslipComponentsTab data={setup.payslipComponents} onChange={d => setSetup(s => ({ ...s, payslipComponents: d }))} /> },
    { id: "salary", label: "Salary Rules", icon: Wallet, content: <SalaryRulesTab data={setup.salaryRules} onChange={d => setSetup(s => ({ ...s, salaryRules: d }))} /> },
    { id: "leaves", label: "Leaves", icon: Plane, content: <LeavesTab data={setup.leaves} onChange={d => setSetup(s => ({ ...s, leaves: d, options: { ...s.options, includeUnpaidLeave: d.includeUnpaidLeave } }))} /> },
    { id: "options", label: "Options", icon: SlidersHorizontal, content: <OptionsTab setup={setup} setSetup={setSetup} /> },
    { id: "settlement", label: "Final Settlement", icon: FileCheck, content: <FinalSettlementTab data={setup.finalSettlement} onChange={d => setSetup(s => ({ ...s, finalSettlement: d }))} /> },
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
