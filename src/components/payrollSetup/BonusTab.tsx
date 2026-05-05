import { BonusSettings } from "@/types/payrollSetup";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  data: BonusSettings;
  onChange: (data: BonusSettings) => void;
}

export default function BonusTab({ data, onChange }: Props) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Bonus Settings</h3>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <Label>Enable performance bonus</Label>
        <Switch checked={data.enabled} onCheckedChange={v => onChange({ ...data, enabled: v })} />
      </div>

      {data.enabled && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Calculation method</Label>
            <Select value={data.method} onValueChange={v => onChange({ ...data, method: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed Amount</SelectItem>
                <SelectItem value="percentage">% of Basic Salary</SelectItem>
                <SelectItem value="percentage_total">% of Total Salary</SelectItem>
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
                <SelectItem value="annual">Annual</SelectItem>
                <SelectItem value="semi_annual">Semi-Annual</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4 md:col-span-2">
            <Label>Include in payslip</Label>
            <Switch
              checked={data.includeInPayslip}
              onCheckedChange={v => onChange({ ...data, includeInPayslip: v })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
