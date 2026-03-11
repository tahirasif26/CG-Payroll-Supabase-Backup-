import { useState, useRef } from "react";
import { ImageUpload } from "@/components/ImageUpload";
import { PageHeader } from "@/components/PageHeader";
import { useRole } from "@/contexts/RoleContext";
import { useActiveEmployees } from "@/hooks/useActiveEmployees";
import { useAssets, AssetHistoryEntry } from "@/contexts/AssetContext";
import { Asset, AssetStoreItem } from "@/types/hcm";
import { MaintenanceRecord } from "@/types/asset";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Monitor, Laptop, Key, Edit2, Trash2, History, ArrowRightLeft, Search, Filter, Upload, Package, Wrench, QrCode, Download, Eye } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import * as XLSX from "xlsx";

let assetIdCounter = 100;
let storeIdCounter = 200;
let mntIdCounter = 200;

const conditionOptions = [
  { value: "new", label: "New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "needs-repair", label: "Needs Repair" },
  { value: "damaged", label: "Damaged" },
  { value: "retired", label: "Retired" },
];

const maintenanceTypes = [
  { value: "repair", label: "Repair" },
  { value: "service", label: "Service" },
  { value: "inspection", label: "Inspection" },
  { value: "upgrade", label: "Upgrade" },
  { value: "replacement", label: "Replacement" },
];

function generateAssetTag() {
  return `AST-${String(++assetIdCounter).padStart(3, "0")}`;
}

export default function AssetInventoryPage() {
  const { role, currentEmployeeId } = useRole();
  const activeEmps = useActiveEmployees();
  const {
    assets, addAsset, updateAsset, deleteAsset, reassignAsset, getAssetHistory,
    categories, storeItems, addStoreItem, bulkAddAssets,
    maintenanceRecords, addMaintenanceRecord, getMaintenanceForAsset,
  } = useAssets();
  const { toast } = useToast();

  // Dialog states
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
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);

  // New asset fields
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newSerial, setNewSerial] = useState("");
  const [newAssignTo, setNewAssignTo] = useState("none");
  const [newPublish, setNewPublish] = useState("none");
  const [newImage, setNewImage] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newCondition, setNewCondition] = useState("new");
  const [newLocation, setNewLocation] = useState("");
  const [newPurchaseDate, setNewPurchaseDate] = useState("");
  const [newWarrantyExpiry, setNewWarrantyExpiry] = useState("");
  const [newServiceDue, setNewServiceDue] = useState("");

  // Edit fields
  const [editName, setEditName] = useState("");
  const [editCategory2, setEditCategory2] = useState("");
  const [editSerial, setEditSerial] = useState("");
  const [editBrand, setEditBrand] = useState("");
  const [editModel2, setEditModel2] = useState("");
  const [editCondition, setEditCondition] = useState("good");
  const [editLocation, setEditLocation] = useState("");
  const [editPurchaseDate, setEditPurchaseDate] = useState("");
  const [editWarrantyExpiry, setEditWarrantyExpiry] = useState("");
  const [editServiceDue, setEditServiceDue] = useState("");

  // Search/filter
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Bulk add state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkName, setBulkName] = useState("");
  const [bulkBrand, setBulkBrand] = useState("");
  const [bulkModel2, setBulkModel2] = useState("");
  const [bulkQuantity, setBulkQuantity] = useState(1);
  const [bulkSerialMode, setBulkSerialMode] = useState<"auto" | "manual">("auto");
  const [bulkPrefix, setBulkPrefix] = useState("");
  const [bulkStartNum, setBulkStartNum] = useState("001");
  const [bulkPreviewSerials, setBulkPreviewSerials] = useState<string[]>([]);
  const [bulkPublish, setBulkPublish] = useState("none");
  const [bulkImage, setBulkImage] = useState("");
  const [bulkDescription, setBulkDescription] = useState("");
  const [bulkCondition, setBulkCondition] = useState("new");
  const [bulkLocation, setBulkLocation] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Maintenance dialog
  const [mntOpen, setMntOpen] = useState(false);
  const [mntAsset, setMntAsset] = useState<Asset | null>(null);
  const [mntType, setMntType] = useState("repair");
  const [mntDate, setMntDate] = useState(new Date().toISOString().split("T")[0]);
  const [mntNotes, setMntNotes] = useState("");
  const [mntNextService, setMntNextService] = useState("");

  const allAssets = role === "employee" ? assets.filter(a => a.employeeId === currentEmployeeId) : assets;
  const displayAssets = allAssets.filter(a => {
    const q = search.toLowerCase();
    const matchesSearch = !q || a.name.toLowerCase().includes(q) || a.serialNumber.toLowerCase().includes(q) || (a.employeeName || "").toLowerCase().includes(q) || a.assetTag.toLowerCase().includes(q);
    const matchesCategory = filterCategory === "all" || a.category === filterCategory;
    const matchesStatus = filterStatus === "all" || a.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });
  const totalAssets = allAssets.length;
  const assignedAssets = allAssets.filter(a => a.status === "assigned").length;
  const availableAssets = allAssets.filter(a => a.status === "available").length;
  const maintenanceAssets = allAssets.filter(a => a.status === "maintenance").length;

  const activeCats = categories.filter(c => c.status === "active");
  const inventoryCategories = [...new Set(assets.map(a => a.category))];

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
    if (!bulkName.trim()) {
      toast({ title: "Missing name", description: "Please enter an asset name.", variant: "destructive" });
      return;
    }
    if (bulkPublish === "publish" && (!bulkImage || !bulkDescription)) {
      toast({ title: "Missing Fields", description: "Image and description are required when publishing to store.", variant: "destructive" });
      return;
    }
    const catObj = categories.find(c => c.id === bulkCategory);
    if (!catObj) return;

    const newAssets: Asset[] = bulkPreviewSerials.map(serial => {
      const tag = generateAssetTag();
      return {
        id: String(assetIdCounter),
        assetTag: tag,
        name: bulkName,
        category: catObj.name,
        brand: bulkBrand,
        model: bulkModel2,
        serialNumber: serial,
        condition: bulkCondition as Asset["condition"],
        location: bulkLocation,
        employeeId: null,
        employeeName: null,
        assignedDate: null,
        status: "available" as const,
      };
    });

    bulkAddAssets(newAssets);

    if (bulkPublish === "publish") {
      const si: AssetStoreItem = {
        id: `si-${++storeIdCounter}`,
        name: bulkName,
        categoryId: catObj.id,
        categoryName: catObj.name,
        brand: bulkBrand,
        model: bulkModel2,
        description: bulkDescription,
        image: bulkImage,
        status: "active",
        publishToStore: true,
        createdDate: new Date().toISOString().split("T")[0],
      };
      addStoreItem(si);
    }

    setBulkOpen(false);
    setBulkCategory(""); setBulkName(""); setBulkBrand(""); setBulkModel2("");
    setBulkQuantity(1); setBulkPrefix(""); setBulkStartNum("001");
    setBulkPreviewSerials([]); setBulkSerialMode("auto");
    setBulkPublish("none"); setBulkImage(""); setBulkDescription("");
    setBulkCondition("new"); setBulkLocation("");
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
    const tag = generateAssetTag();
    const newAsset: Asset = {
      id: String(assetIdCounter),
      assetTag: tag,
      name: newName,
      category: catObj?.name || newCategory,
      brand: newBrand,
      model: newModel,
      serialNumber: newSerial,
      condition: newCondition as Asset["condition"],
      location: newLocation,
      employeeId: assignEmp?.id || null,
      employeeName: assignEmp ? `${assignEmp.firstName} ${assignEmp.lastName}` : null,
      assignedDate: assignEmp ? new Date().toISOString().split("T")[0] : null,
      status: assignEmp ? "assigned" : "available",
      purchaseDate: newPurchaseDate || undefined,
      warrantyExpiry: newWarrantyExpiry || undefined,
      serviceDueDate: newServiceDue || undefined,
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
    setNewCondition("new"); setNewLocation(""); setNewPurchaseDate(""); setNewWarrantyExpiry(""); setNewServiceDue("");
    toast({ title: "Asset Added", description: `"${newName}" (${tag}) has been added.` });
  };

  const openEdit = (asset: Asset) => {
    setEditItem(asset); setEditName(asset.name); setEditCategory2(asset.category); setEditSerial(asset.serialNumber);
    setEditBrand(asset.brand || ""); setEditModel2(asset.model || ""); setEditCondition(asset.condition);
    setEditLocation(asset.location || ""); setEditPurchaseDate(asset.purchaseDate || "");
    setEditWarrantyExpiry(asset.warrantyExpiry || ""); setEditServiceDue(asset.serviceDueDate || "");
    setEditOpen(true);
  };
  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    updateAsset(editItem.id, {
      name: editName, category: editCategory2, serialNumber: editSerial,
      brand: editBrand, model: editModel2, condition: editCondition as Asset["condition"],
      location: editLocation, purchaseDate: editPurchaseDate || undefined,
      warrantyExpiry: editWarrantyExpiry || undefined, serviceDueDate: editServiceDue || undefined,
    });
    setEditOpen(false);
    toast({ title: "Asset Updated", description: `"${editName}" has been updated.` });
  };

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
  const openDetail = (asset: Asset) => { setDetailAsset(asset); setDetailOpen(true); };

  // Maintenance
  const openMaintenance = (asset: Asset) => {
    setMntAsset(asset); setMntType("repair"); setMntDate(new Date().toISOString().split("T")[0]);
    setMntNotes(""); setMntNextService("");
    setMntOpen(true);
  };
  const handleMntSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mntAsset) return;
    const record: MaintenanceRecord = {
      id: `mnt-${++mntIdCounter}`,
      assetId: mntAsset.id,
      type: mntType as MaintenanceRecord["type"],
      date: mntDate,
      vendor: mntVendor,
      cost: Number(mntCost) || 0,
      notes: mntNotes,
      nextServiceDate: mntNextService || undefined,
      performedBy: "Admin",
    };
    addMaintenanceRecord(record);
    setMntOpen(false);
    toast({ title: "Maintenance Recorded", description: `${mntType} record added for "${mntAsset.name}".` });
  };

  const actionLabel = (action: AssetHistoryEntry["action"]) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      assigned: { label: "Assigned", variant: "default" }, unassigned: { label: "Unassigned", variant: "secondary" }, reassigned: { label: "Reassigned", variant: "default" }, created: { label: "Created", variant: "outline" }, deleted: { label: "Deleted", variant: "destructive" }, edited: { label: "Edited", variant: "secondary" }, maintenance: { label: "Maintenance", variant: "secondary" }, retired: { label: "Retired", variant: "destructive" }, "condition-updated": { label: "Condition", variant: "secondary" }, "audit-verified": { label: "Audit", variant: "outline" },
    };
    return map[action] || { label: action, variant: "secondary" as const };
  };

  const conditionBadgeVariant = (c: string) => {
    if (c === "new" || c === "good") return "default";
    if (c === "fair") return "secondary";
    return "destructive";
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

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard title="Total Assets" value={totalAssets} icon={Monitor} variant="primary" />
        <StatCard title="Assigned" value={assignedAssets} icon={Laptop} variant="info" />
        <StatCard title="Available" value={availableAssets} icon={Key} variant="success" />
        <StatCard title="Maintenance" value={maintenanceAssets} icon={Wrench} variant="warning" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, serial, tag, employee..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
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
              <TableHead className="font-semibold">Asset Tag</TableHead>
              <TableHead className="font-semibold">Asset</TableHead>
              <TableHead className="font-semibold">Category</TableHead>
              <TableHead className="font-semibold">Serial No.</TableHead>
              <TableHead className="font-semibold">Condition</TableHead>
              <TableHead className="font-semibold">Location</TableHead>
              <TableHead className="font-semibold">Assigned To</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              {role === "employer" && <TableHead className="font-semibold text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayAssets.length > 0 ? displayAssets.map(asset => (
              <TableRow key={asset.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => openDetail(asset)}>
                <TableCell className="font-mono text-xs">{asset.assetTag}</TableCell>
                <TableCell className="font-medium">{asset.name}</TableCell>
                <TableCell>{asset.category}</TableCell>
                <TableCell className="font-mono text-sm">{asset.serialNumber}</TableCell>
                <TableCell><Badge variant={conditionBadgeVariant(asset.condition)} className="text-[10px]">{asset.condition.replace("-", " ")}</Badge></TableCell>
                <TableCell className="text-sm">{asset.location || "—"}</TableCell>
                <TableCell>{asset.employeeName || "—"}</TableCell>
                <TableCell><StatusBadge status={asset.status} /></TableCell>
                {role === "employer" && (
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end gap-0.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openMaintenance(asset)} title="Add Maintenance"><Wrench className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openHistory(asset)} title="History"><History className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openReassign(asset)} title="Reassign"><ArrowRightLeft className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(asset)} title="Edit"><Edit2 className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setDeleteId(asset.id); setDeleteConfirmOpen(true); }} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={role === "employer" ? 9 : 8} className="text-center py-8 text-muted-foreground">No assets found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Asset Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailAsset?.name}</DialogTitle>
            <DialogDescription>Asset Tag: {detailAsset?.assetTag} | Serial: {detailAsset?.serialNumber}</DialogDescription>
          </DialogHeader>
          {detailAsset && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="maintenance">Maintenance History</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><p className="text-xs text-muted-foreground">Category</p><p className="font-medium text-sm">{detailAsset.category}</p></div>
                  <div className="space-y-1"><p className="text-xs text-muted-foreground">Brand / Model</p><p className="font-medium text-sm">{detailAsset.brand || "—"} {detailAsset.model || ""}</p></div>
                  <div className="space-y-1"><p className="text-xs text-muted-foreground">Condition</p><Badge variant={conditionBadgeVariant(detailAsset.condition)}>{detailAsset.condition.replace("-", " ")}</Badge></div>
                  <div className="space-y-1"><p className="text-xs text-muted-foreground">Location</p><p className="font-medium text-sm">{detailAsset.location || "—"}</p></div>
                  <div className="space-y-1"><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={detailAsset.status} /></div>
                  <div className="space-y-1"><p className="text-xs text-muted-foreground">Assigned To</p><p className="font-medium text-sm">{detailAsset.employeeName || "Unassigned"}</p></div>
                  <div className="space-y-1"><p className="text-xs text-muted-foreground">Purchase Date</p><p className="font-medium text-sm">{detailAsset.purchaseDate ? new Date(detailAsset.purchaseDate).toLocaleDateString() : "—"}</p></div>
                  <div className="space-y-1"><p className="text-xs text-muted-foreground">Warranty Expiry</p><p className="font-medium text-sm">{detailAsset.warrantyExpiry ? new Date(detailAsset.warrantyExpiry).toLocaleDateString() : "—"}</p></div>
                  <div className="space-y-1"><p className="text-xs text-muted-foreground">Service Due Date</p><p className="font-medium text-sm">{detailAsset.serviceDueDate ? new Date(detailAsset.serviceDueDate).toLocaleDateString() : "—"}</p></div>
                  <div className="space-y-1"><p className="text-xs text-muted-foreground">Return Date</p><p className="font-medium text-sm">{detailAsset.returnDate ? new Date(detailAsset.returnDate).toLocaleDateString() : "—"}</p></div>
                </div>
              </TabsContent>
              <TabsContent value="maintenance" className="space-y-4 mt-4">
                {role === "employer" && (
                  <Button size="sm" variant="outline" onClick={() => openMaintenance(detailAsset)}>
                    <Plus className="h-4 w-4 mr-2" />Add Maintenance Record
                  </Button>
                )}
                {getMaintenanceForAsset(detailAsset.id).length > 0 ? (
                  <div className="space-y-3">
                    {getMaintenanceForAsset(detailAsset.id).map(rec => (
                      <Card key={rec.id} className="border">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="secondary" className="capitalize">{rec.type}</Badge>
                            <span className="text-xs text-muted-foreground">{new Date(rec.date).toLocaleDateString()}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div><span className="text-muted-foreground">Vendor:</span> {rec.vendor}</div>
                            <div><span className="text-muted-foreground">Cost:</span> {rec.cost.toLocaleString()}</div>
                            <div className="col-span-2"><span className="text-muted-foreground">Notes:</span> {rec.notes}</div>
                            {rec.nextServiceDate && <div className="col-span-2"><span className="text-muted-foreground">Next Service:</span> {new Date(rec.nextServiceDate).toLocaleDateString()}</div>}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-6">No maintenance records.</p>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Condition</Label>
                <Select value={newCondition} onValueChange={setNewCondition}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{conditionOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Location</Label><Input placeholder="e.g. Riyadh HQ" value={newLocation} onChange={e => setNewLocation(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label>Purchase Date</Label><Input type="date" value={newPurchaseDate} onChange={e => setNewPurchaseDate(e.target.value)} /></div>
              <div className="space-y-2"><Label>Warranty Expiry</Label><Input type="date" value={newWarrantyExpiry} onChange={e => setNewWarrantyExpiry(e.target.value)} /></div>
              <div className="space-y-2"><Label>Service Due</Label><Input type="date" value={newServiceDue} onChange={e => setNewServiceDue(e.target.value)} /></div>
            </div>
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
            <div className="space-y-2">
              <Label>Asset Category</Label>
              <Select value={bulkCategory} onValueChange={v => { setBulkCategory(v); setBulkPreviewSerials([]); }}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{activeCats.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Asset Name</Label><Input placeholder='e.g. MacBook Pro 14"' required value={bulkName} onChange={e => setBulkName(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Brand</Label><Input placeholder="e.g. Apple" value={bulkBrand} onChange={e => setBulkBrand(e.target.value)} /></div>
              <div className="space-y-2"><Label>Model</Label><Input placeholder="e.g. M3 Pro" value={bulkModel2} onChange={e => setBulkModel2(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Condition</Label>
                <Select value={bulkCondition} onValueChange={setBulkCondition}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{conditionOptions.filter(o => o.value !== "retired").map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Location</Label><Input placeholder="e.g. Riyadh HQ" value={bulkLocation} onChange={e => setBulkLocation(e.target.value)} /></div>
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
                  <div className="space-y-2"><Label>Serial Prefix</Label><Input placeholder="e.g. LAP" value={bulkPrefix} onChange={e => setBulkPrefix(e.target.value.toUpperCase())} /></div>
                  <div className="space-y-2"><Label>Starting Number</Label><Input placeholder="e.g. 001" value={bulkStartNum} onChange={e => setBulkStartNum(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Quantity</Label><Input type="number" min={1} max={500} value={bulkQuantity} onChange={e => setBulkQuantity(Math.max(1, parseInt(e.target.value) || 1))} /></div>
                </div>
                <Button type="button" variant="outline" onClick={generatePreview} disabled={!bulkPrefix || !bulkStartNum}>Generate Preview</Button>
              </div>
            )}
            {bulkSerialMode === "manual" && (
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                <Label>Upload CSV or Excel File</Label>
                <p className="text-sm text-muted-foreground">File must contain a "Serial Number" column.</p>
                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleBulkFileUpload} className="hidden" />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}><Upload className="h-4 w-4 mr-2" />Choose File</Button>
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
            <Separator />
            <div className="space-y-3">
              <Label className="text-base font-semibold">Publish to Store</Label>
              <RadioGroup value={bulkPublish} onValueChange={setBulkPublish} className="flex gap-4">
                <div className="flex items-center gap-2"><RadioGroupItem value="none" id="bulk-pub-none" /><Label htmlFor="bulk-pub-none" className="font-normal">None</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="publish" id="bulk-pub-store" /><Label htmlFor="bulk-pub-store" className="font-normal">Publish to Store</Label></div>
              </RadioGroup>
            </div>
            {bulkPublish === "publish" && (
              <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
                <ImageUpload value={bulkImage} onChange={setBulkImage} label="Product Image" required />
                <div className="space-y-2"><Label>Description <span className="text-destructive">*</span></Label><Textarea placeholder="Describe this asset for the store catalog..." required value={bulkDescription} onChange={e => setBulkDescription(e.target.value)} /></div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkSave} disabled={bulkPreviewSerials.length === 0 || !bulkCategory || !bulkName.trim()}>
              <Package className="h-4 w-4 mr-2" />Create {bulkPreviewSerials.length} Assets
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Asset Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Brand</Label><Input value={editBrand} onChange={e => setEditBrand(e.target.value)} /></div>
              <div className="space-y-2"><Label>Model</Label><Input value={editModel2} onChange={e => setEditModel2(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Serial Number</Label><Input required value={editSerial} onChange={e => setEditSerial(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Condition</Label>
                <Select value={editCondition} onValueChange={setEditCondition}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{conditionOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Location</Label><Input value={editLocation} onChange={e => setEditLocation(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label>Purchase Date</Label><Input type="date" value={editPurchaseDate} onChange={e => setEditPurchaseDate(e.target.value)} /></div>
              <div className="space-y-2"><Label>Warranty Expiry</Label><Input type="date" value={editWarrantyExpiry} onChange={e => setEditWarrantyExpiry(e.target.value)} /></div>
              <div className="space-y-2"><Label>Service Due</Label><Input type="date" value={editServiceDue} onChange={e => setEditServiceDue(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Maintenance Dialog */}
      <Dialog open={mntOpen} onOpenChange={setMntOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Maintenance Record</DialogTitle>
            <DialogDescription>Record maintenance for "{mntAsset?.name}" ({mntAsset?.assetTag})</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMntSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Maintenance Type</Label>
              <Select value={mntType} onValueChange={setMntType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{maintenanceTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Date</Label><Input type="date" required value={mntDate} onChange={e => setMntDate(e.target.value)} /></div>
              <div className="space-y-2"><Label>Cost</Label><Input type="number" placeholder="0" value={mntCost} onChange={e => setMntCost(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Vendor</Label><Input required placeholder="e.g. Dell Service Center" value={mntVendor} onChange={e => setMntVendor(e.target.value)} /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea placeholder="Details about maintenance..." value={mntNotes} onChange={e => setMntNotes(e.target.value)} /></div>
            <div className="space-y-2"><Label>Next Service Date</Label><Input type="date" value={mntNextService} onChange={e => setMntNextService(e.target.value)} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMntOpen(false)}>Cancel</Button>
              <Button type="submit">Save Record</Button>
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
