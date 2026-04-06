import { FinalSettlement } from "@/types/payrollSetup";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface Props {
  data: FinalSettlement;
  onChange: (data: FinalSettlement) => void;
}

export default function FinalSettlementTab({ data, onChange }: Props) {
  const toggles: { key: keyof Omit<FinalSettlement, "noticePeriodRecoveryDays">; label: string }[] = [
    { key: "includeLeaveEncashment", label: "Include Leave Encashment" },
    { key: "includePendingSalary", label: "Include Pending Salary" },
    { key: "includeDeductions", label: "Include Deductions" },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Final Settlement</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {toggles.map(t => (
          <div key={t.key} className="flex items-center justify-between rounded-lg border p-4">
            <Label>{t.label}</Label>
            <Switch checked={data[t.key] as boolean} onCheckedChange={v => onChange({ ...data, [t.key]: v })} />
          </div>
        ))}
        <div className="space-y-2">
          <Label>Notice Period Recovery (Days)</Label>
          <Input type="number" value={data.noticePeriodRecoveryDays} onChange={e => onChange({ ...data, noticePeriodRecoveryDays: Number(e.target.value) })} />
        </div>
      </div>
    </div>
  );
}
