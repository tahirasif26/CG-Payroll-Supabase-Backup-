import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { userPermissions, UserPermission } from "@/data/settingsData";
import { useEmployees as useEmployeesCtx } from "@/contexts/EmployeeContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const roleBadgeStyles: Record<string, string> = {
  admin: "bg-destructive/15 text-destructive",
  manager: "bg-info/15 text-info",
  employee: "bg-muted text-muted-foreground",
};

export default function UserManagementPage() {
  const [items, setItems] = useState<UserPermission[]>(userPermissions);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<UserPermission | null>(null);
  const [formUserId, setFormUserId] = useState("");
  const [formRole, setFormRole] = useState<"admin" | "manager" | "employee">("employee");
  const [formExpenses, setFormExpenses] = useState(false);
  const [formLeave, setFormLeave] = useState(false);
  const [formPayroll, setFormPayroll] = useState(false);
  const [formEmployees, setFormEmployees] = useState(false);
  const { toast } = useToast();

  const openAdd = () => { setEditItem(null); setFormUserId(""); setFormRole("employee"); setFormExpenses(false); setFormLeave(false); setFormPayroll(false); setFormEmployees(false); setDialogOpen(true); };
  const openEdit = (item: UserPermission) => {
    setEditItem(item); setFormUserId(item.userId); setFormRole(item.role);
    setFormExpenses(item.canApproveExpenses); setFormLeave(item.canApproveLeave);
    setFormPayroll(item.canRunPayroll); setFormEmployees(item.canManageEmployees);
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(em => em.id === formUserId);
    const userName = emp ? `${emp.firstName} ${emp.lastName}` : "Unknown";
    if (editItem) {
      setItems(prev => prev.map(i => i.id === editItem.id ? { ...i, userId: formUserId, userName, role: formRole, canApproveExpenses: formExpenses, canApproveLeave: formLeave, canRunPayroll: formPayroll, canManageEmployees: formEmployees } : i));
      toast({ title: "Updated", description: `Permissions for ${userName} updated.` });
    } else {
      setItems(prev => [...prev, { id: String(Date.now()), userId: formUserId, userName, role: formRole, canApproveExpenses: formExpenses, canApproveLeave: formLeave, canRunPayroll: formPayroll, canManageEmployees: formEmployees }]);
      toast({ title: "Added", description: `${userName} role configured.` });
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="User Management & Permissions" description="Configure user roles and access permissions.">
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add User Role</Button>
      </PageHeader>
      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/50">
            <TableHead className="font-semibold">User</TableHead><TableHead className="font-semibold">Role</TableHead>
            <TableHead className="font-semibold">Approve Expenses</TableHead><TableHead className="font-semibold">Approve Leave</TableHead>
            <TableHead className="font-semibold">Run Payroll</TableHead><TableHead className="font-semibold">Manage Employees</TableHead>
            <TableHead className="font-semibold text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.userName}</TableCell>
                <TableCell><Badge className={`capitalize ${roleBadgeStyles[item.role]}`}>{item.role}</Badge></TableCell>
                <TableCell>{item.canApproveExpenses ? "✓" : "—"}</TableCell>
                <TableCell>{item.canApproveLeave ? "✓" : "—"}</TableCell>
                <TableCell>{item.canRunPayroll ? "✓" : "—"}</TableCell>
                <TableCell>{item.canManageEmployees ? "✓" : "—"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? "Edit Permissions" : "Add User Role"}</DialogTitle><DialogDescription>Configure user access permissions.</DialogDescription></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Employee</Label>
              <Select value={formUserId} onValueChange={setFormUserId}><SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Role</Label>
              <Select value={formRole} onValueChange={v => setFormRole(v as any)}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="admin">Admin</SelectItem><SelectItem value="manager">Manager</SelectItem><SelectItem value="employee">Employee</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3"><Switch checked={formExpenses} onCheckedChange={setFormExpenses} /><Label>Can Approve Expenses</Label></div>
              <div className="flex items-center gap-3"><Switch checked={formLeave} onCheckedChange={setFormLeave} /><Label>Can Approve Leave</Label></div>
              <div className="flex items-center gap-3"><Switch checked={formPayroll} onCheckedChange={setFormPayroll} /><Label>Can Run Payroll</Label></div>
              <div className="flex items-center gap-3"><Switch checked={formEmployees} onCheckedChange={setFormEmployees} /><Label>Can Manage Employees</Label></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit">{editItem ? "Update" : "Add"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
