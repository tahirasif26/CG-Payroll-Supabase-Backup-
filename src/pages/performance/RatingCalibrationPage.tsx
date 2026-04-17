import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useEmployees as useEmployeesCtx } from "@/contexts/EmployeeContext";
import { useActiveEmployees } from "@/hooks/useActiveEmployees";
import { Search, Filter, Edit2, CheckCircle2, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

type Rating = "outstanding" | "exceeds" | "meets" | "below" | "unsatisfactory" | "";

interface CalibrationEntry {
  employeeId: string;
  managerRating: Rating;
  calibratedRating: Rating;
  status: "pending" | "calibrated" | "finalized";
  notes: string;
}

const ratingLabels: Record<Rating, string> = {
  outstanding: "Outstanding",
  exceeds: "Exceeds Expectations",
  meets: "Meets Expectations",
  below: "Below Expectations",
  unsatisfactory: "Unsatisfactory",
  "": "Not Rated",
};

const ratingColors: Record<Rating, string> = {
  outstanding: "bg-success/10 text-success",
  exceeds: "bg-info/10 text-info",
  meets: "bg-primary/10 text-primary",
  below: "bg-warning/10 text-warning",
  unsatisfactory: "bg-destructive/10 text-destructive",
  "": "bg-muted text-muted-foreground",
};

const initialData: CalibrationEntry[] = [
  { employeeId: "1", managerRating: "exceeds", calibratedRating: "", status: "pending", notes: "" },
  { employeeId: "2", managerRating: "meets", calibratedRating: "", status: "pending", notes: "" },
  { employeeId: "3", managerRating: "meets", calibratedRating: "below", status: "calibrated", notes: "Needs improvement in client deliverables." },
  { employeeId: "4", managerRating: "outstanding", calibratedRating: "exceeds", status: "calibrated", notes: "Strong performance but calibrated down for consistency." },
  { employeeId: "5", managerRating: "meets", calibratedRating: "", status: "pending", notes: "" },
  { employeeId: "8", managerRating: "exceeds", calibratedRating: "exceeds", status: "finalized", notes: "Confirmed after calibration session." },
];

export default function RatingCalibrationPage() {
  const activeEmployees = useActiveEmployees();
  const [entries, setEntries] = useState<CalibrationEntry[]>(initialData);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editEntry, setEditEntry] = useState<CalibrationEntry | null>(null);
  const [editRating, setEditRating] = useState<Rating>("");
  const [editNotes, setEditNotes] = useState("");
  const { toast } = useToast();

  const getEmp = (id: string) => employees.find(e => e.id === id);

  const filtered = entries.filter(entry => {
    const emp = getEmp(entry.employeeId);
    if (!emp) return false;
    const q = search.toLowerCase();
    const matchSearch = !q || `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q) || emp.department.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || entry.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: entries.length,
    pending: entries.filter(e => e.status === "pending").length,
    calibrated: entries.filter(e => e.status === "calibrated").length,
    finalized: entries.filter(e => e.status === "finalized").length,
  };

  const handleSave = () => {
    if (!editEntry) return;
    setEntries(prev => prev.map(e =>
      e.employeeId === editEntry.employeeId
        ? { ...e, calibratedRating: editRating, notes: editNotes, status: "calibrated" as const }
        : e
    ));
    toast({ title: "Calibrated", description: `Rating calibrated for ${getEmp(editEntry.employeeId)?.firstName}.` });
    setEditEntry(null);
  };

  const handleFinalize = (empId: string) => {
    setEntries(prev => prev.map(e =>
      e.employeeId === empId ? { ...e, status: "finalized" as const } : e
    ));
    toast({ title: "Finalized", description: "Rating has been finalized." });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Rating Calibration" description="Review and calibrate employee performance ratings for consistency across departments." />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Pending</p><p className="text-2xl font-bold text-warning">{stats.pending}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Calibrated</p><p className="text-2xl font-bold text-info">{stats.calibrated}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Finalized</p><p className="text-2xl font-bold text-success">{stats.finalized}</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or department..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] h-9"><Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="calibrated">Calibrated</SelectItem>
            <SelectItem value="finalized">Finalized</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Manager Rating</TableHead>
                <TableHead>Calibrated Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(entry => {
                const emp = getEmp(entry.employeeId);
                if (!emp) return null;
                return (
                  <TableRow key={entry.employeeId}>
                    <TableCell>
                      <p className="text-sm font-medium">{emp.firstName} {emp.lastName}</p>
                      <p className="text-xs text-muted-foreground">{emp.designation}</p>
                    </TableCell>
                    <TableCell className="text-sm">{emp.department}</TableCell>
                    <TableCell><span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${ratingColors[entry.managerRating]}`}>{ratingLabels[entry.managerRating]}</span></TableCell>
                    <TableCell>
                      {entry.calibratedRating ? (
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${ratingColors[entry.calibratedRating]}`}>{ratingLabels[entry.calibratedRating]}</span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                        entry.status === "finalized" ? "bg-success/10 text-success" :
                        entry.status === "calibrated" ? "bg-info/10 text-info" :
                        "bg-warning/10 text-warning"
                      }`}>
                        {entry.status === "finalized" ? <CheckCircle2 className="h-3 w-3" /> : entry.status === "pending" ? <AlertTriangle className="h-3 w-3" /> : null}
                        {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {entry.status !== "finalized" && (
                          <Button size="sm" variant="outline" onClick={() => { setEditEntry(entry); setEditRating(entry.calibratedRating || entry.managerRating); setEditNotes(entry.notes); }}>
                            <Edit2 className="h-3 w-3 mr-1" />Calibrate
                          </Button>
                        )}
                        {entry.status === "calibrated" && (
                          <Button size="sm" onClick={() => handleFinalize(entry.employeeId)}>Finalize</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      <Dialog open={!!editEntry} onOpenChange={open => { if (!open) setEditEntry(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Calibrate Rating</DialogTitle>
            <DialogDescription>{editEntry && `${getEmp(editEntry.employeeId)?.firstName} ${getEmp(editEntry.employeeId)?.lastName}`}</DialogDescription>
          </DialogHeader>
          {editEntry && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Manager Rating</p>
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${ratingColors[editEntry.managerRating]}`}>{ratingLabels[editEntry.managerRating]}</span>
              </div>
              <div className="space-y-2">
                <Label>Calibrated Rating</Label>
                <Select value={editRating} onValueChange={v => setEditRating(v as Rating)}>
                  <SelectTrigger><SelectValue placeholder="Select rating..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outstanding">Outstanding</SelectItem>
                    <SelectItem value="exceeds">Exceeds Expectations</SelectItem>
                    <SelectItem value="meets">Meets Expectations</SelectItem>
                    <SelectItem value="below">Below Expectations</SelectItem>
                    <SelectItem value="unsatisfactory">Unsatisfactory</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Calibration Notes</Label>
                <Input value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Reason for calibration adjustment..." />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEntry(null)}>Cancel</Button>
            <Button onClick={handleSave}>Save Calibration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
