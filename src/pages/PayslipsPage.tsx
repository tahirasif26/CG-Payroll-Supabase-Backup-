import { PageHeader } from "@/components/PageHeader";
import { useRole } from "@/contexts/RoleContext";
import { employees, payrollRuns } from "@/data/mockData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, Eye, FileText } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";

export default function PayslipsPage() {
  const { role, currentEmployeeId } = useRole();
  const currentEmployee = employees.find(e => e.id === currentEmployeeId);
  const completedRuns = payrollRuns.filter(r => r.status === "completed");

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
                      <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm"><Download className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // Employer view - all employee payslips
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
                    <TableCell className="text-right font-semibold">{(emp.salary - deductions).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm"><Download className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
