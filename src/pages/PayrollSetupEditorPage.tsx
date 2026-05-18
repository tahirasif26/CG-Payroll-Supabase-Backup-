import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { usePayrollSetups } from "@/contexts/PayrollSetupContext";
import { PayrollSetup } from "@/types/payrollSetup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, ArrowRight, Save, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import PayScheduleTab from "@/components/payrollSetup/PayScheduleTab";
import PayslipComponentsTab from "@/components/payrollSetup/PayslipComponentsTab";
import SalaryRulesTab from "@/components/payrollSetup/SalaryRulesTab";
import LeavesTab from "@/components/payrollSetup/LeavesTab";
import FinalSettlementTab from "@/components/payrollSetup/FinalSettlementTab";
import OptionsTab from "@/components/payrollSetup/OptionsTab";
import { useClient } from "@/contexts/ClientContext";
import { COUNTRY_NAMES, CURRENCIES } from "@/lib/countries";


export const DEFAULT_PAYROLL_SETUP: PayrollSetup = {
  id: "",
  name: "",
  country: "Saudi Arabia",
  currency: "SAR",
  status: "active",
  lastUpdated: new Date().toISOString().split("T")[0],
  paySchedule: { payFrequency: "monthly", cycleStartDate: "1", cycleEndDate: "EOM", payDate: "28" },
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
  const { client } = useClient();
  const isNew = !id || id === "new";

  const [setup, setSetup] = useState<PayrollSetup>(() => ({
    ...DEFAULT_PAYROLL_SETUP,
    id: `ps-${Date.now()}`,
    country: client.country ?? DEFAULT_PAYROLL_SETUP.country,
    currency: client.currency ?? DEFAULT_PAYROLL_SETUP.currency,
  }));

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

  const countries = COUNTRY_NAMES;
  const currencies = CURRENCIES;

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
              <SelectContent className="max-h-72">{countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={setup.currency} onValueChange={v => setSetup(s => ({ ...s, currency: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">{currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
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

      {/* Stepper */}
      {(() => {
        const steps = [
          { id: "schedule", label: "Pay Schedule", content: (
            <PayScheduleTab data={setup.paySchedule} onChange={d => setSetup(s => ({ ...s, paySchedule: d }))} />
          )},
          { id: "options", label: "Options", content: (
            <OptionsTab setup={setup} setSetup={setSetup} />
          )},
          { id: "components", label: "Components", content: (
            <PayslipComponentsTab data={setup.payslipComponents} onChange={d => setSetup(s => ({ ...s, payslipComponents: d }))} />
          )},
          { id: "salary", label: "Salary Rules", content: (
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
          )},
          { id: "leaves", label: "Leaves", content: (
            <LeavesTab
              data={setup.leaves}
              onChange={d => setSetup(s => ({
                ...s,
                leaves: d,
                options: { ...s.options, includeUnpaidLeave: d.includeUnpaidLeave },
              }))}
            />
          )},
          { id: "settlement", label: "Final Settlement", content: (
            <FinalSettlementTab data={setup.finalSettlement} onChange={d => setSetup(s => ({ ...s, finalSettlement: d }))} />
          )},
        ];
        const isFirst = step === 0;
        const isLast = step === steps.length - 1;
        return (
          <div className="space-y-4">
            <ScrollArea className="w-full">
              <div className="flex items-center gap-2 pb-2">
                {steps.map((s, i) => {
                  const active = i === step;
                  const done = i < step;
                  return (
                    <div key={s.id} className="flex items-center gap-2 shrink-0">
                      <div
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm",
                          active && "bg-primary text-primary-foreground",
                          !active && done && "text-foreground",
                          !active && !done && "text-muted-foreground",
                        )}
                      >
                        <span className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold",
                          active ? "bg-primary-foreground text-primary" : done ? "bg-primary/20 text-primary" : "bg-muted-foreground/20"
                        )}>
                          {done ? <Check className="h-3 w-3" /> : i + 1}
                        </span>
                        <span className="whitespace-nowrap">{s.label}</span>
                      </div>
                      {i < steps.length - 1 && <div className="h-px w-6 bg-border" />}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="rounded-lg border p-6">{steps[step].content}</div>

            <div className="flex items-center justify-between gap-2">
              <Button variant="outline" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={isFirst}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              {isLast ? (
                <Button onClick={handleSave}><Save className="h-4 w-4 mr-1" /> {isNew ? "Create Setup" : "Update Setup"}</Button>
              ) : (
                <Button onClick={() => setStep(s => Math.min(steps.length - 1, s + 1))}>
                  Next <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
