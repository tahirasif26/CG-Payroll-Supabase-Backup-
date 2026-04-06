import { LeaveEncashment } from "@/types/payrollSetup";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface Props {
  data: LeaveEncashment;
  onChange: (data: LeaveEncashment) => void;
}

export default function LeaveEncashmentTab({ data, onChange }: Props) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Leave & Encashment</h3>
      <div className="flex items-center justify-between rounded-lg border p-4">
        <Label>Leave Encashment Enabled</Label>
        <Switch checked={data.enabled} onCheckedChange={v => onChange({ ...data, enabled: v })} />
      </div>
      {data.enabled && (
        <div className="space-y-2">
          <Label>Encashment Formula</Label>
          <Input value={data.formula} onChange={e => onChange({ ...data, formula: e.target.value })} placeholder="e.g. (Basic / 30) × Unused Days" />
        </div>
      )}
    </div>
  );
}
