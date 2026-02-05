import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { expenses } from "@/data/mockData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function ExpensesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Expense Reimbursement" description="Submit and track expense claims.">
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold"><Plus className="h-4 w-4 mr-2" />New Claim</Button>
      </PageHeader>

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Employee</TableHead>
              <TableHead className="font-semibold">Category</TableHead>
              <TableHead className="font-semibold">Description</TableHead>
              <TableHead className="font-semibold text-right">Amount (SAR)</TableHead>
              <TableHead className="font-semibold">Submitted</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((exp) => (
              <TableRow key={exp.id}>
                <TableCell className="font-medium">{exp.employeeName}</TableCell>
                <TableCell>{exp.category}</TableCell>
                <TableCell className="text-muted-foreground max-w-[200px] truncate">{exp.description}</TableCell>
                <TableCell className="text-right font-semibold">{exp.amount.toLocaleString()}</TableCell>
                <TableCell>{new Date(exp.submissionDate).toLocaleDateString()}</TableCell>
                <TableCell><StatusBadge status={exp.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
