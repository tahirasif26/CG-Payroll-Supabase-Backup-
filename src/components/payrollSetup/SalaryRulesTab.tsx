import { SalaryRules } from "@/types/payrollSetup";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  data: SalaryRules;
  onChange: (data: SalaryRules) => void;
}

export default function SalaryRulesTab({ data, onChange }: Props) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Salary Rules</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Salary Type</Label>
          <Select value={data.salaryType} onValueChange={v => onChange({ ...data, salaryType: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="fixed">Fixed</SelectItem><SelectItem value="variable">Variable</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Proration Rule</Label>
          <Select value={data.prorationRule} onValueChange={v => onChange({ ...data, prorationRule: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="days-worked">Based on Days Worked</SelectItem><SelectItem value="calendar-days">Calendar Days</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Working Days Per Month</Label>
          <Input type="number" value={data.workingDaysPerMonth} onChange={e => onChange({ ...data, workingDaysPerMonth: Number(e.target.value) })} />
        </div>
      </div>
    </div>
  );
}
