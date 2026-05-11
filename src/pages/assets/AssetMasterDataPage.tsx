import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAssets } from "@/contexts/AssetContext";
import { AssetCategory, AssetConditionItem, AssetLocationItem } from "@/types/hcm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyTableRow } from "@/components/EmptyState";
import { Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


export default function AssetMasterDataPage() {
  const {
    categories, addCategory, updateCategory, deleteCategory, canDeleteCategory,
    conditions, addCondition, updateCondition, deleteCondition, canDeleteCondition,
    locations, addLocation, updateLocation, deleteLocation, canDeleteLocation,
  } = useAssets();
  const { toast } = useToast();

  // Shared dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"category" | "condition" | "location">("category");
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  

  // Search states
  const [catSearch, setCatSearch] = useState("");
  const [condSearch, setCondSearch] = useState("");
  const [locSearch, setLocSearch] = useState("");

  const openDialog = (type: "category" | "condition" | "location", item?: { id: string; name: string; description: string }) => {
    setDialogType(type);
    if (item) {
      setEditId(item.id);
      setFormName(item.name);
      setFormDesc(item.description);
    } else {
      setEditId(null);
      setFormName("");
      setFormDesc("");
    }
    setDialogOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const today = new Date().toISOString().split("T")[0];

    if (dialogType === "category") {
      if (editId) {
        updateCategory(editId, { name: formName, description: formDesc });
        toast({ title: "Category Updated", description: `"${formName}" updated.` });
      } else {
        addCategory({ id: `cat-${++catIdCounter}`, name: formName, description: formDesc, status: "active", createdDate: today });
        toast({ title: "Category Created", description: `"${formName}" created.` });
      }
    } else if (dialogType === "condition") {
      if (editId) {
        updateCondition(editId, { name: formName, description: formDesc });
        toast({ title: "Condition Updated", description: `"${formName}" updated.` });
      } else {
        addCondition({ id: `cond-${++condIdCounter}`, name: formName, description: formDesc, status: "active", createdDate: today });
        toast({ title: "Condition Created", description: `"${formName}" created.` });
      }
    } else {
      if (editId) {
        updateLocation(editId, { name: formName, description: formDesc });
        toast({ title: "Location Updated", description: `"${formName}" updated.` });
      } else {
        addLocation({ id: `loc-${++locIdCounter}`, name: formName, description: formDesc, status: "active", createdDate: today });
        toast({ title: "Location Created", description: `"${formName}" created.` });
      }
    }
    setDialogOpen(false);
  };

  const handleDeleteCategory = (id: string) => {
    if (!canDeleteCategory(id)) { toast({ title: "Cannot Delete", description: "This category has assets linked to it.", variant: "destructive" }); return; }
    const cat = categories.find(c => c.id === id);
    deleteCategory(id);
    toast({ title: "Category Deleted", description: `"${cat?.name}" deleted.` });
  };

  const handleDeleteCondition = (id: string) => {
    if (!canDeleteCondition(id)) { toast({ title: "Cannot Delete", description: "This condition is used by existing assets.", variant: "destructive" }); return; }
    const cond = conditions.find(c => c.id === id);
    deleteCondition(id);
    toast({ title: "Condition Deleted", description: `"${cond?.name}" deleted.` });
  };

  const handleDeleteLocation = (id: string) => {
    if (!canDeleteLocation(id)) { toast({ title: "Cannot Delete", description: "This location is linked to existing assets.", variant: "destructive" }); return; }
    const loc = locations.find(l => l.id === id);
    deleteLocation(id);
    toast({ title: "Location Deleted", description: `"${loc?.name}" deleted.` });
  };

  const dialogLabels = {
    category: { singular: "Category", add: "Add Category", edit: "Edit Category", addDesc: "Create a new asset category.", editDesc: "Update category details." },
    condition: { singular: "Condition", add: "Add Condition", edit: "Edit Condition", addDesc: "Create a new asset condition.", editDesc: "Update condition details." },
    location: { singular: "Location", add: "Add Location", edit: "Edit Location", addDesc: "Create a new asset location.", editDesc: "Update location details." },
  };

  const label = dialogLabels[dialogType];

  const filteredCategories = categories.filter(c => !catSearch || c.name.toLowerCase().includes(catSearch.toLowerCase()) || c.description.toLowerCase().includes(catSearch.toLowerCase()));
  const filteredConditions = conditions.filter(c => !condSearch || c.name.toLowerCase().includes(condSearch.toLowerCase()) || c.description.toLowerCase().includes(condSearch.toLowerCase()));
  const filteredLocations = locations.filter(l => !locSearch || l.name.toLowerCase().includes(locSearch.toLowerCase()) || l.description.toLowerCase().includes(locSearch.toLowerCase()));

  const renderTable = (
    items: Array<{ id: string; name: string; description: string; createdDate: string }>,
    type: "category" | "condition" | "location",
    onDelete: (id: string) => void,
    search: string,
    setSearch: (v: string) => void,
  ) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={`Search ${type}...`} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={() => openDialog(type)}>
          <Plus className="h-4 w-4 mr-2" />Add {dialogLabels[type].singular}
        </Button>
      </div>
      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Description</TableHead>
              <TableHead className="font-semibold">Created Date</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(item => (
              <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-muted-foreground">{item.description || "—"}</TableCell>
                <TableCell>{new Date(item.createdDate).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog(type, item)}><Edit2 className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <EmptyTableRow colSpan={4} icon={Database} title="No records yet" description="Add your first record to get started." />
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Asset Settings" description="Manage reference data used across the Asset Tracking module." />

      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="categories">Asset Categories</TabsTrigger>
          <TabsTrigger value="conditions">Asset Condition</TabsTrigger>
          <TabsTrigger value="locations">Asset Location</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="mt-6">
          {renderTable(filteredCategories, "category", handleDeleteCategory, catSearch, setCatSearch)}
        </TabsContent>

        <TabsContent value="conditions" className="mt-6">
          {renderTable(filteredConditions, "condition", handleDeleteCondition, condSearch, setCondSearch)}
        </TabsContent>

        <TabsContent value="locations" className="mt-6">
          {renderTable(filteredLocations, "location", handleDeleteLocation, locSearch, setLocSearch)}
        </TabsContent>
      </Tabs>

      {/* Shared Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? label.edit : label.add}</DialogTitle>
            <DialogDescription>{editId ? label.editDesc : label.addDesc}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>{label.singular} Name</Label>
              <Input required value={formName} onChange={e => setFormName(e.target.value)} placeholder={`e.g. ${dialogType === "category" ? "Laptops" : dialogType === "condition" ? "Good" : "Head Office"}`} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Optional description..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editId ? "Save Changes" : `Create ${label.singular}`}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
