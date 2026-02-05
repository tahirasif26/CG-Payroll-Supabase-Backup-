import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { employees } from "@/data/mockData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Download } from "lucide-react";

export default function EmployeesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Employees" description="Manage employee records and documentation.">
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold"><Plus className="h-4 w-4 mr-2" />Add Employee</Button>
      </PageHeader>

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Employee</TableHead>
              <TableHead className="font-semibold">ID</TableHead>
              <TableHead className="font-semibold">Department</TableHead>
              <TableHead className="font-semibold">Designation</TableHead>
              <TableHead className="font-semibold">Joined</TableHead>
              <TableHead className="font-semibold text-right">Salary (SAR)</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((emp) => (
              <TableRow key={emp.id} className="hover:bg-muted/30 cursor-pointer transition-colors">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-secondary-foreground">{emp.firstName[0]}{emp.lastName[0]}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{emp.firstName} {emp.lastName}</p>
                      <p className="text-xs text-muted-foreground">{emp.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm font-mono">{emp.empId}</TableCell>
                <TableCell className="text-sm">{emp.department}</TableCell>
                <TableCell className="text-sm">{emp.designation}</TableCell>
                <TableCell className="text-sm">{new Date(emp.joiningDate).toLocaleDateString()}</TableCell>
                <TableCell className="text-sm text-right font-semibold">{emp.salary.toLocaleString()}</TableCell>
                <TableCell><StatusBadge status={emp.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
