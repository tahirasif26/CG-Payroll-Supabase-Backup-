import { useState } from "react";
import { Asset } from "@/types/hcm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { QrCode } from "lucide-react";
import { generateQRCodeSVG } from "@/lib/qrcode";

interface QRAssignmentDialogProps {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: { id: string; firstName: string; lastName: string }[];
  onAssign: (assetId: string, employeeId: string, employeeName: string, notes: string) => void;
}

export function QRAssignmentDialog({ asset, open, onOpenChange, employees, onAssign }: QRAssignmentDialogProps) {
  const [employeeId, setEmployeeId] = useState("");
  const [notes, setNotes] = useState("");

  if (!asset) return null;

  const qrSvg = generateQRCodeSVG(JSON.stringify({ asset_tag: asset.assetTag, asset_id: asset.id }), 60);

  const handleAssign = () => {
    if (!employeeId) return;
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;
    onAssign(asset.id, emp.id, `${emp.firstName} ${emp.lastName}`, notes);
    setEmployeeId("");
    setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><QrCode className="h-5 w-5" />Assign Asset via QR</DialogTitle>
          <DialogDescription>Assign scanned asset to an employee.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Asset Info */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
            <div dangerouslySetInnerHTML={{ __html: qrSvg }} className="shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-sm">{asset.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{asset.assetTag}</p>
              <Badge variant="secondary" className="mt-1 text-[10px]">{asset.status}</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assign To Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger><SelectValue placeholder="Select employee..." /></SelectTrigger>
              <SelectContent>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Assigned Date</Label>
            <Input type="date" value={new Date().toISOString().split("T")[0]} disabled />
          </div>

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea placeholder="Assignment notes..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAssign} disabled={!employeeId}>Assign Asset</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
