import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Search, ShieldCheck, ShieldX, DoorOpen } from "lucide-react";
import { useBLEAccess, BLEDoor } from "@/contexts/BLEAccessContext";
import { useActiveEmployees } from "@/hooks/useActiveEmployees";

// ─── Doors/Locks Tab ───
function DoorsTab() {
  const { doors, addDoor, editDoor, deleteDoor } = useBLEAccess();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<BLEDoor | null>(null);
  const [form, setForm] = useState({ name: "", location: "", status: "active" as BLEDoor["status"] });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { toast } = useToast();

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: "", location: "", status: "active" });
    setDialogOpen(true);
  };

  const openEdit = (door: BLEDoor) => {
    setEditItem(door);
    setForm({ name: door.name, location: door.location, status: door.status });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editItem) {
      editDoor(editItem.id, form);
      toast({ title: "Door Updated", description: `${form.name} has been updated.` });
    } else {
      addDoor(form);
      toast({ title: "Door Added", description: `${form.name} has been added.` });
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    const door = doors.find(d => d.id === id);
    deleteDoor(id);
    setDeleteConfirm(null);
    toast({ title: "Door Deleted", description: `${door?.name} and its access grants have been removed.` });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Manage BLE-enabled lock points across your facilities.</p>
        <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add Door</Button>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Door Name</TableHead>
              <TableHead className="font-semibold">Location</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {doors.map(door => (
              <TableRow key={door.id}>
                <TableCell className="font-medium"><DoorOpen className="h-4 w-4 inline mr-2 text-muted-foreground" />{door.name}</TableCell>
                <TableCell>{door.location}</TableCell>
                <TableCell>
                  <Badge variant={door.status === "active" ? "default" : "secondary"}>{door.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(door)}><Edit2 className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteConfirm(door.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {doors.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No doors configured.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Door" : "Add Door"}</DialogTitle>
            <DialogDescription>Configure a BLE-enabled lock point.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Door Name</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., Main Entrance" />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g., Building A, Floor 2" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as BLEDoor["status"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Door</DialogTitle>
            <DialogDescription>This will also revoke all access grants for this door. Continue?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Access Control Tab ───
function AccessControlTab() {
  const { doors, grants, grantAccess, revokeAccess, getAccessForEmployee } = useBLEAccess();
  const activeEmployees = useActiveEmployees();
  const [search, setSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedDoor, setSelectedDoor] = useState("");
  const { toast } = useToast();

  const activeDoors = doors.filter(d => d.status === "active");

  const handleGrant = () => {
    if (!selectedEmployee || !selectedDoor) return;
    grantAccess(selectedEmployee, selectedDoor);
    const emp = activeEmployees.find(e => e.id === selectedEmployee);
    const door = doors.find(d => d.id === selectedDoor);
    toast({ title: "Access Granted", description: `${emp?.firstName} ${emp?.lastName} now has access to ${door?.name}.` });
    setSelectedEmployee("");
    setSelectedDoor("");
  };

  const filteredEmployees = activeEmployees.filter(emp => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q) || emp.empId.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      {/* Grant Access Form */}
      <div className="bg-card border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3">Grant Access</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Select employee..." /></SelectTrigger>
            <SelectContent>
              {activeEmployees.map(emp => (
                <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.empId})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedDoor} onValueChange={setSelectedDoor}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Select door..." /></SelectTrigger>
            <SelectContent>
              {activeDoors.map(door => (
                <SelectItem key={door.id} value={door.id}>{door.name} — {door.location}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleGrant} disabled={!selectedEmployee || !selectedDoor}>
            <ShieldCheck className="h-4 w-4 mr-2" />Grant
          </Button>
        </div>
      </div>

      {/* Employee Access Matrix */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Employee</TableHead>
                <TableHead className="font-semibold">ID</TableHead>
                <TableHead className="font-semibold">Authorized Doors</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map(emp => {
                const empGrants = getAccessForEmployee(emp.id);
                return (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.firstName} {emp.lastName}</TableCell>
                    <TableCell className="font-mono text-sm">{emp.empId}</TableCell>
                    <TableCell>
                      {empGrants.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {empGrants.map(g => {
                            const door = doors.find(d => d.id === g.doorId);
                            return (
                              <Badge key={g.id} variant="secondary" className="text-xs gap-1">
                                {door?.name || g.doorId}
                                <button
                                  className="ml-1 text-destructive hover:text-destructive/80"
                                  onClick={() => {
                                    revokeAccess(g.id);
                                    toast({ title: "Access Revoked", description: `${emp.firstName}'s access to ${door?.name} revoked.` });
                                  }}
                                >
                                  <ShieldX className="h-3 w-3" />
                                </button>
                              </Badge>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No access</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-xs text-muted-foreground">{empGrants.length} door(s)</span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
}

// ─── Main Page ───
export default function AccessManagementPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Access Management" description="Manage BLE door locks and employee access authorizations." />
      <Tabs defaultValue="doors">
        <TabsList>
          <TabsTrigger value="doors">Doors & Locks</TabsTrigger>
          <TabsTrigger value="access">Access Control</TabsTrigger>
        </TabsList>
        <TabsContent value="doors"><DoorsTab /></TabsContent>
        <TabsContent value="access"><AccessControlTab /></TabsContent>
      </Tabs>
    </div>
  );
}
