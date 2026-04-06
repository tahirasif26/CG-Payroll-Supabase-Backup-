import { AutoDeductions } from "@/types/payrollSetup";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  data: AutoDeductions;
  onChange: (data: AutoDeductions) => void;
}

export default function AutoDeductionsTab({ data, onChange }: Props) {
  const addRule = () => {
    onChange({ ...data, customRules: [...data.customRules, { id: `cr-${Date.now()}`, name: "", amount: 0, enabled: true }] });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Auto Deductions</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <Label>Late Penalty</Label>
          <Switch checked={data.latePenaltyEnabled} onCheckedChange={v => onChange({ ...data, latePenaltyEnabled: v })} />
        </div>
        {data.latePenaltyEnabled && (
          <div className="space-y-2">
            <Label>Late Penalty Amount</Label>
            <Input type="number" value={data.latePenaltyAmount} onChange={e => onChange({ ...data, latePenaltyAmount: Number(e.target.value) })} />
          </div>
        )}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <Label>Absence Deduction</Label>
          <Switch checked={data.absenceDeductionEnabled} onCheckedChange={v => onChange({ ...data, absenceDeductionEnabled: v })} />
        </div>
        {data.absenceDeductionEnabled && (
          <div className="space-y-2">
            <Label>Deduction Per Day</Label>
            <Input type="number" value={data.absenceDeductionPerDay} onChange={e => onChange({ ...data, absenceDeductionPerDay: Number(e.target.value) })} />
          </div>
        )}
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Custom Rules</h4>
          <Button size="sm" variant="outline" onClick={addRule}><Plus className="h-3 w-3 mr-1" />Add Rule</Button>
        </div>
        {data.customRules.map((rule, i) => (
          <div key={rule.id} className="flex items-center gap-3 rounded-lg border p-3">
            <Input placeholder="Rule name" value={rule.name} className="flex-1" onChange={e => {
              const rules = [...data.customRules]; rules[i] = { ...rule, name: e.target.value }; onChange({ ...data, customRules: rules });
            }} />
            <Input type="number" placeholder="Amount" value={rule.amount} className="w-28" onChange={e => {
              const rules = [...data.customRules]; rules[i] = { ...rule, amount: Number(e.target.value) }; onChange({ ...data, customRules: rules });
            }} />
            <Switch checked={rule.enabled} onCheckedChange={v => {
              const rules = [...data.customRules]; rules[i] = { ...rule, enabled: v }; onChange({ ...data, customRules: rules });
            }} />
            <Button variant="ghost" size="sm" onClick={() => onChange({ ...data, customRules: data.customRules.filter(r => r.id !== rule.id) })}><Trash2 className="h-3 w-3 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
