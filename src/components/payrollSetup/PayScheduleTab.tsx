import { PaySchedule } from "@/types/payrollSetup";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  data: PaySchedule;
  onChange: (data: PaySchedule) => void;
}

export default function PayScheduleTab({ data, onChange }: Props) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Pay Schedule</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Pay Frequency</Label>
          <Select value={data.payFrequency} onValueChange={v => onChange({ ...data, payFrequency: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Cycle Start Date</Label>
          <Input value={data.cycleStartDate} onChange={e => onChange({ ...data, cycleStartDate: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Cycle End Date</Label>
          <Select
            value={data.cycleEndDate || "EOM"}
            onValueChange={v => onChange({ ...data, cycleEndDate: v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="EOM">End of month (auto)</SelectItem>
              {Array.from({ length: 31 }, (_, i) => String(i + 1)).map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            "End of month" auto-picks the last day of each month (28–31) when payroll runs.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Pay Date</Label>
          <Input value={data.payDate} onChange={e => onChange({ ...data, payDate: e.target.value })} />
        </div>
      </div>
    </div>
  );
}
