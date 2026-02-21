import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useRole } from "@/contexts/RoleContext";
import { useClient } from "@/contexts/ClientContext";
import { employees, payrollRuns } from "@/data/mockData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, Eye, FileText, Search } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

interface PayslipDetail {
  employeeName: string;
  empId: string;
  department: string;
  period: string;
  gross: number;
  deductions: number;
  net: number;
}

export default function PayslipsPage() {
  const { role, currentEmployeeId } = useRole();
  const currentEmployee = employees.find(e => e.id === currentEmployeeId);
  const completedRuns = payrollRuns.filter(r => r.status === "completed");
  const [viewPayslip, setViewPayslip] = useState<PayslipDetail | null>(null);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const handleDownload = (name: string, period: string) => {
    toast({ title: "Downloading Payslip", description: `Payslip for ${name} — ${period} will be downloaded.` });
  };

  if (role === "employee" && currentEmployee) {
    const monthlySalary = currentEmployee.salary;
    const deductions = Math.round(monthlySalary * 0.15);
    const netPay = monthlySalary - deductions;

    return (
      <div className="space-y-6">
        <PageHeader title="My Payslips" description="View and download your monthly payslips." />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Gross Salary" value={`SAR ${monthlySalary.toLocaleString()}`} icon={FileText} variant="primary" />
          <StatCard title="Total Deductions" value={`SAR ${deductions.toLocaleString()}`} icon={FileText} variant="warning" />
          <StatCard title="Net Pay" value={`SAR ${netPay.toLocaleString()}`} icon={FileText} variant="success" />
        </div>
        <div className="bg-card rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Period</TableHead>
                <TableHead className="font-semibold text-right">Gross (SAR)</TableHead>
                <TableHead className="font-semibold text-right">Deductions (SAR)</TableHead>
                <TableHead className="font-semibold text-right">Net Pay (SAR)</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {completedRuns.map(run => (
                <TableRow key={run.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">{run.month} {run.year}</TableCell>
                  <TableCell className="text-right">{monthlySalary.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-destructive">{deductions.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-semibold">{netPay.toLocaleString()}</TableCell>
                  <TableCell><StatusBadge status="completed" /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setViewPayslip({
                        employeeName: `${currentEmployee.firstName} ${currentEmployee.lastName}`,
                        empId: currentEmployee.empId,
                        department: currentEmployee.department,
                        period: `${run.month} ${run.year}`,
                        gross: monthlySalary, deductions, net: netPay,
                      })}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDownload(`${currentEmployee.firstName} ${currentEmployee.lastName}`, `${run.month} ${run.year}`)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <PayslipDialog payslip={viewPayslip} onClose={() => setViewPayslip(null)} onDownload={handleDownload} />
      </div>
    );
  }

  const allPayslips = completedRuns.flatMap(run =>
    employees.map(emp => {
      const deductions = Math.round(emp.salary * 0.15);
      const net = emp.salary - deductions;
      return { run, emp, deductions, net };
    })
  );

  const filtered = allPayslips.filter(({ emp, run }) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q) ||
      emp.empId.toLowerCase().includes(q) ||
      emp.department.toLowerCase().includes(q) ||
      `${run.month} ${run.year}`.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Payslips" description="View and manage employee payslips for completed payroll runs." />
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name, ID, period..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Employee</TableHead>
              <TableHead className="font-semibold">Period</TableHead>
              <TableHead className="font-semibold text-right">Gross (SAR)</TableHead>
              <TableHead className="font-semibold text-right">Net (SAR)</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(({ run, emp, deductions, net }) => (
              <TableRow key={`${run.id}-${emp.id}`} className="hover:bg-muted/30 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-secondary-foreground">{emp.firstName[0]}{emp.lastName[0]}</span>
                    </div>
                    <span className="text-sm font-medium">{emp.firstName} {emp.lastName}</span>
                  </div>
                </TableCell>
                <TableCell>{run.month} {run.year}</TableCell>
                <TableCell className="text-right">{emp.salary.toLocaleString()}</TableCell>
                <TableCell className="text-right font-semibold">{net.toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setViewPayslip({
                      employeeName: `${emp.firstName} ${emp.lastName}`,
                      empId: emp.empId, department: emp.department,
                      period: `${run.month} ${run.year}`,
                      gross: emp.salary, deductions, net,
                    })}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDownload(`${emp.firstName} ${emp.lastName}`, `${run.month} ${run.year}`)}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <PayslipDialog payslip={viewPayslip} onClose={() => setViewPayslip(null)} onDownload={handleDownload} />
    </div>
  );
}

function PayslipDialog({ payslip, onClose, onDownload }: { payslip: PayslipDetail | null; onClose: () => void; onDownload: (name: string, period: string) => void }) {
  const { client } = useClient();
  if (!payslip) return null;

  const components = [
    { label: "Basic Salary", amount: Math.round(payslip.gross * 0.6) },
    { label: "Housing Allowance", amount: Math.round(payslip.gross * 0.25) },
    { label: "Travel Allowance", amount: Math.round(payslip.gross * 0.05) },
    { label: "Medical Allowance", amount: Math.round(payslip.gross * 0.05) },
    { label: "Other Allowances", amount: Math.round(payslip.gross * 0.05) },
  ];

  const companyName = client.companyName || "Your Company";

  return (
    <Dialog open={!!payslip} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        {/* Payslip Header with company branding */}
        <div className="bg-primary px-6 py-5 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
                <span className="text-lg font-bold">{companyName.charAt(0)}</span>
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight">{companyName}</h2>
                <p className="text-xs text-primary-foreground/70">Pay Statement</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">{payslip.period}</p>
              <p className="text-xs text-primary-foreground/70">Payslip</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Employee Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Employee Name</p>
              <p className="font-semibold">{payslip.employeeName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Employee ID</p>
              <p className="font-semibold">{payslip.empId}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Department</p>
              <p className="font-medium">{payslip.department}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pay Period</p>
              <p className="font-medium">{payslip.period}</p>
            </div>
          </div>

          <Separator />

          {/* Earnings */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Earnings</p>
            <div className="bg-muted/30 rounded-lg overflow-hidden">
              {components.map((c, i) => (
                <div key={i} className={`flex justify-between text-sm px-3 py-2 ${i < components.length - 1 ? 'border-b border-border/50' : ''}`}>
                  <span>{c.label}</span>
                  <span className="font-medium">SAR {c.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm font-bold px-3 pt-1">
              <span>Total Gross</span>
              <span>SAR {payslip.gross.toLocaleString()}</span>
            </div>
          </div>

          <Separator />

          {/* Deductions */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deductions</p>
            <div className="bg-muted/30 rounded-lg overflow-hidden">
              <div className="flex justify-between text-sm px-3 py-2">
                <span>GOSI & Insurance</span>
                <span className="font-medium text-destructive">SAR {payslip.deductions.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Net Pay */}
          <div className="flex justify-between items-center bg-primary/10 rounded-lg px-4 py-3">
            <span className="text-base font-bold">Net Pay</span>
            <span className="text-lg font-bold text-primary">SAR {payslip.net.toLocaleString()}</span>
          </div>

          {/* Footer note */}
          <p className="text-[10px] text-muted-foreground text-center">
            This is a computer-generated payslip. If you have any queries, please contact the HR department.
          </p>
        </div>

        <div className="px-6 pb-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => { onDownload(payslip.employeeName, payslip.period); onClose(); }}>
            <Download className="h-4 w-4 mr-2" />Download PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
