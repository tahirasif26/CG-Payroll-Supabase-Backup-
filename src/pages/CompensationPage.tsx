import { PageHeader } from "@/components/PageHeader";
import { employees } from "@/data/mockData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3 } from "lucide-react";
import { StatCard } from "@/components/StatCard";

export default function CompensationPage() {
  const totalPayroll = employees.reduce((s, e) => s + e.salary, 0);
  const avgSalary = Math.round(totalPayroll / employees.length);
  const highest = Math.max(...employees.map((e) => e.salary));

  return (
    <div className="space-y-6">
      <PageHeader title="Compensation" description="Overview of employee compensation structure." />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Monthly Payroll" value={`SAR ${totalPayroll.toLocaleString()}`} icon={BarChart3} variant="primary" />
        <StatCard title="Average Salary" value={`SAR ${avgSalary.toLocaleString()}`} icon={BarChart3} variant="info" />
        <StatCard title="Highest Salary" value={`SAR ${highest.toLocaleString()}`} icon={BarChart3} variant="success" />
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Employee</TableHead>
              <TableHead className="font-semibold">Department</TableHead>
              <TableHead className="font-semibold">Designation</TableHead>
              <TableHead className="font-semibold text-right">Base Salary (SAR)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.sort((a, b) => b.salary - a.salary).map((emp) => (
              <TableRow key={emp.id}>
                <TableCell className="font-medium">{emp.firstName} {emp.lastName}</TableCell>
                <TableCell>{emp.department}</TableCell>
                <TableCell>{emp.designation}</TableCell>
                <TableCell className="text-right font-semibold">{emp.salary.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
