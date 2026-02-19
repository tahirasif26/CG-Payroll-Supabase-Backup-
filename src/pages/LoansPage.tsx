import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { loans, employees } from "@/data/mockData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, PiggyBank } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function LoansPage() {
  const [newOpen, setNewOpen] = useState(false);
  const { toast } = useToast();
  const activeLoans = loans.filter((l) => l.status === "active");
  const totalOutstanding = activeLoans.reduce((s, l) => s + l.remainingBalance, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNewOpen(false);
    toast({ title: "Loan Created", description: "The loan has been successfully created." });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Employee Loans" description="Track and manage employee loan disbursements.">
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />New Loan
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard title="Active Loans" value={activeLoans.length} icon={PiggyBank} variant="warning" />
        <StatCard title="Total Outstanding" value={`SAR ${totalOutstanding.toLocaleString()}`} icon={PiggyBank} variant="info" />
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Employee</TableHead>
              <TableHead className="font-semibold text-right">Loan Amount</TableHead>
              <TableHead className="font-semibold text-right">Remaining</TableHead>
              <TableHead className="font-semibold text-right">Monthly EMI</TableHead>
              <TableHead className="font-semibold">Start</TableHead>
              <TableHead className="font-semibold">End</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loans.map((loan) => (
              <TableRow key={loan.id}>
                <TableCell className="font-medium">{loan.employeeName}</TableCell>
                <TableCell className="text-right">SAR {loan.amount.toLocaleString()}</TableCell>
                <TableCell className="text-right font-semibold">SAR {loan.remainingBalance.toLocaleString()}</TableCell>
                <TableCell className="text-right">SAR {loan.monthlyDeduction.toLocaleString()}</TableCell>
                <TableCell>{new Date(loan.startDate).toLocaleDateString()}</TableCell>
                <TableCell>{new Date(loan.endDate).toLocaleDateString()}</TableCell>
                <TableCell><StatusBadge status={loan.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Employee Loan</DialogTitle>
            <DialogDescription>Create a new loan for an employee.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select required>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Loan Amount (SAR)</Label>
              <Input type="number" placeholder="0" required min={1} />
            </div>
            <div className="space-y-2">
              <Label>Monthly Deduction (SAR)</Label>
              <Input type="number" placeholder="0" required min={1} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" required />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
              <Button type="submit">Create Loan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
