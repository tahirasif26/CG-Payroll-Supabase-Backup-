import { LeaveEncashment, LeaveAllocation } from "@/types/payrollSetup";
import { useLeaveTypes } from "@/contexts/LeaveTypeContext";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface Props {
  data: LeaveEncashment;
  onChange: (data: LeaveEncashment) => void;
}

export default function LeaveEncashmentTab({ data, onChange }: Props) {
  const { leaveTypes } = useLeaveTypes();
  const allocations = data.leaveAllocations || [];
  const [addingTypeId, setAddingTypeId] = useState("");

  const availableTypes = leaveTypes.filter(
    lt => lt.isActive && !allocations.find(a => a.leaveTypeId === lt.id)
  );

  const handleAddAllocation = () => {
    const lt = leaveTypes.find(l => l.id === addingTypeId);
    if (!lt) return;
    const newAlloc: LeaveAllocation = {
      leaveTypeId: lt.id,
      leaveTypeName: lt.name,
      daysEntitled: lt.defaultDays,
      isActive: true,
    };
    onChange({ ...data, leaveAllocations: [...allocations, newAlloc] });
    setAddingTypeId("");
  };

  const handleUpdateAlloc = (idx: number, updates: Partial<LeaveAllocation>) => {
    const updated = allocations.map((a, i) => i === idx ? { ...a, ...updates } : a);
    onChange({ ...data, leaveAllocations: updated });
  };

  const handleRemoveAlloc = (idx: number) => {
    onChange({ ...data, leaveAllocations: allocations.filter((_, i) => i !== idx) });
  };

  const handleAddAll = () => {
    const newAllocs = availableTypes.map(lt => ({
      leaveTypeId: lt.id,
      leaveTypeName: lt.name,
      daysEntitled: lt.defaultDays,
      isActive: true,
    }));
    onChange({ ...data, leaveAllocations: [...allocations, ...newAllocs] });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Leave & Encashment</h3>

      {/* Leave Allocations per Setup */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Leave Allocations</p>
            <p className="text-xs text-muted-foreground">Configure which leave types and entitlements apply to employees under this setup.</p>
          </div>
          {availableTypes.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleAddAll}>
              <Plus className="h-3 w-3 mr-1" />Add All
            </Button>
          )}
        </div>

        {allocations.length > 0 && (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Leave Type</TableHead>
                  <TableHead className="font-semibold">Days Entitled</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocations.map((alloc, idx) => (
                  <TableRow key={alloc.leaveTypeId}>
                    <TableCell className="font-medium">{alloc.leaveTypeName}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={alloc.daysEntitled}
                        onChange={e => handleUpdateAlloc(idx, { daysEntitled: Number(e.target.value) })}
                        className="w-20 h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={alloc.isActive}
                        onCheckedChange={v => handleUpdateAlloc(idx, { isActive: v })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-destructive h-7 w-7 p-0" onClick={() => handleRemoveAlloc(idx)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {allocations.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg">
            No leave types configured for this setup. Employees will use global defaults.
          </div>
        )}

        {availableTypes.length > 0 && (
          <div className="flex gap-2 items-end">
            <div className="flex-1 max-w-xs space-y-1">
              <Label className="text-xs">Add Leave Type</Label>
              <Select value={addingTypeId} onValueChange={setAddingTypeId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select leave type..." /></SelectTrigger>
                <SelectContent>
                  {availableTypes.map(lt => (
                    <SelectItem key={lt.id} value={lt.id}>{lt.name} ({lt.defaultDays} days)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={handleAddAllocation} disabled={!addingTypeId}>
              <Plus className="h-3 w-3 mr-1" />Add
            </Button>
          </div>
        )}
      </div>

      {/* Encashment Settings */}
      <div className="border-t pt-6 space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <Label>Leave Encashment Enabled</Label>
          <Switch checked={data.enabled} onCheckedChange={v => onChange({ ...data, enabled: v })} />
        </div>
        {data.enabled && (
          <div className="space-y-2">
            <Label>Encashment Formula</Label>
            <Input value={data.formula} onChange={e => onChange({ ...data, formula: e.target.value })} placeholder="e.g. (Basic / 30) × Unused Days" />
          </div>
        )}
      </div>
    </div>
  );
}
