import { FinalSettlement } from "@/types/payrollSetup";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface Props {
  data: FinalSettlement;
  onChange: (data: FinalSettlement) => void;
}

export default function FinalSettlementTab({ data, onChange }: Props) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Final Settlement</h3>
      <div className="space-y-2">
        <Label>Notice Period Recovery (Days)</Label>
        <Input
          type="number"
          value={data.noticePeriodRecoveryDays}
          onChange={e => onChange({ ...data, noticePeriodRecoveryDays: Number(e.target.value) })}
        />
      </div>
    </div>
  );
}
