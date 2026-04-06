import { ApprovalWorkflow } from "@/types/payrollSetup";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, GripVertical } from "lucide-react";

interface Props {
  data: ApprovalWorkflow;
  onChange: (data: ApprovalWorkflow) => void;
}

export default function ApprovalWorkflowTab({ data, onChange }: Props) {
  const addLevel = () => onChange({ ...data, levels: [...data.levels, ""] });
  const removeLevel = (i: number) => onChange({ ...data, levels: data.levels.filter((_, idx) => idx !== i) });
  const updateLevel = (i: number, val: string) => {
    const levels = [...data.levels];
    levels[i] = val;
    onChange({ ...data, levels });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Approval Workflow</h3>
      <div className="flex items-center justify-between rounded-lg border p-4">
        <Label>Enable Payroll Approval</Label>
        <Switch checked={data.enabled} onCheckedChange={v => onChange({ ...data, enabled: v })} />
      </div>
      {data.enabled && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Approval Levels</h4>
            <Button size="sm" variant="outline" onClick={addLevel}><Plus className="h-3 w-3 mr-1" />Add Level</Button>
          </div>
          {data.levels.map((level, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-bold text-muted-foreground w-8">L{i + 1}</span>
              <Input value={level} className="flex-1" placeholder="e.g. HR Manager" onChange={e => updateLevel(i, e.target.value)} />
              <Button variant="ghost" size="sm" onClick={() => removeLevel(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
            </div>
          ))}
          {data.levels.length > 0 && (
            <p className="text-xs text-muted-foreground">Flow: {data.levels.filter(Boolean).join(" → ")}</p>
          )}
        </div>
      )}
    </div>
  );
}
