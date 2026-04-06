import { RetirementPolicies } from "@/types/payrollSetup";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  data: RetirementPolicies;
  onChange: (data: RetirementPolicies) => void;
}

export default function RetirementPoliciesTab({ data, onChange }: Props) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Retirement Policies (PF / VPS)</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <Label>Enable Provident Fund (PF)</Label>
          <Switch checked={data.enablePF} onCheckedChange={v => onChange({ ...data, enablePF: v })} />
        </div>
        {data.enablePF && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4">
            <div className="space-y-2">
              <Label>Employee Contribution (%)</Label>
              <Input type="number" value={data.employeeContributionPct} onChange={e => onChange({ ...data, employeeContributionPct: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Employer Contribution (%)</Label>
              <Input type="number" value={data.employerContributionPct} onChange={e => onChange({ ...data, employerContributionPct: Number(e.target.value) })} />
            </div>
          </div>
        )}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <Label>Enable Voluntary Pension Scheme (VPS)</Label>
          <Switch checked={data.enableVPS} onCheckedChange={v => onChange({ ...data, enableVPS: v })} />
        </div>
        {data.enableVPS && (
          <div className="space-y-2 pl-4">
            <Label>VPS Contribution Rules</Label>
            <Textarea value={data.vpsContributionRules} onChange={e => onChange({ ...data, vpsContributionRules: e.target.value })} placeholder="Describe contribution rules..." />
          </div>
        )}
      </div>
    </div>
  );
}
