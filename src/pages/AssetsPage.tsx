import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useRole } from "@/contexts/RoleContext";
import { assets, employees } from "@/data/mockData";
import { useActiveEmployees } from "@/hooks/useActiveEmployees";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Monitor, Laptop, Smartphone, Key } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function AssetsPage() {
  const { role, currentEmployeeId } = useRole();
  const activeEmps = useActiveEmployees();
  const [newOpen, setNewOpen] = useState(false);
  const { toast } = useToast();

  const displayAssets = role === "employee"
    ? assets.filter(a => a.employeeId === currentEmployeeId)
    : assets;

  const totalAssets = displayAssets.length;
  const assignedAssets = displayAssets.filter(a => a.status === "assigned").length;
  const availableAssets = displayAssets.filter(a => a.status === "available").length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNewOpen(false);
    toast({ title: "Asset Added", description: "The asset has been added successfully." });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={role === "employee" ? "My Assets" : "Asset Management"}
        description={role === "employee" ? "Assets assigned to you." : "Track and manage company assets."}
      >
        {role === "employer" && (
          <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />Add Asset
          </Button>
        )}
      </PageHeader>

      {role === "employer" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Total Assets" value={totalAssets} icon={Monitor} variant="primary" />
          <StatCard title="Assigned" value={assignedAssets} icon={Laptop} variant="info" />
          <StatCard title="Available" value={availableAssets} icon={Key} variant="success" />
        </div>
      )}

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Asset</TableHead>
              <TableHead className="font-semibold">Category</TableHead>
              <TableHead className="font-semibold">Serial No.</TableHead>
              {role === "employer" && <TableHead className="font-semibold">Assigned To</TableHead>}
              <TableHead className="font-semibold">Assigned Date</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayAssets.map(asset => (
              <TableRow key={asset.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-medium">{asset.name}</TableCell>
                <TableCell>{asset.category}</TableCell>
                <TableCell className="font-mono text-sm">{asset.serialNumber}</TableCell>
                {role === "employer" && <TableCell>{asset.employeeName || "—"}</TableCell>}
                <TableCell>{asset.assignedDate ? new Date(asset.assignedDate).toLocaleDateString() : "—"}</TableCell>
                <TableCell><StatusBadge status={asset.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Asset</DialogTitle>
            <DialogDescription>Register a new company asset.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Asset Name</Label>
              <Input placeholder='e.g. MacBook Pro 16"' required />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select required>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="laptop">Laptop</SelectItem>
                  <SelectItem value="monitor">Monitor</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Serial Number</Label>
              <Input placeholder="e.g. MBP-2024-007" required />
            </div>
            <div className="space-y-2">
              <Label>Assign To (Optional)</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {activeEmps.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
              <Button type="submit">Add Asset</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
