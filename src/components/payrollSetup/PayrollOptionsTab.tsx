import { PayrollOptions } from "@/types/payrollSetup";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface Props {
  data: PayrollOptions;
  onChange: (data: PayrollOptions) => void;
}

export default function PayrollOptionsTab({ data, onChange }: Props) {
  const toggles: { key: keyof PayrollOptions; label: string }[] = [
    { key: "includeOvertime", label: "Include Overtime" },
    { key: "includeUnpaidLeave", label: "Include Unpaid Leave" },
    { key: "enableTaxCalculation", label: "Enable Tax Calculation" },
    { key: "allowNegativeSalary", label: "Allow Negative Salary" },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Payroll Options</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {toggles.map(t => (
          <div key={t.key} className="flex items-center justify-between rounded-lg border p-4">
            <Label className="text-sm font-medium">{t.label}</Label>
            <Switch checked={data[t.key]} onCheckedChange={v => onChange({ ...data, [t.key]: v })} />
          </div>
        ))}
      </div>
    </div>
  );
}
