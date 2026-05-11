import { useState } from "react";
import { ImageUpload } from "@/components/ImageUpload";
import { PageHeader } from "@/components/PageHeader";
import { useRole } from "@/contexts/RoleContext";
import { useViewScope } from "@/contexts/ViewScopeContext";
import { useActiveEmployees } from "@/hooks/useActiveEmployees";
import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";
import { useAssets } from "@/contexts/AssetContext";
import { AssetStoreItem } from "@/types/hcm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2, Search, ShoppingBag, ImageIcon, LayoutGrid, List, X, Tag, Box, Cpu, Shield, Info, PackageOpen } from "lucide-react";
import { EmptyTableRow } from "@/components/EmptyState";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";

let storeIdCounter = 100;
let reqIdCounter = 100;

export default function AssetStorePage() {
  const { role, hasFeature } = useRole();
  const { scope } = useViewScope();
  const { data: currentEmp } = useCurrentEmployee();
  const canManageStore = scope === "people" && hasFeature("assets.manage_store");
  const activeEmps = useActiveEmployees();
  const {
    categories, storeItems, addStoreItem, updateStoreItem, deleteStoreItem, canDeleteStoreItem, getStoreItemsForDisplay,
    addAssetRequest,
  } = useAssets();
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
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

  // Product detail state
  const [detailItem, setDetailItem] = useState<AssetStoreItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Request state
  const [reqDialogOpen, setReqDialogOpen] = useState(false);
  const [reqStoreItem, setReqStoreItem] = useState<AssetStoreItem | null>(null);
  const [reqReason, setReqReason] = useState("");
  const [reqPriority, setReqPriority] = useState<"low" | "medium" | "high">("medium");

  const activeCats = categories.filter(c => c.status === "active");
  const uniqueBrands = [...new Set(storeItems.map(si => si.brand).filter(Boolean))];
  const displayStoreItems = (role === "employee" ? getStoreItemsForDisplay() : storeItems).filter(si => {
    const q = storeSearch.toLowerCase();
    const matchSearch = !q || si.name.toLowerCase().includes(q) || si.brand.toLowerCase().includes(q) || si.model.toLowerCase().includes(q);
    const matchCat = storeCatFilter === "all" || si.categoryId === storeCatFilter;
    const matchBrand = storeBrandFilter === "all" || si.brand === storeBrandFilter;
    return matchSearch && matchCat && matchBrand;
  });

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

  const openDetailView = (item: AssetStoreItem) => {
    setDetailItem(item);
    setDetailOpen(true);
  };

  const openRequestDialog = (item: AssetStoreItem) => {
    setDetailOpen(false);
    setReqStoreItem(item);
    setReqReason("");
    setReqPriority("medium");
    setReqDialogOpen(true);
  };

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqStoreItem) return;
    if (!currentEmp?.id) {
      toast({ title: "Cannot submit request", description: "Your employee profile is not set up. Please contact your admin.", variant: "destructive" });
      return;
    }
    addAssetRequest({
      id: `req-${++reqIdCounter}`,
      employeeId: currentEmp.id,
      employeeName: `${currentEmp.first_name || ""} ${currentEmp.last_name || ""}`.trim() || "Current User",
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

  const renderStoreCard = (item: AssetStoreItem) => (
    <Card
      key={item.id}
      className="overflow-hidden group hover:shadow-lg transition-all duration-300 border-border/60 cursor-pointer"
      onClick={() => openDetailView(item)}
    >
      <div className="relative h-48 bg-muted/50 overflow-hidden">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
            <span className="text-xs text-muted-foreground/40">No image</span>
          </div>
        )}
        {role === "employer" && (
          <Badge
            variant={item.status === "active" ? "default" : "secondary"}
            className="absolute top-2 right-2 text-[10px]"
          >
            {item.status === "active" ? "Active" : "Inactive"}
          </Badge>
        )}
      </div>
      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-sm leading-tight truncate">{item.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{item.categoryName}</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{item.brand}</span>
          <span className="text-border">•</span>
          <span>{item.model}</span>
        </div>
        {item.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{item.description}</p>
        )}
        <div className="pt-1" onClick={e => e.stopPropagation()}>
          {role === "employee" ? (
            <Button size="sm" className="w-full" onClick={() => openRequestDialog(item)}>
              <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />Request Asset
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => openRequestDialog(item)}>
                <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />Request
              </Button>
              <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => openStoreDialog(item)}>
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => handleStoreDelete(item.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Store"
        description="Browse and request company assets."
      >
        <div className="flex items-center gap-2">
          {role === "employer" && (
            <>
              <div className="flex items-center rounded-md border border-input bg-background p-0.5">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setViewMode("table")}
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
              </div>
              {canManageStore && (
                <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={() => openStoreDialog()}>
                  <Plus className="h-4 w-4 mr-2" />Add to Store
                </Button>
              )}
            </>
          )}
        </div>
      </PageHeader>

      {/* Filters */}
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

      {/* Grid View */}
      {(role === "employee" || viewMode === "grid") ? (
        displayStoreItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {displayStoreItems.map(renderStoreCard)}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <ShoppingBag className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground font-medium">No assets available in the store.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Check back later or adjust your filters.</p>
            </CardContent>
          </Card>
        )
      ) : (
        /* Admin Table View */
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
                <TableRow key={item.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => openDetailView(item)}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.categoryName}</TableCell>
                  <TableCell>{item.brand}</TableCell>
                  <TableCell>{item.model}</TableCell>
                  <TableCell><Badge variant={item.status === "active" ? "default" : "secondary"}>{item.status === "active" ? "Active" : "Inactive"}</Badge></TableCell>
                  <TableCell>{new Date(item.createdDate).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openStoreDialog(item)}><Edit2 className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleStoreDelete(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <EmptyTableRow colSpan={7} icon={PackageOpen} title="No store items" description="Add items to the store so employees can request them." />
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Product Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-2xl border-border/60 max-h-[90vh]">
          {detailItem && (
            <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
              {/* Left: Image */}
              <div className="relative w-full md:w-[45%] bg-muted/30 flex-shrink-0">
                <div className="aspect-square md:aspect-auto md:h-full flex items-center justify-center p-6 md:p-8">
                  {detailItem.image ? (
                    <img
                      src={detailItem.image}
                      alt={detailItem.name}
                      className="w-full h-full object-contain max-h-[300px] md:max-h-full rounded-lg animate-scale-in"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground/40">
                      <ImageIcon className="h-20 w-20" />
                      <span className="text-sm">No image available</span>
                    </div>
                  )}
                </div>
                <Badge className="absolute top-4 left-4 text-[10px]">
                  {detailItem.categoryName}
                </Badge>
              </div>

              {/* Right: Info */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-6 pb-0 flex items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <h2 className="text-xl font-bold text-foreground leading-tight">{detailItem.name}</h2>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px] font-normal gap-1">
                        <Tag className="h-2.5 w-2.5" />{detailItem.brand}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-normal gap-1">
                        <Box className="h-2.5 w-2.5" />{detailItem.model}
                      </Badge>
                      {detailItem.sku && (
                        <Badge variant="secondary" className="text-[10px] font-normal">
                          SKU: {detailItem.sku}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full flex-shrink-0 -mt-1 -mr-2"
                    onClick={() => setDetailOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  {/* Description */}
                  {detailItem.description && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <Info className="h-3.5 w-3.5" />
                        Description
                      </div>
                      <p className="text-sm text-foreground/80 leading-relaxed">
                        {detailItem.description}
                      </p>
                    </div>
                  )}

                  {/* Specifications */}
                  {detailItem.specifications && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <Cpu className="h-3.5 w-3.5" />
                        Specifications
                      </div>
                      <div className="bg-muted/40 rounded-lg p-3">
                        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
                          {detailItem.specifications}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Warranty */}
                  {detailItem.warrantyPeriod && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <Shield className="h-3.5 w-3.5" />
                        Warranty
                      </div>
                      <p className="text-sm text-foreground/80">{detailItem.warrantyPeriod}</p>
                    </div>
                  )}

                  <Separator />

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Category</span>
                      <p className="text-sm font-medium text-foreground">{detailItem.categoryName}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Brand</span>
                      <p className="text-sm font-medium text-foreground">{detailItem.brand}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Model</span>
                      <p className="text-sm font-medium text-foreground">{detailItem.model}</p>
                    </div>
                    {detailItem.estimatedCost && (
                      <div className="space-y-1">
                        <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Estimated Cost</span>
                        <p className="text-sm font-medium text-foreground">SAR {detailItem.estimatedCost.toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sticky bottom action */}
                <div className="p-5 pt-3 border-t border-border/60 bg-background">
                  <Button
                    className="w-full h-11 text-sm font-semibold"
                    onClick={() => openRequestDialog(detailItem)}
                  >
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Request This Asset
                  </Button>
                </div>
              </div>
            </div>
          )}
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
            <ImageUpload value={siImage} onChange={setSiImage} label="Product Image" />
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
