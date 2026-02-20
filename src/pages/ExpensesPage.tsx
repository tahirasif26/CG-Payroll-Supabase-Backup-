import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { expenses, payrollRuns } from "@/data/mockData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function ExpensesPage() {
  const [newOpen, setNewOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNewOpen(false);
    toast({ title: "Expense Claim Submitted", description: "Your expense claim has been submitted for approval." });
  };

  const filtered = expenses.filter(exp => {
    if (!search) return true;
    const q = search.toLowerCase();
    return exp.employeeName.toLowerCase().includes(q) ||
      exp.category.toLowerCase().includes(q) ||
      exp.description.toLowerCase().includes(q);
  });

  const getPayrollLabel = (payrollRunId?: string) => {
    if (!payrollRunId) return null;
    const run = payrollRuns.find(r => r.id === payrollRunId);
    return run ? `${run.month} ${run.year}` : null;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Expense Reimbursement" description="Submit and track expense claims.">
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />New Claim
        </Button>
      </PageHeader>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name, category, description..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

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
              <TableHead className="font-semibold">Payroll Run</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((exp) => {
              const payrollLabel = getPayrollLabel(exp.payrollRunId);
              return (
                <TableRow key={exp.id}>
                  <TableCell className="font-medium">{exp.employeeName}</TableCell>
                  <TableCell>{exp.category}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">{exp.description}</TableCell>
                  <TableCell className="text-right font-semibold">{exp.amount.toLocaleString()}</TableCell>
                  <TableCell>{new Date(exp.submissionDate).toLocaleDateString()}</TableCell>
                  <TableCell><StatusBadge status={exp.status} /></TableCell>
                  <TableCell>
                    {payrollLabel ? (
                      <Badge variant="outline" className="text-xs">{payrollLabel}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Expense Claim</DialogTitle>
            <DialogDescription>Submit a new expense for reimbursement.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select required>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="travel">Travel</SelectItem>
                  <SelectItem value="entertainment">Client Entertainment</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount (SAR)</Label>
              <Input type="number" placeholder="0.00" required min={1} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Describe the expense..." required />
            </div>
            <div className="space-y-2">
              <Label>Receipt / Attachment</Label>
              <Input type="file" accept="image/*,.pdf" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
              <Button type="submit">Submit Claim</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
