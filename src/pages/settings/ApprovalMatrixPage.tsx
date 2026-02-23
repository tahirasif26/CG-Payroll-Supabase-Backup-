import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useApprovals, ApprovalRole, UserApprovalAssignment } from "@/contexts/ApprovalContext";
import { employees } from "@/data/mockData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function ApprovalMatrixPage() {
  const { roles, assignments, addRole, updateRole, deleteRole, addAssignment, updateAssignment, deleteAssignment } = useApprovals();
  const { toast } = useToast();

  // Role dialog state
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editRole, setEditRole] = useState<ApprovalRole | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleLimit, setRoleLimit] = useState("");
  const [roleHR, setRoleHR] = useState(false);
  const [rolePayroll, setRolePayroll] = useState(false);

  // Assignment dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editAssign, setEditAssign] = useState<UserApprovalAssignment | null>(null);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignRoleIds, setAssignRoleIds] = useState<string[]>([]);

  const openAddRole = () => {
    setEditRole(null); setRoleName(""); setRoleLimit("0"); setRoleHR(false); setRolePayroll(false);
    setRoleDialogOpen(true);
  };
  const openEditRole = (r: ApprovalRole) => {
    setEditRole(r); setRoleName(r.name); setRoleLimit(String(r.expenseApprovalLimit)); setRoleHR(r.canApproveHR); setRolePayroll(r.canApprovePayroll);
    setRoleDialogOpen(true);
  };
  const handleRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) return;
    const data: ApprovalRole = {
      id: editRole?.id || String(Date.now()),
      name: roleName.trim(),
      expenseApprovalLimit: Number(roleLimit) || 0,
      canApproveHR: roleHR,
      canApprovePayroll: rolePayroll,
    };
    if (editRole) { updateRole(data); toast({ title: "Updated", description: "Approval role updated." }); }
    else { addRole(data); toast({ title: "Added", description: "Approval role created." }); }
    setRoleDialogOpen(false);
  };

  const openAddAssign = () => {
    setEditAssign(null); setAssignUserId(""); setAssignRoleIds([]);
    setAssignDialogOpen(true);
  };
  const openEditAssign = (a: UserApprovalAssignment) => {
    setEditAssign(a); setAssignUserId(a.userId); setAssignRoleIds([...a.roleIds]);
    setAssignDialogOpen(true);
  };
  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignUserId || assignRoleIds.length === 0) return;
    const emp = employees.find(em => em.id === assignUserId);
    const userName = emp ? `${emp.firstName} ${emp.lastName}` : "Unknown";
    const data: UserApprovalAssignment = {
      id: editAssign?.id || String(Date.now()),
      userId: assignUserId,
      userName,
      roleIds: assignRoleIds,
    };
    if (editAssign) { updateAssignment(data); toast({ title: "Updated", description: `Roles for ${userName} updated.` }); }
    else { addAssignment(data); toast({ title: "Assigned", description: `Roles assigned to ${userName}.` }); }
    setAssignDialogOpen(false);
  };

  const toggleAssignRole = (roleId: string) => {
    setAssignRoleIds(prev => prev.includes(roleId) ? prev.filter(r => r !== roleId) : [...prev, roleId]);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Approval Matrix" description="Configure approval roles and assign them to employees." />
      <Tabs defaultValue="roles">
        <TabsList>
          <TabsTrigger value="roles">Approval Roles</TabsTrigger>
          <TabsTrigger value="assignments">User Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={openAddRole}>
              <Plus className="h-4 w-4 mr-2" />Add Role
            </Button>
          </div>
          <div className="bg-card rounded-xl border overflow-hidden">
            <Table>
              <TableHeader><TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Role Name</TableHead>
                <TableHead className="font-semibold text-right">Expense Approval Limit (SAR)</TableHead>
                <TableHead className="font-semibold">Can Approve HR</TableHead>
                <TableHead className="font-semibold">Can Approve Payroll</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {roles.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-right">{r.expenseApprovalLimit > 0 ? `SAR ${r.expenseApprovalLimit.toLocaleString()}` : "—"}</TableCell>
                    <TableCell>{r.canApproveHR ? "✓" : "—"}</TableCell>
                    <TableCell>{r.canApprovePayroll ? "✓" : "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditRole(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { deleteRole(r.id); toast({ title: "Deleted", description: "Role removed." }); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={openAddAssign}>
              <Plus className="h-4 w-4 mr-2" />Assign Roles
            </Button>
          </div>
          <div className="bg-card rounded-xl border overflow-hidden">
            <Table>
              <TableHeader><TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Employee</TableHead>
                <TableHead className="font-semibold">Assigned Roles</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {assignments.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.userName}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {a.roleIds.map(rid => {
                          const role = roles.find(r => r.id === rid);
                          return role ? <Badge key={rid} variant="secondary" className="text-xs">{role.name}</Badge> : null;
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditAssign(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { deleteAssignment(a.id); toast({ title: "Removed", description: "Assignment removed." }); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editRole ? "Edit Role" : "Add Approval Role"}</DialogTitle><DialogDescription>Configure approval permissions for this role.</DialogDescription></DialogHeader>
          <form onSubmit={handleRoleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Role Name</Label><Input value={roleName} onChange={e => setRoleName(e.target.value)} required /></div>
            <div className="space-y-2"><Label>Expense Approval Limit (SAR)</Label><Input type="number" min="0" value={roleLimit} onChange={e => setRoleLimit(e.target.value)} /><p className="text-xs text-muted-foreground">Set to 0 for no expense approval. Use a very high number for unlimited.</p></div>
            <div className="space-y-3">
              <div className="flex items-center gap-3"><Switch checked={roleHR} onCheckedChange={setRoleHR} /><Label>Can Approve HR (Loans, Separations)</Label></div>
              <div className="flex items-center gap-3"><Switch checked={rolePayroll} onCheckedChange={setRolePayroll} /><Label>Can Approve Payroll</Label></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setRoleDialogOpen(false)}>Cancel</Button><Button type="submit">{editRole ? "Update" : "Add"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assignment Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editAssign ? "Edit Assignment" : "Assign Roles"}</DialogTitle><DialogDescription>Select an employee and assign approval roles.</DialogDescription></DialogHeader>
          <form onSubmit={handleAssignSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Employee</Label>
              <Select value={assignUserId} onValueChange={setAssignUserId}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Roles</Label>
              <div className="space-y-2 border rounded-md p-3">
                {roles.map(r => (
                  <div key={r.id} className="flex items-center gap-3">
                    <Checkbox checked={assignRoleIds.includes(r.id)} onCheckedChange={() => toggleAssignRole(r.id)} />
                    <span className="text-sm">{r.name}</span>
                    {r.expenseApprovalLimit > 0 && <span className="text-xs text-muted-foreground">(SAR {r.expenseApprovalLimit.toLocaleString()})</span>}
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button><Button type="submit">{editAssign ? "Update" : "Assign"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
