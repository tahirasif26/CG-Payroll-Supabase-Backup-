import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useRole } from "@/contexts/RoleContext";
import { employees } from "@/data/mockData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Plus } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function CompensationPage() {
  const { role, currentEmployeeId } = useRole();
  const [addOpen, setAddOpen] = useState(false);
  const { toast } = useToast();

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setAddOpen(false);
    toast({ title: "Component Added", description: "The salary component has been added." });
  };

  if (role === "employee") {
    const emp = employees.find(e => e.id === currentEmployeeId);
    if (!emp) return null;
    const components = emp.compensation || [];
    const total = components.reduce((s, c) => s + c.amount, 0);

    return (
      <div className="space-y-6">
        <PageHeader title="My Compensation" description="Your salary breakdown and components." />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard title="Total Monthly Salary" value={`SAR ${total.toLocaleString()}`} icon={BarChart3} variant="primary" />
          <StatCard title="Annual Package" value={`SAR ${(total * 12).toLocaleString()}`} icon={BarChart3} variant="success" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Salary Components</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {components.map((comp, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{comp.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{comp.type}</p>
                  </div>
                  <p className="text-sm font-semibold">SAR {comp.amount.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Employer view
  const totalPayroll = employees.reduce((s, e) => s + e.salary, 0);
  const avgSalary = Math.round(totalPayroll / employees.length);
  const highest = Math.max(...employees.map((e) => e.salary));

  return (
    <div className="space-y-6">
      <PageHeader title="Compensation Management" description="Manage employee compensation structures and allowances.">
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Add Component
        </Button>
      </PageHeader>

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
              <TableHead className="font-semibold text-right">Basic</TableHead>
              <TableHead className="font-semibold text-right">Housing</TableHead>
              <TableHead className="font-semibold text-right">Travel</TableHead>
              <TableHead className="font-semibold text-right">Medical</TableHead>
              <TableHead className="font-semibold text-right">Other</TableHead>
              <TableHead className="font-semibold text-right">Total (SAR)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.sort((a, b) => b.salary - a.salary).map((emp) => {
              const comp = emp.compensation || [];
              const getAmount = (type: string) => comp.find(c => c.type === type)?.amount || 0;
              return (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">{emp.firstName} {emp.lastName}</TableCell>
                  <TableCell>{emp.department}</TableCell>
                  <TableCell className="text-right">{getAmount("base").toLocaleString()}</TableCell>
                  <TableCell className="text-right">{getAmount("housing").toLocaleString()}</TableCell>
                  <TableCell className="text-right">{getAmount("travel").toLocaleString()}</TableCell>
                  <TableCell className="text-right">{getAmount("medical").toLocaleString()}</TableCell>
                  <TableCell className="text-right">{getAmount("other").toLocaleString()}</TableCell>
                  <TableCell className="text-right font-semibold">{emp.salary.toLocaleString()}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Add Component Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Salary Component</DialogTitle>
            <DialogDescription>Add a new compensation component for an employee.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
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
              <Label>Component Name</Label>
              <Input placeholder="e.g. Performance Bonus" required />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select required>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="base">Base</SelectItem>
                  <SelectItem value="housing">Housing</SelectItem>
                  <SelectItem value="travel">Travel</SelectItem>
                  <SelectItem value="medical">Medical</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount (SAR)</Label>
              <Input type="number" placeholder="0" required min={1} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit">Add Component</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
