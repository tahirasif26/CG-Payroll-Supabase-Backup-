import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAssets } from "@/contexts/AssetContext";
import { AssetCategory } from "@/types/hcm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

let catIdCounter = 100;

export default function AssetCategoriesPage() {
  const { categories, addCategory, updateCategory, deleteCategory, canDeleteCategory } = useAssets();
  const { toast } = useToast();

  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catEditItem, setCatEditItem] = useState<AssetCategory | null>(null);
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [catStatus, setCatStatus] = useState<"active" | "inactive">("active");

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

  return (
    <div className="space-y-6">
      <PageHeader title="Asset Categories" description="Define categories used to classify assets.">
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={() => openCatDialog()}>
          <Plus className="h-4 w-4 mr-2" />Add Category
        </Button>
      </PageHeader>

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
            {categories.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No categories found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

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
    </div>
  );
}
