import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeletonRows } from "@/components/LoadingState";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MileageSettings from "@/components/expenses/MileageSettings";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";

type Category = { id: string; name: string; is_active: boolean; client_id: string };

export default function ExpenseCategoriesPage() {
  const { clientId } = useRole();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Category | null>(null);
  const [formName, setFormName] = useState("");
  const [formActive, setFormActive] = useState(true);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["expense_categories_admin", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("expense_categories")
        .select("*")
        .eq("client_id", clientId)
        .order("name");
      if (error) throw error;
      return data as Category[];
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      if (editItem) {
        const { error } = await (supabase as any)
          .from("expense_categories")
          .update({ name: formName, is_active: formActive })
          .eq("id", editItem.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("expense_categories")
          .insert({ name: formName, is_active: formActive, client_id: clientId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expense_categories_admin"] });
      qc.invalidateQueries({ queryKey: ["expense_categories"] });
      toast({ title: editItem ? "Updated" : "Added" });
      setDialogOpen(false);
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("expense_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expense_categories_admin"] });
      qc.invalidateQueries({ queryKey: ["expense_categories"] });
      toast({ title: "Deleted" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const openAdd = () => { setEditItem(null); setFormName(""); setFormActive(true); setDialogOpen(true); };
  const openEdit = (item: Category) => { setEditItem(item); setFormName(item.name); setFormActive(item.is_active); setDialogOpen(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsert.mutate();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Expense Settings" description="Configure expense categories and mileage rates." />
      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="mileage">Mileage Rates</TabsTrigger>
        </TabsList>
        <TabsContent value="categories" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={openAdd}>
              <Plus className="h-4 w-4 mr-2" />Add Category
            </Button>
          </div>
          <div className="bg-card rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Category</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeletonRows colSpan={3} />
                ) : items.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No categories yet. Add one to get started.</TableCell></TableRow>
                ) : items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell><StatusBadge status={item.is_active ? "active" : "inactive"} /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => del.mutate(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="mileage" className="mt-4">
          <MileageSettings />
        </TabsContent>
      </Tabs>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Category" : "Add Category"}</DialogTitle>
            <DialogDescription>Configure expense category.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} required />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={formActive} onCheckedChange={setFormActive} />
              <Label>Active</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={upsert.isPending}>{editItem ? "Update" : "Add"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
