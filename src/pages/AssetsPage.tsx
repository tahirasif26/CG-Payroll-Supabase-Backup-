import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useRole } from "@/contexts/RoleContext";
import { useActiveEmployees } from "@/hooks/useActiveEmployees";
import { useAssets, AssetHistoryEntry } from "@/contexts/AssetContext";
import { Asset } from "@/types/hcm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Monitor, Laptop, Key, Edit2, Trash2, History, ArrowRightLeft } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

let assetIdCounter = 100;

export default function AssetsPage() {
  const { role, currentEmployeeId } = useRole();
  const activeEmps = useActiveEmployees();
  const { assets, addAsset, updateAsset, deleteAsset, reassignAsset, getAssetHistory } = useAssets();
  const { toast } = useToast();

  const [newOpen, setNewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<Asset | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignItem, setReassignItem] = useState<Asset | null>(null);
  const [reassignTo, setReassignTo] = useState<string>("none");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyAsset, setHistoryAsset] = useState<Asset | null>(null);
  const [historyEntries, setHistoryEntries] = useState<AssetHistoryEntry[]>([]);

  // New asset form state
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newSerial, setNewSerial] = useState("");
  const [newAssignTo, setNewAssignTo] = useState("none");

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editSerial, setEditSerial] = useState("");

  const displayAssets = role === "employee"
    ? assets.filter(a => a.employeeId === currentEmployeeId)
    : assets;

  const totalAssets = displayAssets.length;
  const assignedAssets = displayAssets.filter(a => a.status === "assigned").length;
  const availableAssets = displayAssets.filter(a => a.status === "available").length;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const assignEmp = newAssignTo !== "none" ? activeEmps.find(emp => emp.id === newAssignTo) : null;
    const newAsset: Asset = {
      id: String(++assetIdCounter),
      name: newName,
      category: newCategory,
      serialNumber: newSerial,
      employeeId: assignEmp?.id || null,
      employeeName: assignEmp ? `${assignEmp.firstName} ${assignEmp.lastName}` : null,
      assignedDate: assignEmp ? new Date().toISOString().split("T")[0] : null,
      status: assignEmp ? "assigned" : "available",
    };
    addAsset(newAsset);
    setNewOpen(false);
    setNewName(""); setNewCategory(""); setNewSerial(""); setNewAssignTo("none");
    toast({ title: "Asset Added", description: `"${newName}" has been added successfully.` });
  };

  const openEdit = (asset: Asset) => {
    setEditItem(asset);
    setEditName(asset.name);
    setEditCategory(asset.category);
    setEditSerial(asset.serialNumber);
    setEditOpen(true);
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    updateAsset(editItem.id, { name: editName, category: editCategory, serialNumber: editSerial });
    setEditOpen(false);
    toast({ title: "Asset Updated", description: `"${editName}" has been updated.` });
  };

  const handleDelete = () => {
    if (!deleteId) return;
    const asset = assets.find(a => a.id === deleteId);
    deleteAsset(deleteId);
    setDeleteConfirmOpen(false);
    setDeleteId(null);
    toast({ title: "Asset Deleted", description: `"${asset?.name}" has been removed.` });
  };

  const openReassign = (asset: Asset) => {
    setReassignItem(asset);
    setReassignTo(asset.employeeId || "none");
    setReassignOpen(true);
  };

  const handleReassign = () => {
    if (!reassignItem) return;
    const emp = reassignTo !== "none" ? activeEmps.find(e => e.id === reassignTo) : null;
    reassignAsset(reassignItem.id, emp?.id || null, emp ? `${emp.firstName} ${emp.lastName}` : null);
    setReassignOpen(false);
    toast({
      title: emp ? "Asset Reassigned" : "Asset Unassigned",
      description: emp ? `"${reassignItem.name}" assigned to ${emp.firstName} ${emp.lastName}.` : `"${reassignItem.name}" is now unassigned.`,
    });
  };

  const openHistory = (asset: Asset) => {
    setHistoryAsset(asset);
    setHistoryEntries(getAssetHistory(asset.id));
    setHistoryOpen(true);
  };

  const actionLabel = (action: AssetHistoryEntry["action"]) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      assigned: { label: "Assigned", variant: "default" },
      unassigned: { label: "Unassigned", variant: "secondary" },
      reassigned: { label: "Reassigned", variant: "default" },
      created: { label: "Created", variant: "outline" },
      deleted: { label: "Deleted", variant: "destructive" },
      edited: { label: "Edited", variant: "secondary" },
      maintenance: { label: "Maintenance", variant: "secondary" },
    };
    return map[action] || { label: action, variant: "secondary" as const };
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
              {role === "employer" && <TableHead className="font-semibold text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayAssets.length > 0 ? displayAssets.map(asset => (
              <TableRow key={asset.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-medium">{asset.name}</TableCell>
                <TableCell>{asset.category}</TableCell>
                <TableCell className="font-mono text-sm">{asset.serialNumber}</TableCell>
                {role === "employer" && <TableCell>{asset.employeeName || "—"}</TableCell>}
                <TableCell>{asset.assignedDate ? new Date(asset.assignedDate).toLocaleDateString() : "—"}</TableCell>
                <TableCell><StatusBadge status={asset.status} /></TableCell>
                {role === "employer" && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openHistory(asset)} title="View History">
                        <History className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openReassign(asset)} title="Reassign">
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(asset)} title="Edit">
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeleteId(asset.id); setDeleteConfirmOpen(true); }} title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={role === "employer" ? 7 : 5} className="text-center py-8 text-muted-foreground">
                  No assets found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Asset</DialogTitle>
            <DialogDescription>Register a new company asset.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label>Asset Name</Label>
              <Input placeholder='e.g. MacBook Pro 16"' required value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select required value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Laptop">Laptop</SelectItem>
                  <SelectItem value="Monitor">Monitor</SelectItem>
                  <SelectItem value="Phone">Phone</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Serial Number</Label>
              <Input placeholder="e.g. MBP-2024-007" required value={newSerial} onChange={e => setNewSerial(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Assign To (Optional)</Label>
              <Select value={newAssignTo} onValueChange={setNewAssignTo}>
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

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
            <DialogDescription>Update asset details for "{editItem?.name}".</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Asset Name</Label>
              <Input required value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Laptop">Laptop</SelectItem>
                  <SelectItem value="Monitor">Monitor</SelectItem>
                  <SelectItem value="Phone">Phone</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Serial Number</Label>
              <Input required value={editSerial} onChange={e => setEditSerial(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reassign Dialog */}
      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Asset</DialogTitle>
            <DialogDescription>
              Reassign "{reassignItem?.name}" to a different employee or make it available.
              {reassignItem?.employeeName && (
                <span className="block mt-1 text-sm">Currently assigned to: <strong>{reassignItem.employeeName}</strong></span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select value={reassignTo} onValueChange={setReassignTo}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned (Available)</SelectItem>
                  {activeEmps.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignOpen(false)}>Cancel</Button>
            <Button onClick={handleReassign}>Confirm Reassignment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] p-0 overflow-hidden">
          <div className="px-6 pt-6 pb-3">
            <DialogTitle>Asset History</DialogTitle>
            <DialogDescription>
              History for "{historyAsset?.name}" ({historyAsset?.serialNumber})
            </DialogDescription>
          </div>
          <Separator />
          <ScrollArea className="max-h-[50vh] px-6 py-4">
            {historyEntries.length > 0 ? (
              <div className="space-y-3">
                {historyEntries.map(entry => {
                  const { label, variant } = actionLabel(entry.action);
                  return (
                    <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border">
                      <Badge variant={variant} className="mt-0.5 shrink-0">{label}</Badge>
                      <div className="flex-1 text-sm space-y-0.5">
                        {(entry.action === "assigned" || entry.action === "reassigned") && (
                          <p>
                            {entry.fromEmployeeName && <><span className="text-muted-foreground">{entry.fromEmployeeName}</span> → </>}
                            <span className="font-medium">{entry.toEmployeeName}</span>
                          </p>
                        )}
                        {entry.action === "unassigned" && (
                          <p>Unassigned from <span className="font-medium">{entry.fromEmployeeName}</span></p>
                        )}
                        {entry.note && <p className="text-muted-foreground text-xs">{entry.note}</p>}
                        <p className="text-xs text-muted-foreground">{new Date(entry.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No history recorded.</p>
            )}
          </ScrollArea>
          <div className="px-6 pb-4 flex justify-end">
            <Button variant="outline" onClick={() => setHistoryOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Asset</DialogTitle>
            <DialogDescription>Are you sure you want to delete this asset? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
