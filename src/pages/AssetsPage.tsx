import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useRole } from "@/contexts/RoleContext";
import { useActiveEmployees } from "@/hooks/useActiveEmployees";
import { useAssets, AssetHistoryEntry } from "@/contexts/AssetContext";
import { Asset, AssetCategory, AssetStoreItem, AssetRequest } from "@/types/hcm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Monitor, Laptop, Key, Edit2, Trash2, History, ArrowRightLeft, Search, Filter, ShoppingBag, FolderOpen, ClipboardList, Package, CheckCircle, XCircle, ImageIcon } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

let assetIdCounter = 100;
let catIdCounter = 100;
let storeIdCounter = 100;
let reqIdCounter = 100;

export default function AssetsPage() {
  const { role, currentEmployeeId } = useRole();
  const activeEmps = useActiveEmployees();
  const {
    assets, addAsset, updateAsset, deleteAsset, reassignAsset, getAssetHistory,
    categories, addCategory, updateCategory, deleteCategory, canDeleteCategory,
    storeItems, addStoreItem, updateStoreItem, deleteStoreItem, canDeleteStoreItem, getStoreItemsForDisplay,
    assetRequests, addAssetRequest, approveRequest, rejectRequest, getEmployeeRequests,
  } = useAssets();
  const { toast } = useToast();

  // ===== INVENTORY STATE =====
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

  // ===== CATEGORY STATE =====
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catEditItem, setCatEditItem] = useState<AssetCategory | null>(null);
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [catStatus, setCatStatus] = useState<"active" | "inactive">("active");

  // ===== STORE STATE =====
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [storeEditItem, setStoreEditItem] = useState<AssetStoreItem | null>(null);
  const [siName, setSiName] = useState("");
  const [siCategoryId, setSiCategoryId] = useState("");
  const [siBrand, setSiBrand] = useState("");
  const [siModel, setSiModel] = useState("");
  const [siDesc, setSiDesc] = useState("");
  const [siImage, setSiImage] = useState("");
  const [siStatus, setSiStatus] = useState<"active" | "inactive">("active");
  const [siSku, setSiSku] = useState("");
  const [siCost, setSiCost] = useState("");
  const [siWarranty, setSiWarranty] = useState("");
  const [siSpecs, setSiSpecs] = useState("");
  const [storeSearch, setStoreSearch] = useState("");
  const [storeCatFilter, setStoreCatFilter] = useState("all");
  const [storeBrandFilter, setStoreBrandFilter] = useState("all");

  // ===== REQUEST STATE =====
  const [reqDialogOpen, setReqDialogOpen] = useState(false);
  const [reqStoreItem, setReqStoreItem] = useState<AssetStoreItem | null>(null);
  const [reqReason, setReqReason] = useState("");
  const [reqPriority, setReqPriority] = useState<"low" | "medium" | "high">("medium");

  // ===== INVENTORY LOGIC =====
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
  const openReassign = (asset: Asset) => { setReassignItem(asset); setReassignTo(asset.employeeId || "none"); setReassignOpen(true); };
  const handleReassign = () => { if (!reassignItem) return; const emp = reassignTo !== "none" ? activeEmps.find(e => e.id === reassignTo) : null; reassignAsset(reassignItem.id, emp?.id || null, emp ? `${emp.firstName} ${emp.lastName}` : null); setReassignOpen(false); toast({ title: emp ? "Asset Reassigned" : "Asset Unassigned", description: emp ? `"${reassignItem.name}" assigned to ${emp.firstName} ${emp.lastName}.` : `"${reassignItem.name}" is now unassigned.` }); };
  const openHistory = (asset: Asset) => { setHistoryAsset(asset); setHistoryEntries(getAssetHistory(asset.id)); setHistoryOpen(true); };

  const actionLabel = (action: AssetHistoryEntry["action"]) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      assigned: { label: "Assigned", variant: "default" }, unassigned: { label: "Unassigned", variant: "secondary" }, reassigned: { label: "Reassigned", variant: "default" }, created: { label: "Created", variant: "outline" }, deleted: { label: "Deleted", variant: "destructive" }, edited: { label: "Edited", variant: "secondary" }, maintenance: { label: "Maintenance", variant: "secondary" },
    };
    return map[action] || { label: action, variant: "secondary" as const };
  };

  // ===== CATEGORY LOGIC =====
  const openCatDialog = (cat?: AssetCategory) => {
    if (cat) { setCatEditItem(cat); setCatName(cat.name); setCatDesc(cat.description); setCatStatus(cat.status); }
    else { setCatEditItem(null); setCatName(""); setCatDesc(""); setCatStatus("active"); }
    setCatDialogOpen(true);
  };
  const handleCatSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (catEditItem) {
      updateCategory(catEditItem.id, { name: catName, description: catDesc, status: catStatus });
      toast({ title: "Category Updated", description: `"${catName}" updated.` });
    } else {
      addCategory({ id: `cat-${++catIdCounter}`, name: catName, description: catDesc, status: catStatus, createdDate: new Date().toISOString().split("T")[0] });
      toast({ title: "Category Created", description: `"${catName}" created.` });
    }
    setCatDialogOpen(false);
  };
  const handleCatDelete = (id: string) => {
    if (!canDeleteCategory(id)) { toast({ title: "Cannot Delete", description: "This category has assets linked to it.", variant: "destructive" }); return; }
    const cat = categories.find(c => c.id === id);
    deleteCategory(id);
    toast({ title: "Category Deleted", description: `"${cat?.name}" deleted.` });
  };

  // ===== STORE LOGIC =====
  const openStoreDialog = (item?: AssetStoreItem) => {
    if (item) { setStoreEditItem(item); setSiName(item.name); setSiCategoryId(item.categoryId); setSiBrand(item.brand); setSiModel(item.model); setSiDesc(item.description); setSiImage(item.image); setSiStatus(item.status); setSiSku(item.sku || ""); setSiCost(item.estimatedCost?.toString() || ""); setSiWarranty(item.warrantyPeriod || ""); setSiSpecs(item.specifications || ""); }
    else { setStoreEditItem(null); setSiName(""); setSiCategoryId(""); setSiBrand(""); setSiModel(""); setSiDesc(""); setSiImage(""); setSiStatus("active"); setSiSku(""); setSiCost(""); setSiWarranty(""); setSiSpecs(""); }
    setStoreDialogOpen(true);
  };
  const handleStoreSave = (e: React.FormEvent) => {
    e.preventDefault();
    const catObj = categories.find(c => c.id === siCategoryId);
    if (!catObj) return;
    const data: Partial<AssetStoreItem> = { name: siName, categoryId: siCategoryId, categoryName: catObj.name, brand: siBrand, model: siModel, description: siDesc, image: siImage, status: siStatus, sku: siSku || undefined, estimatedCost: siCost ? Number(siCost) : undefined, warrantyPeriod: siWarranty || undefined, specifications: siSpecs || undefined, publishToStore: true };
    if (storeEditItem) {
      updateStoreItem(storeEditItem.id, data);
      toast({ title: "Store Item Updated" });
    } else {
      addStoreItem({ ...data, id: `si-${++storeIdCounter}`, createdDate: new Date().toISOString().split("T")[0], publishToStore: true } as AssetStoreItem);
      toast({ title: "Store Item Added" });
    }
    setStoreDialogOpen(false);
  };
  const handleStoreDelete = (id: string) => {
    if (!canDeleteStoreItem(id)) { toast({ title: "Cannot Delete", description: "This item has active requests.", variant: "destructive" }); return; }
    deleteStoreItem(id);
    toast({ title: "Store Item Deleted" });
  };

  const activeCats = categories.filter(c => c.status === "active");
  const uniqueBrands = [...new Set(storeItems.map(si => si.brand).filter(Boolean))];
  const displayStoreItems = (role === "employee" ? getStoreItemsForDisplay() : storeItems).filter(si => {
    const q = storeSearch.toLowerCase();
    const matchSearch = !q || si.name.toLowerCase().includes(q) || si.brand.toLowerCase().includes(q) || si.model.toLowerCase().includes(q);
    const matchCat = storeCatFilter === "all" || si.categoryId === storeCatFilter;
    const matchBrand = storeBrandFilter === "all" || si.brand === storeBrandFilter;
    return matchSearch && matchCat && matchBrand;
  });

  // ===== REQUEST LOGIC =====
  const openRequestDialog = (item: AssetStoreItem) => { setReqStoreItem(item); setReqReason(""); setReqPriority("medium"); setReqDialogOpen(true); };
  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqStoreItem) return;
    const emp = activeEmps.find(e => e.id === currentEmployeeId);
    addAssetRequest({
      id: `req-${++reqIdCounter}`,
      employeeId: currentEmployeeId,
      employeeName: emp ? `${emp.firstName} ${emp.lastName}` : "Current User",
      storeItemId: reqStoreItem.id,
      storeItemName: reqStoreItem.name,
      category: reqStoreItem.categoryName,
      requestDate: new Date().toISOString().split("T")[0],
      reason: reqReason,
      priority: reqPriority,
      status: "pending",
    });
    setReqDialogOpen(false);
    toast({ title: "Request Submitted", description: `Your request for "${reqStoreItem.name}" has been submitted.` });
  };

  const displayRequests = role === "employee" ? getEmployeeRequests(currentEmployeeId) : assetRequests;

  const inventoryCategories = [...new Set(assets.map(a => a.category))];

  return (
    <div className="space-y-6">
      <PageHeader
        title={role === "employee" ? "Assets" : "Asset Management"}
        description={role === "employee" ? "Browse company assets and manage your requests." : "Manage categories, asset catalog, inventory, and requests."}
      />

      <Tabs defaultValue={role === "employee" ? "store" : "inventory"} className="space-y-4">
        <TabsList>
          {role === "employer" && <TabsTrigger value="inventory"><Package className="h-4 w-4 mr-1.5" />Inventory</TabsTrigger>}
          {role === "employer" && <TabsTrigger value="categories"><FolderOpen className="h-4 w-4 mr-1.5" />Categories</TabsTrigger>}
          <TabsTrigger value="store"><ShoppingBag className="h-4 w-4 mr-1.5" />Asset Store</TabsTrigger>
          <TabsTrigger value="requests"><ClipboardList className="h-4 w-4 mr-1.5" />Requests</TabsTrigger>
        </TabsList>

        {/* ========== TAB: INVENTORY ========== */}
        {role === "employer" && (
          <TabsContent value="inventory" className="space-y-4">
            <div className="flex items-center justify-between">
              <div />
              <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={() => setNewOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />Add Asset
              </Button>
            </div>
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
                    <TableHead className="font-semibold text-right">Actions</TableHead>
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
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openHistory(asset)} title="View History"><History className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openReassign(asset)} title="Reassign"><ArrowRightLeft className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(asset)} title="Edit"><Edit2 className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeleteId(asset.id); setDeleteConfirmOpen(true); }} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No assets found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        )}

        {/* ========== TAB: CATEGORIES ========== */}
        {role === "employer" && (
          <TabsContent value="categories" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Define categories used to classify assets.</p>
              <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={() => openCatDialog()}>
                <Plus className="h-4 w-4 mr-2" />Add Category
              </Button>
            </div>
            <div className="bg-card rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Category Name</TableHead>
                    <TableHead className="font-semibold">Description</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Created Date</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map(cat => (
                    <TableRow key={cat.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell className="text-muted-foreground">{cat.description || "—"}</TableCell>
                      <TableCell><Badge variant={cat.status === "active" ? "default" : "secondary"}>{cat.status === "active" ? "Active" : "Inactive"}</Badge></TableCell>
                      <TableCell>{new Date(cat.createdDate).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openCatDialog(cat)}><Edit2 className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleCatDelete(cat.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        )}

        {/* ========== TAB: ASSET STORE ========== */}
        <TabsContent value="store" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Asset Store</h2>
              <p className="text-sm text-muted-foreground">Browse and request company assets.</p>
            </div>
            {role === "employer" && (
              <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={() => openStoreDialog()}>
                <Plus className="h-4 w-4 mr-2" />Add to Store
              </Button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search assets..." value={storeSearch} onChange={e => setStoreSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={storeCatFilter} onValueChange={setStoreCatFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {activeCats.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={storeBrandFilter} onValueChange={setStoreBrandFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Brand" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {uniqueBrands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Employee: Card Grid */}
          {role === "employee" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayStoreItems.length > 0 ? displayStoreItems.map(item => (
                <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <div className="aspect-[4/3] bg-muted flex items-center justify-center">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
                    )}
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-semibold text-base leading-tight">{item.name}</h3>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>Category: {item.categoryName}</p>
                      <p>Brand: {item.brand}</p>
                      <p>Model: {item.model}</p>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                    <Button size="sm" className="w-full mt-2" onClick={() => openRequestDialog(item)}>
                      <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />Request
                    </Button>
                  </CardContent>
                </Card>
              )) : (
                <div className="col-span-full text-center py-12 text-muted-foreground">No assets available in the store.</div>
              )}
            </div>
          ) : (
            /* Admin: Table */
            <div className="bg-card rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Asset Name</TableHead>
                    <TableHead className="font-semibold">Category</TableHead>
                    <TableHead className="font-semibold">Brand</TableHead>
                    <TableHead className="font-semibold">Model</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Created</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayStoreItems.length > 0 ? displayStoreItems.map(item => (
                    <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.categoryName}</TableCell>
                      <TableCell>{item.brand}</TableCell>
                      <TableCell>{item.model}</TableCell>
                      <TableCell><Badge variant={item.status === "active" ? "default" : "secondary"}>{item.status === "active" ? "Active" : "Inactive"}</Badge></TableCell>
                      <TableCell>{new Date(item.createdDate).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openStoreDialog(item)}><Edit2 className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleStoreDelete(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No store items found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ========== TAB: REQUESTS ========== */}
        <TabsContent value="requests" className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Asset Requests</h2>
            <p className="text-sm text-muted-foreground">{role === "employer" ? "Review and manage asset requests from employees." : "Track your asset requests."}</p>
          </div>
          <div className="bg-card rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {role === "employer" && <TableHead className="font-semibold">Employee</TableHead>}
                  <TableHead className="font-semibold">Asset Name</TableHead>
                  <TableHead className="font-semibold">Category</TableHead>
                  <TableHead className="font-semibold">Request Date</TableHead>
                  <TableHead className="font-semibold">Reason</TableHead>
                  <TableHead className="font-semibold">Priority</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  {role === "employer" && <TableHead className="font-semibold text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRequests.length > 0 ? displayRequests.map(req => (
                  <TableRow key={req.id} className="hover:bg-muted/30 transition-colors">
                    {role === "employer" && <TableCell className="font-medium">{req.employeeName}</TableCell>}
                    <TableCell>{req.storeItemName}</TableCell>
                    <TableCell>{req.category}</TableCell>
                    <TableCell>{new Date(req.requestDate).toLocaleDateString()}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={req.reason}>{req.reason}</TableCell>
                    <TableCell><Badge variant={req.priority === "high" ? "destructive" : req.priority === "medium" ? "default" : "secondary"}>{req.priority.charAt(0).toUpperCase() + req.priority.slice(1)}</Badge></TableCell>
                    <TableCell><StatusBadge status={req.status} /></TableCell>
                    {role === "employer" && (
                      <TableCell className="text-right">
                        {req.status === "pending" ? (
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => { approveRequest(req.id); toast({ title: "Request Approved" }); }}><CheckCircle className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { rejectRequest(req.id); toast({ title: "Request Rejected" }); }}><XCircle className="h-4 w-4" /></Button>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={role === "employer" ? 8 : 6} className="text-center py-8 text-muted-foreground">No requests found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* ===== DIALOGS ===== */}

      {/* Add Inventory Asset Dialog */}
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
                <div className="space-y-2"><Label>Product Image URL <span className="text-destructive">*</span></Label><Input placeholder="https://..." required value={newImage} onChange={e => setNewImage(e.target.value)} /></div>
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

      {/* Edit Inventory Asset Dialog */}
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
                  {/* fallback for legacy categories */}
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

      {/* Category Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{catEditItem ? "Edit Category" : "Add Category"}</DialogTitle>
            <DialogDescription>{catEditItem ? "Update category details." : "Create a new asset category."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCatSave} className="space-y-4">
            <div className="space-y-2"><Label>Category Name</Label><Input required value={catName} onChange={e => setCatName(e.target.value)} placeholder="e.g. Laptops" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={catDesc} onChange={e => setCatDesc(e.target.value)} placeholder="Optional description..." /></div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={catStatus} onValueChange={(v: "active" | "inactive") => setCatStatus(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCatDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{catEditItem ? "Save Changes" : "Create Category"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Store Item Dialog */}
      <Dialog open={storeDialogOpen} onOpenChange={setStoreDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{storeEditItem ? "Edit Store Item" : "Add to Asset Store"}</DialogTitle>
            <DialogDescription>{storeEditItem ? "Update store catalog item." : "Add a new asset to the store catalog."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleStoreSave} className="space-y-4">
            <div className="space-y-2"><Label>Asset Name</Label><Input required value={siName} onChange={e => setSiName(e.target.value)} placeholder="e.g. MacBook Pro 14" /></div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select required value={siCategoryId} onValueChange={setSiCategoryId}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{activeCats.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Brand</Label><Input required value={siBrand} onChange={e => setSiBrand(e.target.value)} placeholder="e.g. Apple" /></div>
              <div className="space-y-2"><Label>Model</Label><Input required value={siModel} onChange={e => setSiModel(e.target.value)} placeholder="e.g. MacBook Pro" /></div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea required value={siDesc} onChange={e => setSiDesc(e.target.value)} placeholder="Describe this asset..." /></div>
            <div className="space-y-2"><Label>Image URL</Label><Input value={siImage} onChange={e => setSiImage(e.target.value)} placeholder="https://..." /></div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={siStatus} onValueChange={(v: "active" | "inactive") => setSiStatus(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <p className="text-xs text-muted-foreground font-medium">Optional Fields</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>SKU / Asset Code</Label><Input value={siSku} onChange={e => setSiSku(e.target.value)} placeholder="e.g. HP-PB450" /></div>
              <div className="space-y-2"><Label>Estimated Cost</Label><Input type="number" value={siCost} onChange={e => setSiCost(e.target.value)} placeholder="e.g. 4500" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Warranty Period</Label><Input value={siWarranty} onChange={e => setSiWarranty(e.target.value)} placeholder="e.g. 3 years" /></div>
              <div className="space-y-2"><Label>Specifications</Label><Input value={siSpecs} onChange={e => setSiSpecs(e.target.value)} placeholder="e.g. 16GB RAM" /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStoreDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{storeEditItem ? "Save Changes" : "Add to Store"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Request Dialog */}
      <Dialog open={reqDialogOpen} onOpenChange={setReqDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Asset</DialogTitle>
            <DialogDescription>Submit a request for "{reqStoreItem?.name}".</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRequestSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Asset Name</Label><Input readOnly value={reqStoreItem?.name || ""} className="bg-muted" /></div>
              <div className="space-y-2"><Label>Category</Label><Input readOnly value={reqStoreItem?.categoryName || ""} className="bg-muted" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Employee</Label><Input readOnly value={activeEmps.find(e => e.id === currentEmployeeId) ? `${activeEmps.find(e => e.id === currentEmployeeId)!.firstName} ${activeEmps.find(e => e.id === currentEmployeeId)!.lastName}` : "Current User"} className="bg-muted" /></div>
              <div className="space-y-2"><Label>Request Date</Label><Input readOnly value={new Date().toLocaleDateString()} className="bg-muted" /></div>
            </div>
            <div className="space-y-2"><Label>Reason for Request <span className="text-destructive">*</span></Label><Textarea required value={reqReason} onChange={e => setReqReason(e.target.value)} placeholder="Explain why you need this asset..." /></div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={reqPriority} onValueChange={(v: "low" | "medium" | "high") => setReqPriority(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReqDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Submit Request</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
