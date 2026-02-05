import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { payrollRuns } from "@/data/mockData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

export default function PayrollPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Payroll Runs" description="Process and manage monthly payroll.">
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold"><Play className="h-4 w-4 mr-2" />New Payroll Run</Button>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {payrollRuns.map((run) => (
              <TableRow key={run.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-medium">{run.month} {run.year}</TableCell>
                <TableCell>{run.employeeCount}</TableCell>
                <TableCell className="text-right">{run.totalGross.toLocaleString()}</TableCell>
                <TableCell className="text-right text-destructive">{run.totalDeductions.toLocaleString()}</TableCell>
                <TableCell className="text-right font-semibold">{run.totalNet.toLocaleString()}</TableCell>
                <TableCell>{run.runDate || "—"}</TableCell>
                <TableCell><StatusBadge status={run.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
