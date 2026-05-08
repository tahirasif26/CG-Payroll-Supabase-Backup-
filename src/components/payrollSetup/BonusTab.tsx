import { BonusSettings, PayslipComponent } from "@/types/payrollSetup";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const BONUS_COMPONENT_ID = "__bonus__";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAYS_OF_WEEK = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

/**
 * Mirror bonus settings as a single earning component on the payslip list.
 * Removed when disabled, when name is empty, or when "include in payslip" is off.
 */
export function syncBonusComponent(
  components: PayslipComponent[],
  b: BonusSettings,
): PayslipComponent[] {
  const others = components.filter(c => c.id !== BONUS_COMPONENT_ID);
  const name = (b.componentName ?? "").trim();
  if (!b.enabled || !name || !b.includeInPayslip) return others;
  return [
    ...others,
    {
      id: BONUS_COMPONENT_ID,
      name,
      type: "earning",
      calculationType: b.method === "fixed" ? "fixed" : "percentage",
      value: b.value,
      status: "active",
    },
  ];
}

interface Props {
  data: BonusSettings;
  onChange: (data: BonusSettings) => void;
}

export default function BonusTab({ data, onChange }: Props) {
  const months = data.payoutMonths ?? [6, 12];
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Bonus Settings</h3>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <Label>Enable performance bonus</Label>
        <Switch checked={data.enabled} onCheckedChange={v => onChange({ ...data, enabled: v })} />
      </div>

      {data.enabled && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>
              Component name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={data.componentName ?? ""}
              placeholder="e.g. Performance Bonus"
              onChange={e => onChange({ ...data, componentName: e.target.value })}
              aria-invalid={!(data.componentName ?? "").trim()}
            />
            <p className="text-xs text-muted-foreground">
              This name will appear as an earning component on the payslip.
            </p>
            {!(data.componentName ?? "").trim() && (
              <p className="text-xs text-destructive">Component name is required.</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Calculation method</Label>
              <Select value={data.method} onValueChange={v => onChange({ ...data, method: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                  <SelectItem value="percentage">% of Basic Salary</SelectItem>
                  <SelectItem value="percentage_total">% of Total Gross Salary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{data.method === "fixed" ? "Bonus Amount" : "Bonus Percentage (%)"}</Label>
              <Input
                type="number"
                value={data.value}
                onChange={e => onChange({ ...data, value: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Bonus frequency</Label>
              <Select value={data.frequency} onValueChange={v => onChange({ ...data, frequency: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="semi_annual">Semi-Annual</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {data.frequency === "weekly" && (
              <div className="space-y-2">
                <Label>Payout day of week</Label>
                <Select
                  value={String(data.payoutDayOfWeek ?? 5)}
                  onValueChange={v => onChange({ ...data, payoutDayOfWeek: Number(v) })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((d, i) => (
                      <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {data.frequency === "annual" && (
              <div className="space-y-2">
                <Label>Payout month</Label>
                <Select
                  value={String(data.payoutMonth ?? 12)}
                  onValueChange={v => onChange({ ...data, payoutMonth: Number(v) })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {data.frequency === "quarterly" && (
              <div className="space-y-2">
                <Label>Quarter starting month</Label>
                <Select
                  value={String(data.quarterStartMonth ?? 3)}
                  onValueChange={v => onChange({ ...data, quarterStartMonth: Number(v) })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">January (then Apr, Jul, Oct)</SelectItem>
                    <SelectItem value="2">February (then May, Aug, Nov)</SelectItem>
                    <SelectItem value="3">March (then Jun, Sep, Dec)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {data.frequency === "semi_annual" && (
              <>
                <div className="space-y-2">
                  <Label>First payout month</Label>
                  <Select
                    value={String(months[0] ?? 6)}
                    onValueChange={v => onChange({ ...data, payoutMonths: [Number(v), months[1] ?? 12] })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, i) => (
                        <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Second payout month</Label>
                  <Select
                    value={String(months[1] ?? 12)}
                    onValueChange={v => onChange({ ...data, payoutMonths: [months[0] ?? 6, Number(v)] })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, i) => (
                        <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="flex items-center justify-between rounded-lg border p-4 md:col-span-2">
              <Label>Include in payslip</Label>
              <Switch
                checked={data.includeInPayslip}
                onCheckedChange={v => onChange({ ...data, includeInPayslip: v })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
