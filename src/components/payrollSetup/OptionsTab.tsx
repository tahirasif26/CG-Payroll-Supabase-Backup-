import { useState } from "react";
import { ChevronDown, Receipt, Clock, MinusCircle, Banknote, Gift, Award, PiggyBank, type LucideIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { PayrollSetup } from "@/types/payrollSetup";

import TaxRulesTab, { syncTaxComponent } from "./TaxRulesTab";
import OvertimeTab from "./OvertimeTab";
import AutoDeductionsTab from "./AutoDeductionsTab";
import LoanAdvanceTab from "./LoanAdvanceTab";
import BonusTab, { syncBonusComponent } from "./BonusTab";
import GratuityTab, { syncGratuityComponent } from "./GratuityTab";
import ProvidentFundTab, { syncProvidentFundComponent } from "./ProvidentFundTab";

interface Props {
  setup: PayrollSetup;
  setSetup: (updater: (prev: PayrollSetup) => PayrollSetup) => void;
}

interface OptionItem {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  content: React.ReactNode;
}

export default function OptionsTab({ setup, setSetup }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  const items: OptionItem[] = [
    {
      id: "tax",
      label: "Tax Rules",
      description: "Configure income tax slabs and payslip component.",
      icon: Receipt,
      enabled: setup.options.enableTaxCalculation,
      onToggle: (v) => setSetup(s => ({
        ...s,
        options: { ...s.options, enableTaxCalculation: v },
        payslipComponents: syncTaxComponent(s.payslipComponents, s.taxComponentName, v, s.taxRules.length > 0),
      })),
      content: (
        <TaxRulesTab
          data={setup.taxRules}
          onChange={d => setSetup(s => ({ ...s, taxRules: d, payslipComponents: syncTaxComponent(s.payslipComponents, s.taxComponentName, s.options.enableTaxCalculation, d.length > 0) }))}
          componentName={setup.taxComponentName}
          onComponentNameChange={n => setSetup(s => ({ ...s, taxComponentName: n, payslipComponents: syncTaxComponent(s.payslipComponents, n, s.options.enableTaxCalculation, s.taxRules.length > 0) }))}
          basis={setup.taxBasis ?? "gross"}
          onBasisChange={b => setSetup(s => ({ ...s, taxBasis: b }))}
        />
      ),
    },
    {
      id: "overtime",
      label: "Overtime",
      description: "Overtime rate multiplier and limits.",
      icon: Clock,
      enabled: setup.overtime.enabled,
      onToggle: (v) => setSetup(s => ({ ...s, overtime: { ...s.overtime, enabled: v }, options: { ...s.options, includeOvertime: v } })),
      content: <OvertimeTab data={setup.overtime} onChange={d => setSetup(s => ({ ...s, overtime: d }))} />,
    },
    {
      id: "auto-deductions",
      label: "Auto Deductions",
      description: "Late penalties, absence deductions and custom rules.",
      icon: MinusCircle,
      enabled:
        setup.autoDeductions.latePenaltyEnabled ||
        setup.autoDeductions.absenceDeductionEnabled ||
        setup.autoDeductions.customRules.length > 0,
      onToggle: (v) => setSetup(s => ({
        ...s,
        autoDeductions: v
          ? s.autoDeductions
          : { latePenaltyEnabled: false, latePenaltyAmount: 0, absenceDeductionEnabled: false, absenceDeductionPerDay: 0, customRules: s.autoDeductions.customRules.map(r => ({ ...r, enabled: false })) },
      })),
      content: <AutoDeductionsTab data={setup.autoDeductions} onChange={d => setSetup(s => ({ ...s, autoDeductions: d }))} />,
    },
    {
      id: "loan",
      label: "Loan & Advance",
      description: "Salary advance deduction limits.",
      icon: Banknote,
      enabled: setup.loanAdvance.enableAdvanceDeduction,
      onToggle: (v) => setSetup(s => ({ ...s, loanAdvance: { ...s.loanAdvance, enableAdvanceDeduction: v } })),
      content: <LoanAdvanceTab data={setup.loanAdvance} onChange={d => setSetup(s => ({ ...s, loanAdvance: d }))} />,
    },
    {
      id: "bonus",
      label: "Bonus",
      description: "Recurring bonus payouts and frequency.",
      icon: Gift,
      enabled: setup.bonus.enabled,
      onToggle: (v) => setSetup(s => {
        const next = { ...s.bonus, enabled: v };
        return { ...s, bonus: next, payslipComponents: syncBonusComponent(s.payslipComponents, next) };
      }),
      content: <BonusTab data={setup.bonus} onChange={d => setSetup(s => ({ ...s, bonus: d, payslipComponents: syncBonusComponent(s.payslipComponents, d) }))} />,
    },
    {
      id: "gratuity",
      label: "Gratuity",
      description: "End-of-service gratuity calculation.",
      icon: Award,
      enabled: setup.gratuity.enabled,
      onToggle: (v) => setSetup(s => {
        const next = { ...s.gratuity, enabled: v };
        return { ...s, gratuity: next, payslipComponents: syncGratuityComponent(s.payslipComponents, next) };
      }),
      content: <GratuityTab data={setup.gratuity} onChange={d => setSetup(s => ({ ...s, gratuity: d, payslipComponents: syncGratuityComponent(s.payslipComponents, d) }))} />,
    },
    {
      id: "provident",
      label: "Provident Fund",
      description: "Employee/employer contribution rates.",
      icon: PiggyBank,
      enabled: setup.providentFund.enabled,
      onToggle: (v) => setSetup(s => {
        const next = { ...s.providentFund, enabled: v };
        return {
          ...s,
          providentFund: next,
          retirement: { ...s.retirement, enablePF: v },
          payslipComponents: syncProvidentFundComponent(s.payslipComponents, next),
        };
      }),
      content: <ProvidentFundTab data={setup.providentFund} onChange={d => setSetup(s => ({ ...s, providentFund: d, retirement: { ...s.retirement, enablePF: d.enabled, employeeContributionPct: d.employeeRate, employerContributionPct: d.employerRate }, payslipComponents: syncProvidentFundComponent(s.payslipComponents, d) }))} />,
    },
  ];

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold">Payroll Options</h3>
        <p className="text-sm text-muted-foreground">Enable any option to configure its settings.</p>
      </div>

      <div className="rounded-md border divide-y">
        {items.map(item => {
          const Icon = item.icon;
          const isOpen = openId === item.id && item.enabled;
          return (
            <div key={item.id}>
              <div className="flex items-center gap-3 p-3">
                <button
                  type="button"
                  className="flex flex-1 items-center gap-3 text-left"
                  onClick={() => item.enabled && setOpenId(isOpen ? null : item.id)}
                  disabled={!item.enabled}
                >
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                  </div>
                  {item.enabled && (
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                  )}
                </button>
                <Switch
                  checked={item.enabled}
                  onCheckedChange={(v) => {
                    item.onToggle(v);
                    if (v) setOpenId(item.id);
                    else if (openId === item.id) setOpenId(null);
                  }}
                />
              </div>
              {isOpen && (
                <div className="border-t bg-muted/30 p-4">
                  {item.content}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
