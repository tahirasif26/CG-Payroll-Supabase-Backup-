import { LeaveSettings } from "@/types/payrollSetup";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface Props {
  data: LeaveSettings;
  onChange: (data: LeaveSettings) => void;
}

const LEAVE_TYPES = [
  { key: "annual", label: "Annual Leave", defaultDays: 21 },
  { key: "sick", label: "Sick Leave", defaultDays: 10 },
  { key: "emergency", label: "Emergency Leave", defaultDays: 3 },
  { key: "maternity", label: "Maternity Leave", defaultDays: 60 },
  { key: "paternity", label: "Paternity Leave", defaultDays: 3 },
  { key: "hajj", label: "Hajj Leave", defaultDays: 14 },
  { key: "unpaid", label: "Unpaid Leave", defaultDays: 0 },
];

export default function LeavesTab({ data, onChange }: Props) {
  const types = data.leaveTypes ?? {};

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Leave Settings</h3>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <Label>Include unpaid leave deduction</Label>
          <p className="text-xs text-muted-foreground">Deduct salary for unapproved/unpaid leave days</p>
        </div>
        <Switch
          checked={data.includeUnpaidLeave}
          onCheckedChange={v => onChange({ ...data, includeUnpaidLeave: v })}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-semibold">Leave Types & Entitlements</Label>
        <div className="rounded-lg border divide-y">
          {LEAVE_TYPES.map(lt => {
            const cur = types[lt.key] ?? { enabled: true, days: lt.defaultDays };
            return (
              <div key={lt.key} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={cur.enabled}
                    onCheckedChange={v =>
                      onChange({ ...data, leaveTypes: { ...types, [lt.key]: { ...cur, enabled: v } } })
                    }
                  />
                  <span className="text-sm">{lt.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Days/year:</Label>
                  <Input
                    type="number"
                    className="w-24"
                    value={cur.days}
                    onChange={e =>
                      onChange({
                        ...data,
                        leaveTypes: { ...types, [lt.key]: { ...cur, days: Number(e.target.value) } },
                      })
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <Label>Allow leave carry-forward</Label>
          <p className="text-xs text-muted-foreground">Unused annual leave carries to next year</p>
        </div>
        <Switch
          checked={data.allowCarryForward}
          onCheckedChange={v => onChange({ ...data, allowCarryForward: v })}
        />
      </div>
      {data.allowCarryForward && (
        <div className="space-y-2">
          <Label>Max carry-forward days</Label>
          <Input
            type="number"
            value={data.maxCarryForwardDays}
            onChange={e => onChange({ ...data, maxCarryForwardDays: Number(e.target.value) })}
          />
        </div>
      )}
    </div>
  );
}
