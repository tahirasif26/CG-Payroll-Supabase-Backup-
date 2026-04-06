import { useEmployeeTypes } from "@/contexts/EmployeeTypeContext";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface EmployeeTypeMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function EmployeeTypeMultiSelect({ value, onChange }: EmployeeTypeMultiSelectProps) {
  const { activeTypes } = useEmployeeTypes();

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter(v => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  return (
    <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
      {activeTypes.map(t => (
        <div key={t.id} className="flex items-center gap-2">
          <Checkbox
            id={`etype-${t.id}`}
            checked={value.includes(t.id)}
            onCheckedChange={() => toggle(t.id)}
          />
          <Label htmlFor={`etype-${t.id}`} className="text-sm cursor-pointer">{t.name}</Label>
        </div>
      ))}
      {activeTypes.length === 0 && (
        <p className="text-xs text-muted-foreground">No employee types configured.</p>
      )}
    </div>
  );
}

export function EmployeeTypeBadges({ typeIds }: { typeIds?: string[] }) {
  const { getTypeName } = useEmployeeTypes();
  if (!typeIds || typeIds.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {typeIds.map(id => (
        <Badge key={id} variant="outline" className="text-[10px] px-1.5 py-0">
          {getTypeName(id)}
        </Badge>
      ))}
    </div>
  );
}
