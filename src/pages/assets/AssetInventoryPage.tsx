import { useState, useRef } from "react";
import { ImageUpload } from "@/components/ImageUpload";
import { PageHeader } from "@/components/PageHeader";
import { useRole } from "@/contexts/RoleContext";
import { useActiveEmployees } from "@/hooks/useActiveEmployees";
import { useAssets, AssetHistoryEntry } from "@/contexts/AssetContext";
import { Asset, AssetStoreItem } from "@/types/hcm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Monitor, Laptop, Key, Edit2, Trash2, History, ArrowRightLeft, Search, Filter, Upload, Package } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import * as XLSX from "xlsx";

let assetIdCounter = 100;
let storeIdCounter = 200;

export default function AssetInventoryPage() {
  const { role, currentEmployeeId } = useRole();
  const activeEmps = useActiveEmployees();
  const {
    assets, addAsset, updateAsset, deleteAsset, reassignAsset, getAssetHistory,
    categories, storeItems, addStoreItem, bulkAddAssets,
  } = useAssets();
  const { toast } = useToast();

  const [newOpen, setNewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<Asset | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignItem, setReassignItem] = useState<Asset | null>(null);
  const [reassignTo, setReassignTo] = useState<string>("none");
  const [reassignReturnDate, setReassignReturnDate] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyAsset, setHistoryAsset] = useState<Asset | null>(null);
  const [historyEntries, setHistoryEntries] = useState<AssetHistoryEntry[]>([]);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newSerial, setNewSerial] = useState("");
  const [newAssignTo, setNewAssignTo] = useState("none");
  const [newPublish, setNewPublish] = useState("none");
  const [newImage, setNewImage] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newModel, setNewModel] = useState("");
  const [editName, setEditName] = useState("");
  const [editCategory2, setEditCategory2] = useState("");
  const [editSerial, setEditSerial] = useState("");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Bulk add state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkStoreItem, setBulkStoreItem] = useState("");
  const [bulkQuantity, setBulkQuantity] = useState(1);
  const [bulkSerialMode, setBulkSerialMode] = useState<"auto" | "manual">("auto");
  const [bulkPrefix, setBulkPrefix] = useState("");
  const [bulkStartNum, setBulkStartNum] = useState("001");
  const [bulkPreviewSerials, setBulkPreviewSerials] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allAssets = role === "employee" ? assets.filter(a => a.employeeId === currentEmployeeId) : assets;
  const displayAssets = allAssets.filter(a => {
    const q = search.toLowerCase();
    const matchesSearch = !q || a.name.toLowerCase().includes(q) || a.serialNumber.toLowerCase().includes(q) || (a.employeeName || "").toLowerCase().includes(q);
    const matchesCategory = filterCategory === "all" || a.category === filterCategory;
    const matchesStatus = filterStatus === "all" || a.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });
  const totalAssets = allAssets.length;
  const assignedAssets = allAssets.filter(a => a.status === "assigned").length;
  const availableAssets = allAssets.filter(a => a.status === "available").length;

  const activeCats = categories.filter(c => c.status === "active");
  const inventoryCategories = [...new Set(assets.map(a => a.category))];

  // Bulk helpers
  const filteredStoreItems = storeItems.filter(si => {
    if (!bulkCategory) return false;
    const cat = categories.find(c => c.id === bulkCategory);
    return cat && si.categoryName === cat.name && si.status === "active";
  });

  const generatePreview = () => {
    if (bulkSerialMode === "auto") {
      const start = parseInt(bulkStartNum) || 1;
      const padLen = bulkStartNum.length;
      const serials = Array.from({ length: bulkQuantity }, (_, i) =>
        `${bulkPrefix}${String(start + i).padStart(padLen, "0")}`
      );
      setBulkPreviewSerials(serials);
    }
  };

  const handleBulkFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);
      const serials = rows
        .map(r => r["Serial Number"] || r["serial_number"] || r["SerialNumber"] || r["serial number"] || Object.values(r)[0])
        .filter(Boolean)
        .map(String);
      if (serials.length === 0) {
        toast({ title: "No serials found", description: "Ensure the file has a 'Serial Number' column.", variant: "destructive" });
        return;
      }
      setBulkPreviewSerials(serials);
      setBulkQuantity(serials.length);
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const handleBulkSave = () => {
    if (bulkPreviewSerials.length === 0) {
      toast({ title: "No serials", description: "Generate or import serial numbers first.", variant: "destructive" });
      return;
    }
    const selectedItem = storeItems.find(si => si.id === bulkStoreItem);
    const catObj = categories.find(c => c.id === bulkCategory);
    if (!catObj) return;

    const newAssets: Asset[] = bulkPreviewSerials.map(serial => ({
      id: String(++assetIdCounter),
      name: selectedItem?.name || catObj.name,
      category: catObj.name,
      serialNumber: serial,
      employeeId: null,
      employeeName: null,
      assignedDate: null,
      status: "available" as const,
    }));

    bulkAddAssets(newAssets);
    setBulkOpen(false);
    setBulkCategory("");
    setBulkStoreItem("");
    setBulkQuantity(1);
    setBulkPrefix("");
    setBulkStartNum("001");
    setBulkPreviewSerials([]);
    setBulkSerialMode("auto");
    toast({ title: "Bulk Assets Created", description: `${newAssets.length} assets added to inventory.` });
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPublish === "publish" && (!newImage || !newDescription)) {
      toast({ title: "Missing Fields", description: "Image and description are required when publishing to store.", variant: "destructive" });
      return;
    }
    const assignEmp = newAssignTo !== "none" ? activeEmps.find(emp => emp.id === newAssignTo) : null;
    const catObj = categories.find(c => c.id === newCategory);
    const newAsset: Asset = {
      id: String(++assetIdCounter),
      name: newName,
      category: catObj?.name || newCategory,
      serialNumber: newSerial,
      employeeId: assignEmp?.id || null,
      employeeName: assignEmp ? `${assignEmp.firstName} ${assignEmp.lastName}` : null,
      assignedDate: assignEmp ? new Date().toISOString().split("T")[0] : null,
      status: assignEmp ? "assigned" : "available",
    };
    addAsset(newAsset);
    if (newPublish === "publish" && catObj) {
      const si: AssetStoreItem = {
        id: `si-${++storeIdCounter}`,
        name: newName,
        categoryId: catObj.id,
        categoryName: catObj.name,
        brand: newBrand,
        model: newModel,
        description: newDescription,
        image: newImage,
        status: "active",
        publishToStore: true,
        createdDate: new Date().toISOString().split("T")[0],
      };
      addStoreItem(si);
    }
    setNewOpen(false);
    setNewName(""); setNewCategory(""); setNewSerial(""); setNewAssignTo("none"); setNewPublish("none"); setNewImage(""); setNewDescription(""); setNewBrand(""); setNewModel("");
    toast({ title: "Asset Added", description: `"${newName}" has been added successfully.` });
  };

  const openEdit = (asset: Asset) => { setEditItem(asset); setEditName(asset.name); setEditCategory2(asset.category); setEditSerial(asset.serialNumber); setEditOpen(true); };
  const handleEdit = (e: React.FormEvent) => { e.preventDefault(); if (!editItem) return; updateAsset(editItem.id, { name: editName, category: editCategory2, serialNumber: editSerial }); setEditOpen(false); toast({ title: "Asset Updated", description: `"${editName}" has been updated.` }); };
  const handleDelete = () => { if (!deleteId) return; const asset = assets.find(a => a.id === deleteId); deleteAsset(deleteId); setDeleteConfirmOpen(false); setDeleteId(null); toast({ title: "Asset Deleted", description: `"${asset?.name}" has been removed.` }); };
  const openReassign = (asset: Asset) => { setReassignItem(asset); setReassignTo(asset.employeeId || "none"); setReassignReturnDate(asset.returnDate || ""); setReassignOpen(true); };
  const handleReassign = () => {
    if (!reassignItem) return;
    const emp = reassignTo !== "none" ? activeEmps.find(e => e.id === reassignTo) : null;
    reassignAsset(reassignItem.id, emp?.id || null, emp ? `${emp.firstName} ${emp.lastName}` : null);
    if (reassignReturnDate) {
      updateAsset(reassignItem.id, { returnDate: reassignReturnDate }, "Return date set");
    }
    setReassignOpen(false);
    toast({ title: emp ? "Asset Reassigned" : "Asset Unassigned", description: emp ? `"${reassignItem.name}" assigned to ${emp.firstName} ${emp.lastName}.` : `"${reassignItem.name}" is now unassigned.` });
  };
  const openHistory = (asset: Asset) => { setHistoryAsset(asset); setHistoryEntries(getAssetHistory(asset.id)); setHistoryOpen(true); };

  const actionLabel = (action: AssetHistoryEntry["action"]) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      assigned: { label: "Assigned", variant: "default" }, unassigned: { label: "Unassigned", variant: "secondary" }, reassigned: { label: "Reassigned", variant: "default" }, created: { label: "Created", variant: "outline" }, deleted: { label: "Deleted", variant: "destructive" }, edited: { label: "Edited", variant: "secondary" }, maintenance: { label: "Maintenance", variant: "secondary" },
    };
    return map[action] || { label: action, variant: "secondary" as const };
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={role === "employee" ? "My Assets" : "Asset Inventory"}
        description={role === "employee" ? "View your assigned assets." : "Manage company asset inventory."}
      >
        {role === "employer" && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
              <Package className="h-4 w-4 mr-2" />Bulk Add Assets
            </Button>
            <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />Add Asset
            </Button>
          </div>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Assets" value={totalAssets} icon={Monitor} variant="primary" />
        <StatCard title="Assigned" value={assignedAssets} icon={Laptop} variant="info" />
        <StatCard title="Available" value={availableAssets} icon={Key} variant="success" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, serial, employee..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[150px]"><Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" /><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {inventoryCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="retired">Retired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Asset</TableHead>
              <TableHead className="font-semibold">Category</TableHead>
              <TableHead className="font-semibold">Serial No.</TableHead>
              <TableHead className="font-semibold">Assigned To</TableHead>
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
                <TableCell>{asset.employeeName || "—"}</TableCell>
                <TableCell>{asset.assignedDate ? new Date(asset.assignedDate).toLocaleDateString() : "—"}</TableCell>
                <TableCell><StatusBadge status={asset.status} /></TableCell>
                {role === "employer" && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openHistory(asset)} title="View History"><History className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openReassign(asset)} title="Reassign"><ArrowRightLeft className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(asset)} title="Edit"><Edit2 className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeleteId(asset.id); setDeleteConfirmOpen(true); }} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={role === "employer" ? 7 : 6} className="text-center py-8 text-muted-foreground">No assets found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Asset Dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Asset</DialogTitle>
            <DialogDescription>Register a new company asset.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2"><Label>Asset Name</Label><Input placeholder='e.g. MacBook Pro 16"' required value={newName} onChange={e => setNewName(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select required value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{activeCats.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Brand</Label><Input placeholder="e.g. Apple" value={newBrand} onChange={e => setNewBrand(e.target.value)} /></div>
              <div className="space-y-2"><Label>Model</Label><Input placeholder="e.g. MacBook Pro 14" value={newModel} onChange={e => setNewModel(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Serial Number</Label><Input placeholder="e.g. MBP-2024-007" required value={newSerial} onChange={e => setNewSerial(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Assign To (Optional)</Label>
              <Select value={newAssignTo} onValueChange={setNewAssignTo}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {activeEmps.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="space-y-3">
              <Label className="text-base font-semibold">Add in Store</Label>
              <RadioGroup value={newPublish} onValueChange={setNewPublish} className="flex gap-4">
                <div className="flex items-center gap-2"><RadioGroupItem value="none" id="pub-none" /><Label htmlFor="pub-none" className="font-normal">None</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="publish" id="pub-store" /><Label htmlFor="pub-store" className="font-normal">Publish to Store</Label></div>
              </RadioGroup>
            </div>
            {newPublish === "publish" && (
              <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
                <ImageUpload value={newImage} onChange={setNewImage} label="Product Image" required />
                <div className="space-y-2"><Label>Description <span className="text-destructive">*</span></Label><Textarea placeholder="Describe this asset for the store catalog..." required value={newDescription} onChange={e => setNewDescription(e.target.value)} /></div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
              <Button type="submit">Add Asset</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Add Assets Dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Add Assets</DialogTitle>
            <DialogDescription>Create multiple asset records at once with auto-generated or imported serial numbers.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Asset Category</Label>
                <Select value={bulkCategory} onValueChange={v => { setBulkCategory(v); setBulkStoreItem(""); setBulkPreviewSerials([]); }}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{activeCats.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Asset Model</Label>
                <Select value={bulkStoreItem} onValueChange={setBulkStoreItem} disabled={!bulkCategory}>
                  <SelectTrigger><SelectValue placeholder={bulkCategory ? "Select model" : "Select category first"} /></SelectTrigger>
                  <SelectContent>
                    {filteredStoreItems.map(si => <SelectItem key={si.id} value={si.id}>{si.name} ({si.brand} {si.model})</SelectItem>)}
                    {filteredStoreItems.length === 0 && <SelectItem value="_none" disabled>No models in this category</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-base font-semibold">Serial Number Generation</Label>
              <RadioGroup value={bulkSerialMode} onValueChange={v => { setBulkSerialMode(v as "auto" | "manual"); setBulkPreviewSerials([]); }} className="flex gap-6">
                <div className="flex items-center gap-2"><RadioGroupItem value="auto" id="serial-auto" /><Label htmlFor="serial-auto" className="font-normal">Auto Generate</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="manual" id="serial-manual" /><Label htmlFor="serial-manual" className="font-normal">Manual Import</Label></div>
              </RadioGroup>
            </div>

            {bulkSerialMode === "auto" && (
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Serial Prefix</Label>
                    <Input placeholder="e.g. LAP" value={bulkPrefix} onChange={e => setBulkPrefix(e.target.value.toUpperCase())} />
                  </div>
                  <div className="space-y-2">
                    <Label>Starting Number</Label>
                    <Input placeholder="e.g. 001" value={bulkStartNum} onChange={e => setBulkStartNum(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input type="number" min={1} max={500} value={bulkQuantity} onChange={e => setBulkQuantity(Math.max(1, parseInt(e.target.value) || 1))} />
                  </div>
                </div>
                <Button type="button" variant="outline" onClick={generatePreview} disabled={!bulkPrefix || !bulkStartNum}>
                  Generate Preview
                </Button>
              </div>
            )}

            {bulkSerialMode === "manual" && (
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                <Label>Upload CSV or Excel File</Label>
                <p className="text-sm text-muted-foreground">File must contain a "Serial Number" column.</p>
                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleBulkFileUpload} className="hidden" />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />Choose File
                </Button>
              </div>
            )}

            {bulkPreviewSerials.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Preview ({bulkPreviewSerials.length} serials)</Label>
                  <Badge variant="secondary">{bulkPreviewSerials.length} assets</Badge>
                </div>
                <ScrollArea className="h-48 rounded-lg border bg-muted/20 p-3">
                  <div className="space-y-1">
                    {bulkPreviewSerials.map((serial, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm font-mono py-1 px-2 rounded hover:bg-muted/50">
                        <span className="text-muted-foreground w-8 text-right">{i + 1}.</span>
                        <span>{serial}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkSave} disabled={bulkPreviewSerials.length === 0 || !bulkCategory}>
              <Package className="h-4 w-4 mr-2" />Create {bulkPreviewSerials.length} Assets
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Asset Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
            <DialogDescription>Update asset details for "{editItem?.name}".</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2"><Label>Asset Name</Label><Input required value={editName} onChange={e => setEditName(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={editCategory2} onValueChange={setEditCategory2}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {activeCats.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  {!activeCats.find(c => c.name === editCategory2) && editCategory2 && <SelectItem value={editCategory2}>{editCategory2}</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Serial Number</Label><Input required value={editSerial} onChange={e => setEditSerial(e.target.value)} /></div>
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
              {reassignItem?.employeeName && <span className="block mt-1 text-sm">Currently assigned to: <strong>{reassignItem.employeeName}</strong></span>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select value={reassignTo} onValueChange={setReassignTo}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned (Available)</SelectItem>
                  {activeEmps.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Return Date (Optional)</Label>
              <Input type="date" value={reassignReturnDate} onChange={e => setReassignReturnDate(e.target.value)} />
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
            <DialogDescription>History for "{historyAsset?.name}" ({historyAsset?.serialNumber})</DialogDescription>
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
                          <p>{entry.fromEmployeeName && <><span className="text-muted-foreground">{entry.fromEmployeeName}</span> → </>}<span className="font-medium">{entry.toEmployeeName}</span></p>
                        )}
                        {entry.action === "unassigned" && <p>Unassigned from <span className="font-medium">{entry.fromEmployeeName}</span></p>}
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
          <div className="px-6 pb-4 flex justify-end"><Button variant="outline" onClick={() => setHistoryOpen(false)}>Close</Button></div>
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
            <Button variant="destructive" onClick={handleDelete}><Trash2 className="h-4 w-4 mr-2" />Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
