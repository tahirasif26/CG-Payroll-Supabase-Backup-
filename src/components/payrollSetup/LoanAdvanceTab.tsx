import { LoanAdvanceConfig } from "@/types/payrollSetup";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface Props {
  data: LoanAdvanceConfig;
  onChange: (data: LoanAdvanceConfig) => void;
}

export default function LoanAdvanceTab({ data, onChange }: Props) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Loan & Advance Adjustments</h3>
      <div className="flex items-center justify-between rounded-lg border p-4">
        <Label>Enable Advance Deduction from Payroll</Label>
        <Switch checked={data.enableAdvanceDeduction} onCheckedChange={v => onChange({ ...data, enableAdvanceDeduction: v })} />
      </div>
      {data.enableAdvanceDeduction && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Max Deduction Percentage (%)</Label>
            <Input type="number" value={data.maxDeductionPercentage} onChange={e => onChange({ ...data, maxDeductionPercentage: Number(e.target.value) })} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <Label>Auto Deduct Remaining Advance</Label>
            <Switch checked={data.autoDeductRemaining} onCheckedChange={v => onChange({ ...data, autoDeductRemaining: v })} />
          </div>
        </div>
      )}
    </div>
  );
}
