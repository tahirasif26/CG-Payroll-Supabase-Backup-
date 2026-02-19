import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { payrollRuns, employees } from "@/data/mockData";
import { PayrollRun } from "@/types/hcm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Play, Eye, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { DollarSign, Users, TrendingDown } from "lucide-react";
import { useClient } from "@/contexts/ClientContext";

export default function PayrollPage() {
  const [runs, setRuns] = useState<PayrollRun[]>(payrollRuns);
  const { client } = useClient();
  const [newRunOpen, setNewRunOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: "approve" | "reject" } | null>(null);
  const [newMonth, setNewMonth] = useState("April");
  const [newYear, setNewYear] = useState("2025");
  const { toast } = useToast();

  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const handleNewRun = (e: React.FormEvent) => {
    e.preventDefault();
    const totalGross = employees.reduce((s, emp) => s + emp.salary, 0);
    const totalDed = Math.round(totalGross * 0.15);
    const newRun: PayrollRun = {
      id: String(Date.now()), month: newMonth, year: Number(newYear), status: "draft",
      totalGross, totalDeductions: totalDed, totalNet: totalGross - totalDed,
      runDate: "", employeeCount: employees.length,
    };
    setRuns(prev => [...prev, newRun]);
    setNewRunOpen(false);
    toast({ title: "Payroll Run Created", description: `${newMonth} ${newYear} payroll run created as draft.` });
  };

  const handleProcess = (id: string) => {
    setRuns(prev => prev.map(r => r.id === id ? { ...r, status: "processing" as const } : r));
    toast({ title: "Processing", description: "Payroll is being processed..." });
    setTimeout(() => {
      setRuns(prev => prev.map(r => r.id === id ? { ...r, status: "completed" as const, runDate: new Date().toISOString().split("T")[0] } : r));
      toast({ title: "Completed", description: "Payroll processing completed." });
    }, 2000);
  };

  const handleConfirm = () => {
    if (!confirmAction) return;
    if (confirmAction.action === "approve") {
      handleProcess(confirmAction.id);
    } else {
      setRuns(prev => prev.map(r => r.id === confirmAction.id ? { ...r, status: "failed" as const } : r));
      toast({ title: "Rejected", description: "Payroll run has been rejected." });
    }
    setConfirmOpen(false);
    setConfirmAction(null);
  };

  if (selectedRun) {
    const empBreakdown = employees.map(emp => {
      const comp = emp.compensation || [];
      const gross = emp.salary;
      const ded = Math.round(gross * 0.15);
      return { emp, gross, deductions: ded, net: gross - ded, components: comp };
    });

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedRun(null)}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-xl font-bold">{selectedRun.month} {selectedRun.year} Payroll</h1>
            <p className="text-sm text-muted-foreground">
              {client.companyName ? `${client.companyName} — ` : ""}Payroll run details and employee breakdown
            </p>
          </div>
          <div className="ml-auto"><StatusBadge status={selectedRun.status} /></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard title="Employees" value={selectedRun.employeeCount} icon={Users} variant="info" />
          <StatCard title="Total Gross" value={`SAR ${selectedRun.totalGross.toLocaleString()}`} icon={DollarSign} variant="primary" />
          <StatCard title="Total Deductions" value={`SAR ${selectedRun.totalDeductions.toLocaleString()}`} icon={TrendingDown} variant="warning" />
          <StatCard title="Total Net" value={`SAR ${selectedRun.totalNet.toLocaleString()}`} icon={DollarSign} variant="success" />
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Run Information</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div><span className="text-muted-foreground">Period:</span> <span className="font-medium">{selectedRun.month} {selectedRun.year}</span></div>
              <div><span className="text-muted-foreground">Run Date:</span> <span className="font-medium">{selectedRun.runDate || "Not processed"}</span></div>
              <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={selectedRun.status} /></div>
              <div><span className="text-muted-foreground">Employees:</span> <span className="font-medium">{selectedRun.employeeCount}</span></div>
            </div>
          </CardContent>
        </Card>

        <div className="bg-card rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Employee</TableHead>
                <TableHead className="font-semibold">Department</TableHead>
                <TableHead className="font-semibold text-right">Basic</TableHead>
                <TableHead className="font-semibold text-right">Allowances</TableHead>
                <TableHead className="font-semibold text-right">Gross</TableHead>
                <TableHead className="font-semibold text-right">Deductions</TableHead>
                <TableHead className="font-semibold text-right">Net Pay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {empBreakdown.map(({ emp, gross, deductions, net, components }) => {
                const basic = components.find(c => c.type === "base")?.amount || 0;
                const allowances = gross - basic;
                return (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.firstName} {emp.lastName}</TableCell>
                    <TableCell>{emp.department}</TableCell>
                    <TableCell className="text-right">{basic.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{allowances.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{gross.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-destructive">{deductions.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-semibold">{net.toLocaleString()}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {(selectedRun.status === "draft" || selectedRun.status === "processing") && (
          <div className="flex gap-2">
            {selectedRun.status === "draft" && (
              <>
                <Button className="gradient-ey text-primary-foreground font-semibold" onClick={() => { setConfirmAction({ id: selectedRun.id, action: "approve" }); setConfirmOpen(true); }}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />Process Payroll
                </Button>
                <Button variant="destructive" onClick={() => { setConfirmAction({ id: selectedRun.id, action: "reject" }); setConfirmOpen(true); }}>
                  <XCircle className="h-4 w-4 mr-2" />Reject
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Payroll Runs" description="Process and manage monthly payroll.">
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={() => setNewRunOpen(true)}>
          <Play className="h-4 w-4 mr-2" />New Payroll Run
        </Button>
      </PageHeader>

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Period</TableHead>
              <TableHead className="font-semibold">Employees</TableHead>
              <TableHead className="font-semibold text-right">Gross (SAR)</TableHead>
              <TableHead className="font-semibold text-right">Deductions (SAR)</TableHead>
              <TableHead className="font-semibold text-right">Net (SAR)</TableHead>
              <TableHead className="font-semibold">Run Date</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((run) => (
              <TableRow key={run.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelectedRun(run)}>
                <TableCell className="font-medium">{run.month} {run.year}</TableCell>
                <TableCell>{run.employeeCount}</TableCell>
                <TableCell className="text-right">{run.totalGross.toLocaleString()}</TableCell>
                <TableCell className="text-right text-destructive">{run.totalDeductions.toLocaleString()}</TableCell>
                <TableCell className="text-right font-semibold">{run.totalNet.toLocaleString()}</TableCell>
                <TableCell>{run.runDate || "—"}</TableCell>
                <TableCell><StatusBadge status={run.status} /></TableCell>
                <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedRun(run)}><Eye className="h-3.5 w-3.5" /></Button>
                    {run.status === "draft" && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-success" onClick={() => { setConfirmAction({ id: run.id, action: "approve" }); setConfirmOpen(true); }}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* New Payroll Run Dialog */}
      <Dialog open={newRunOpen} onOpenChange={setNewRunOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Payroll Run</DialogTitle><DialogDescription>Create a new monthly payroll run.</DialogDescription></DialogHeader>
          <form onSubmit={handleNewRun} className="space-y-4">
            <div className="space-y-2"><Label>Month</Label>
              <Select value={newMonth} onValueChange={setNewMonth}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Year</Label>
              <Select value={newYear} onValueChange={setNewYear}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="2025">2025</SelectItem><SelectItem value="2026">2026</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
              <p><span className="text-muted-foreground">Employees:</span> <span className="font-medium">{employees.length}</span></p>
              <p><span className="text-muted-foreground">Estimated Gross:</span> <span className="font-medium">SAR {employees.reduce((s, e) => s + e.salary, 0).toLocaleString()}</span></p>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setNewRunOpen(false)}>Cancel</Button><Button type="submit">Create Run</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Action Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmAction?.action === "approve" ? "Process Payroll" : "Reject Payroll"}</DialogTitle>
            <DialogDescription>{confirmAction?.action === "approve" ? "This will process payroll for all employees. Continue?" : "This will reject and cancel this payroll run. Continue?"}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant={confirmAction?.action === "approve" ? "default" : "destructive"} onClick={handleConfirm}>
              {confirmAction?.action === "approve" ? "Process" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
