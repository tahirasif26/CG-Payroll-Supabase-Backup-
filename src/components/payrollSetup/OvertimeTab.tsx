import { OvertimeConfig } from "@/types/payrollSetup";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface Props {
  data: OvertimeConfig;
  onChange: (data: OvertimeConfig) => void;
}

export default function OvertimeTab({ data, onChange }: Props) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Overtime Configuration</h3>
      <div className="flex items-center justify-between rounded-lg border p-4">
        <Label>Enable Overtime</Label>
        <Switch checked={data.enabled} onCheckedChange={v => onChange({ ...data, enabled: v })} />
      </div>
      {data.enabled && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Rate Multiplier (e.g. 1.5x)</Label>
            <Input type="number" step="0.1" value={data.rateMultiplier} onChange={e => onChange({ ...data, rateMultiplier: Number(e.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label>Max Overtime Hours / Month</Label>
            <Input type="number" value={data.maxOvertimeHours} onChange={e => onChange({ ...data, maxOvertimeHours: Number(e.target.value) })} />
          </div>
        </div>
      )}
    </div>
  );
}
