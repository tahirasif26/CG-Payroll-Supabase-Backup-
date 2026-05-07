import { GratuitySettings } from "@/types/payrollSetup";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Props {
  data: GratuitySettings;
  onChange: (data: GratuitySettings) => void;
}

export default function GratuityTab({ data, onChange }: Props) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Gratuity / End of Service Benefits</h3>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <Label>Enable gratuity calculation</Label>
        <Switch checked={data.enabled} onCheckedChange={v => onChange({ ...data, enabled: v })} />
      </div>

      {data.enabled && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Accrual Slabs (Days per year of service)</Label>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Years of Service</TableHead>
                    <TableHead>Days per Year</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Less than 1 year</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="w-32"
                        value={data.slab1Days}
                        onChange={e => onChange({ ...data, slab1Days: Number(e.target.value) })}
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>1 to 3 years</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="w-32"
                        value={data.slab2Days}
                        onChange={e => onChange({ ...data, slab2Days: Number(e.target.value) })}
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>3 to 5 years</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="w-32"
                        value={data.slab3Days}
                        onChange={e => onChange({ ...data, slab3Days: Number(e.target.value) })}
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>More than 5 years</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="w-32"
                        value={data.slab4Days}
                        onChange={e => onChange({ ...data, slab4Days: Number(e.target.value) })}
                      />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Maximum months of gratuity</Label>
              <Input
                type="number"
                value={data.maxMonths}
                onChange={e => onChange({ ...data, maxMonths: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Calculation basis</Label>
              <Select value={data.basis} onValueChange={v => onChange({ ...data, basis: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic Salary only</SelectItem>
                  <SelectItem value="total">Total Gross</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
