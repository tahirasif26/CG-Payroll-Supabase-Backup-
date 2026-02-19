import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useRole } from "@/contexts/RoleContext";
import { employees, payrollRuns } from "@/data/mockData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, Eye, FileText } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

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
                        gross: monthlySalary,
                        deductions,
                        net: netPay,
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

        {/* View Payslip Dialog */}
        <PayslipDialog payslip={viewPayslip} onClose={() => setViewPayslip(null)} onDownload={handleDownload} />
      </div>
    );
  }

  // Employer view
  return (
    <div className="space-y-6">
      <PageHeader title="Payslips" description="View and manage employee payslips for completed payroll runs." />

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
            {completedRuns.flatMap(run =>
              employees.map(emp => {
                const deductions = Math.round(emp.salary * 0.15);
                const net = emp.salary - deductions;
                return (
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
                          empId: emp.empId,
                          department: emp.department,
                          period: `${run.month} ${run.year}`,
                          gross: emp.salary,
                          deductions,
                          net,
                        })}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDownload(`${emp.firstName} ${emp.lastName}`, `${run.month} ${run.year}`)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <PayslipDialog payslip={viewPayslip} onClose={() => setViewPayslip(null)} onDownload={handleDownload} />
    </div>
  );
}

function PayslipDialog({ payslip, onClose, onDownload }: { payslip: PayslipDetail | null; onClose: () => void; onDownload: (name: string, period: string) => void }) {
  if (!payslip) return null;
  const components = [
    { label: "Basic Salary", amount: Math.round(payslip.gross * 0.6) },
    { label: "Housing Allowance", amount: Math.round(payslip.gross * 0.25) },
    { label: "Travel Allowance", amount: Math.round(payslip.gross * 0.05) },
    { label: "Medical Allowance", amount: Math.round(payslip.gross * 0.05) },
    { label: "Other Allowances", amount: Math.round(payslip.gross * 0.05) },
  ];

  return (
    <Dialog open={!!payslip} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Payslip — {payslip.period}</DialogTitle>
          <DialogDescription>{payslip.employeeName} · {payslip.empId}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">Department: {payslip.department}</div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Earnings</p>
            {components.map((c, i) => (
              <div key={i} className="flex justify-between text-sm py-1 border-b border-dashed last:border-0">
                <span>{c.label}</span>
                <span className="font-medium">SAR {c.amount.toLocaleString()}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-semibold pt-1">
              <span>Total Gross</span>
              <span>SAR {payslip.gross.toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deductions</p>
            <div className="flex justify-between text-sm py-1">
              <span>GOSI & Insurance</span>
              <span className="font-medium text-destructive">SAR {payslip.deductions.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex justify-between text-base font-bold pt-2 border-t">
            <span>Net Pay</span>
            <span>SAR {payslip.net.toLocaleString()}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => { onDownload(payslip.employeeName, payslip.period); onClose(); }}>
            <Download className="h-4 w-4 mr-2" />Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
