import { ProvidentFundSettings } from "@/types/payrollSetup";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  data: ProvidentFundSettings;
  onChange: (data: ProvidentFundSettings) => void;
}

export default function ProvidentFundTab({ data, onChange }: Props) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Provident Fund / GOSI</h3>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <Label>Enable provident fund / GOSI</Label>
        <Switch checked={data.enabled} onCheckedChange={v => onChange({ ...data, enabled: v })} />
      </div>

      {data.enabled && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Scheme type</Label>
            <Select value={data.scheme} onValueChange={v => onChange({ ...data, scheme: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gosi_saudi">GOSI (Saudi Arabia)</SelectItem>
                <SelectItem value="gpssa_uae">GPSSA (UAE)</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Employee contribution (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={data.employeeRate}
                onChange={e => onChange({ ...data, employeeRate: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Employer contribution (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={data.employerRate}
                onChange={e => onChange({ ...data, employerRate: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Contribution basis</Label>
            <Select value={data.basis} onValueChange={v => onChange({ ...data, basis: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Basic Salary</SelectItem>
                <SelectItem value="total">Total Salary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <Label>Auto-deduct from payslip</Label>
            <Switch checked={data.autoDeduct} onCheckedChange={v => onChange({ ...data, autoDeduct: v })} />
          </div>
        </div>
      )}
    </div>
  );
}
