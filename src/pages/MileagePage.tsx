import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { mileageEntries } from "@/data/mockData";
import { MileageEntry } from "@/types/hcm";
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

export default function MileagePage() {
  const [entries, setEntries] = useState<MileageEntry[]>(mileageEntries);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<MileageEntry | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Pick up GPS submissions via sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem("newMileageEntry");
    if (raw) {
      sessionStorage.removeItem("newMileageEntry");
      try {
        const entry = JSON.parse(raw);
        const newEntry: MileageEntry = { ...entry, id: String(Date.now()), status: "pending" };
        setEntries(prev => [newEntry, ...prev]);
      } catch {}
    }
  }, []);

  const handleSubmit = (entry: Omit<MileageEntry, "id" | "status">) => {
    if (defaultMileageSettings.dailyDistanceCap && entry.distance > defaultMileageSettings.dailyDistanceCap) {
      toast({ title: "Policy Warning", description: `Distance of ${entry.distance} km exceeds the daily cap of ${defaultMileageSettings.dailyDistanceCap} km. Submitting for review.`, variant: "destructive" });
    }
    const newEntry: MileageEntry = { ...entry, id: String(Date.now()), status: "pending" };
    setEntries(prev => [newEntry, ...prev]);
    toast({ title: "Mileage Claim Submitted", description: `${entry.distance} km × SAR ${entry.rate}/km = SAR ${entry.amount.toFixed(2)}` });
  };

  const handleApprove = (entry: MileageEntry) => {
    setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: "approved" } : e));
    toast({ title: "Approved", description: `Mileage claim for ${entry.employeeName} approved.` });
  };

  const handleReject = (entry: MileageEntry) => {
    setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: "rejected" } : e));
    toast({ title: "Rejected", description: `Mileage claim for ${entry.employeeName} rejected.` });
  };

  const handleDelete = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    toast({ title: "Deleted" });
  };

  const pending = entries.filter(e => e.status === "pending");
  const processed = entries.filter(e => e.status !== "pending");
  const totalDistance = entries.reduce((s, e) => s + e.distance, 0);
  const totalAmount = entries.reduce((s, e) => s + e.amount, 0);

  const renderRow = (entry: MileageEntry) => (
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
              <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => handleApprove(entry)}>
                <CheckCircle2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleReject(entry)}>
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
          <Button size="sm" variant={gpsOpen ? "secondary" : "default"} className="gap-2 font-semibold" onClick={() => setGpsOpen(!gpsOpen)}>
            <Navigation className="h-4 w-4" />{gpsOpen ? "Close GPS" : "GPS Trip"}
          </Button>
          <Button size="sm" variant="outline" className="gap-2 font-semibold" onClick={() => setManualDialogOpen(true)}>
            <Plus className="h-4 w-4" />Manual Entry
          </Button>
        </div>
      </PageHeader>

      {/* Inline GPS Tracker */}
      {gpsOpen && (
        <GPSMileageTracker onSubmit={handleSubmit} onClose={() => setGpsOpen(false)} />
      )}

      {/* Summary */}
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

      {/* Pending */}
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

      {/* Processed */}
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

      {/* Manual Entry Dialog */}
      <MileageEntryDialog open={manualDialogOpen} onOpenChange={setManualDialogOpen} onSubmit={handleSubmit} />

      {/* Detail Dialog */}
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
