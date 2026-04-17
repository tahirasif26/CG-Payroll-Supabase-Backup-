import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Navigation, Plus, Eye, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { defaultMileageSettings } from "@/data/settingsData";
import { MileageEntryDialog } from "@/components/expenses/MileageEntryDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { useMileageEntries, useCreateMileageEntry } from "@/hooks/queries/useExpenses";
import { useEmployees } from "@/contexts/EmployeeContext";
import { useRole } from "@/contexts/RoleContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface UiMileage {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  vehicleType: string;
  distance: number;
  rate: number;
  amount: number;
  status: "pending" | "approved" | "rejected";
  fromAddress?: string;
  toAddress?: string;
  notes?: string;
}

export default function MileagePage() {
  const { employees } = useEmployees();
  const { clientId } = useRole();
  const { toast } = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: rawEntries = [] } = useMileageEntries();
  const createMileage = useCreateMileageEntry();

  const entries: UiMileage[] = useMemo(() => {
    return (rawEntries as any[]).map((r) => {
      const emp = employees.find((e) => e.id === r.employee_id);
      return {
        id: r.id,
        employeeId: r.employee_id,
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : "Unknown",
        date: r.date,
        vehicleType: r.vehicle_type ?? "car",
        distance: Number(r.distance ?? 0),
        rate: Number(r.rate ?? 0),
        amount: Number(r.amount ?? 0),
        status: r.status ?? "pending",
        fromAddress: r.from_address ?? undefined,
        toAddress: r.to_address ?? undefined,
        notes: r.notes ?? undefined,
      };
    });
  }, [rawEntries, employees]);

  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<UiMileage | null>(null);

  // Pick up GPS submissions via sessionStorage → push to DB
  useEffect(() => {
    const raw = sessionStorage.getItem("newMileageEntry");
    if (!raw || !clientId) return;
    sessionStorage.removeItem("newMileageEntry");
    try {
      const entry = JSON.parse(raw);
      createMileage.mutate({
        client_id: clientId,
        employee_id: entry.employeeId,
        date: entry.date,
        vehicle_type: entry.vehicleType ?? "car",
        distance: entry.distance,
        rate: entry.rate,
        amount: Math.round(entry.amount),
        from_address: entry.fromAddress ?? null,
        to_address: entry.toAddress ?? null,
        notes: entry.notes ?? null,
        status: "pending",
      });
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const handleSubmit = (entry: any) => {
    if (!clientId) return;
    if (defaultMileageSettings.dailyDistanceCap && entry.distance > defaultMileageSettings.dailyDistanceCap) {
      toast({
        title: "Policy Warning",
        description: `Distance of ${entry.distance} km exceeds the daily cap of ${defaultMileageSettings.dailyDistanceCap} km. Submitting for review.`,
        variant: "destructive",
      });
    }
    createMileage.mutate({
      client_id: clientId,
      employee_id: entry.employeeId,
      date: entry.date,
      vehicle_type: entry.vehicleType ?? "car",
      distance: entry.distance,
      rate: entry.rate,
      amount: Math.round(entry.amount),
      from_address: entry.fromAddress ?? null,
      to_address: entry.toAddress ?? null,
      notes: entry.notes ?? null,
      status: "pending",
    });
  };

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    const { error } = await (supabase as any).from("mileage_entries").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["mileage_entries"] });
    toast({ title: status === "approved" ? "Approved" : "Rejected" });
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from("mileage_entries").delete().eq("id", id);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["mileage_entries"] });
    toast({ title: "Deleted" });
  };

  const pending = entries.filter((e) => e.status === "pending");
  const processed = entries.filter((e) => e.status !== "pending");
  const totalDistance = entries.reduce((s, e) => s + e.distance, 0);
  const totalAmount = entries.reduce((s, e) => s + e.amount, 0);

  const renderRow = (entry: UiMileage) => (
    <TableRow key={entry.id}>
      <TableCell className="font-medium">{entry.employeeName}</TableCell>
      <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
      <TableCell className="capitalize">{entry.vehicleType}</TableCell>
      <TableCell className="text-right">{entry.distance.toFixed(1)} km</TableCell>
      <TableCell className="text-right">SAR {entry.rate}</TableCell>
      <TableCell className="text-right font-semibold">SAR {entry.amount.toFixed(2)}</TableCell>
      <TableCell><StatusBadge status={entry.status} /></TableCell>
      <TableCell>
        <div className="flex items-center justify-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedEntry(entry); setDetailOpen(true); }}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {entry.status === "pending" && (
            <>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => updateStatus(entry.id, "approved")}>
                <CheckCircle2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => updateStatus(entry.id, "rejected")}>
                <XCircle className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(entry.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );

  const tableHeaders = (
    <TableHeader>
      <TableRow className="bg-muted/50">
        <TableHead className="font-semibold">Employee</TableHead>
        <TableHead className="font-semibold">Date</TableHead>
        <TableHead className="font-semibold">Vehicle</TableHead>
        <TableHead className="font-semibold text-right">Distance</TableHead>
        <TableHead className="font-semibold text-right">Rate</TableHead>
        <TableHead className="font-semibold text-right">Amount</TableHead>
        <TableHead className="font-semibold">Status</TableHead>
        <TableHead className="font-semibold text-center">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Mileage Tracking" description="Record, review, and reimburse mileage expenses with GPS or manual entry.">
        <div className="flex gap-2">
          <Button size="sm" className="gap-2 font-semibold" onClick={() => navigate("/mileage/gps")}>
            <Navigation className="h-4 w-4" />GPS Trip
          </Button>
          <Button size="sm" variant="outline" className="gap-2 font-semibold" onClick={() => setManualDialogOpen(true)}>
            <Plus className="h-4 w-4" />Manual Entry
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Claims</p>
          <p className="text-2xl font-bold mt-1">{entries.length}</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Distance</p>
          <p className="text-2xl font-bold mt-1">{totalDistance.toFixed(1)} km</p>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Amount</p>
          <p className="text-2xl font-bold mt-1">SAR {totalAmount.toFixed(2)}</p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Pending Approval ({pending.length})</h3>
        <div className="bg-card rounded-xl border overflow-hidden">
          <ScrollArea className="h-[280px]">
            <Table>
              {tableHeaders}
              <TableBody>
                {pending.length > 0 ? pending.map(renderRow) : (
                  <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No pending mileage claims.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Approved / Rejected ({processed.length})</h3>
        <div className="bg-card rounded-xl border overflow-hidden">
          <ScrollArea className="h-[280px]">
            <Table>
              {tableHeaders}
              <TableBody>
                {processed.length > 0 ? processed.map(renderRow) : (
                  <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No processed mileage claims.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </div>

      <MileageEntryDialog open={manualDialogOpen} onOpenChange={setManualDialogOpen} onSubmit={handleSubmit} />

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mileage Details</DialogTitle>
            <DialogDescription>View mileage claim details.</DialogDescription>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Employee:</span> <span className="font-medium">{selectedEntry.employeeName}</span></div>
                <div><span className="text-muted-foreground">Date:</span> <span className="font-medium">{new Date(selectedEntry.date).toLocaleDateString()}</span></div>
                <div><span className="text-muted-foreground">Vehicle:</span> <span className="font-medium capitalize">{selectedEntry.vehicleType}</span></div>
                <div><span className="text-muted-foreground">Distance:</span> <span className="font-medium">{selectedEntry.distance.toFixed(1)} km</span></div>
                <div><span className="text-muted-foreground">Rate:</span> <span className="font-medium">SAR {selectedEntry.rate}/km</span></div>
                <div><span className="text-muted-foreground">Amount:</span> <span className="font-semibold">SAR {selectedEntry.amount.toFixed(2)}</span></div>
              </div>
              {selectedEntry.fromAddress && <div><span className="text-muted-foreground">From:</span> {selectedEntry.fromAddress}</div>}
              {selectedEntry.toAddress && <div><span className="text-muted-foreground">To:</span> {selectedEntry.toAddress}</div>}
              {selectedEntry.notes && <div><span className="text-muted-foreground">Notes:</span> {selectedEntry.notes}</div>}
              <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={selectedEntry.status} /></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
