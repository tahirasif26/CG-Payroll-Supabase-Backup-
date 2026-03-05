import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEmployees } from "@/contexts/EmployeeContext";
import { defaultMileageSettings } from "@/data/settingsData";
import { MileageEntry } from "@/types/hcm";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entry: Omit<MileageEntry, "id" | "status">) => void;
}

export function MileageEntryDialog({ open, onOpenChange, onSubmit }: Props) {
  const { employees } = useEmployees();
  const [step, setStep] = useState<"entry" | "review">("entry");

  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [vehicleType, setVehicleType] = useState<"car" | "motorcycle" | "bicycle">("car");
  const [notes, setNotes] = useState("");
  const [manualDistance, setManualDistance] = useState("");
  const [fromAddress, setFromAddress] = useState("");
  const [toAddress, setToAddress] = useState("");

  const rate = defaultMileageSettings.ratesByVehicle[vehicleType] || defaultMileageSettings.defaultRate;
  const distance = Number(manualDistance) || 0;
  const amount = Math.round(distance * rate * 100) / 100;

  const reset = useCallback(() => {
    setStep("entry");
    setEmployeeId("");
    setDate(new Date().toISOString().split("T")[0]);
    setVehicleType("car");
    setNotes("");
    setManualDistance("");
    setFromAddress("");
    setToAddress("");
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const handleReview = () => {
    if (!employeeId || !manualDistance) return;
    setStep("review");
  };

  const handleSubmit = () => {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;
    onSubmit({
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      date,
      distance,
      rate,
      amount,
      vehicleType,
      fromAddress: fromAddress || undefined,
      toAddress: toAddress || undefined,
      notes: notes || undefined,
    });
    onOpenChange(false);
  };

  const emp = employees.find(e => e.id === employeeId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{step === "entry" ? "Manual Mileage Entry" : "Review & Submit"}</DialogTitle>
          <DialogDescription>{step === "entry" ? "Enter trip details manually." : "Review the details before submitting."}</DialogDescription>
        </DialogHeader>

        {step === "entry" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Employee</Label>
                <Select value={employeeId} onValueChange={setEmployeeId}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.filter(e => e.status === "active").map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Vehicle Type</Label>
                <Select value={vehicleType} onValueChange={v => setVehicleType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car">🚗 Car</SelectItem>
                    <SelectItem value="motorcycle">🏍️ Motorcycle</SelectItem>
                    <SelectItem value="bicycle">🚲 Bicycle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Rate</Label>
                <div className="h-9 px-3 flex items-center rounded-md border bg-muted/50 text-sm font-medium">
                  SAR {rate}/km
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Distance (km)</Label>
                <Input type="number" step="0.1" value={manualDistance} onChange={e => setManualDistance(e.target.value)} placeholder="e.g. 25.5" />
              </div>
              <div className="space-y-1.5">
                <Label>Calculated Amount</Label>
                <div className="h-9 px-3 flex items-center rounded-md border bg-muted/50 text-sm font-semibold">
                  SAR {(distance * rate).toFixed(2)}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>From (optional)</Label>
                <Input value={fromAddress} onChange={e => setFromAddress(e.target.value)} placeholder="Starting location" />
              </div>
              <div className="space-y-1.5">
                <Label>To (optional)</Label>
                <Input value={toAddress} onChange={e => setToAddress(e.target.value)} placeholder="Destination" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Purpose of trip..." rows={2} />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleReview} disabled={!employeeId || !manualDistance}>Review</Button>
            </DialogFooter>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3">
              <h4 className="font-semibold text-sm">Trip Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Employee:</span> <span className="font-medium">{emp ? `${emp.firstName} ${emp.lastName}` : "—"}</span></div>
                <div><span className="text-muted-foreground">Date:</span> <span className="font-medium">{new Date(date).toLocaleDateString()}</span></div>
                <div><span className="text-muted-foreground">Vehicle:</span> <span className="font-medium capitalize">{vehicleType}</span></div>
                <div><span className="text-muted-foreground">Mode:</span> <span className="font-medium">Manual Entry</span></div>
                {fromAddress && <div><span className="text-muted-foreground">From:</span> <span className="font-medium">{fromAddress}</span></div>}
                {toAddress && <div><span className="text-muted-foreground">To:</span> <span className="font-medium">{toAddress}</span></div>}
              </div>
              <div className="flex gap-6 pt-2 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Distance</p>
                  <p className="text-xl font-bold">{distance.toFixed(1)} km</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Rate</p>
                  <p className="text-xl font-bold">SAR {rate}/km</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                  <p className="text-xl font-bold text-primary">SAR {amount.toFixed(2)}</p>
                </div>
              </div>
              {notes && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="text-sm">{notes}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("entry")}>Back</Button>
              <Button onClick={handleSubmit}>Submit Mileage Claim</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
