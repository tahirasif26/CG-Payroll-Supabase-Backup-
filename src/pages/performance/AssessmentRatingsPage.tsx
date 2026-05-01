import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeletonRows } from "@/components/LoadingState";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { useAssessmentRatings, useUpsertAssessmentRating, useDeleteAssessmentRating, DBAssessmentRating } from "@/hooks/queries/usePerformance";

export default function AssessmentRatingsPage() {
  const { data: ratings = [], isLoading } = useAssessmentRatings();
  const upsert = useUpsertAssessmentRating();
  const del = useDeleteAssessmentRating();
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<Partial<DBAssessmentRating> | null>(null);

  const openAdd = () => {
    setEditItem({ name: "", value: 0, description: "", color: "bg-muted text-muted-foreground" });
    setEditOpen(true);
  };

  const openEdit = (r: DBAssessmentRating) => {
    setEditItem({ ...r });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editItem || !editItem.name) return;
    await upsert.mutateAsync(editItem);
    setEditOpen(false);
  };

  const sorted = [...ratings].sort((a, b) => Number(b.value) - Number(a.value));

  return (
    <div className="space-y-6">
      <PageHeader title="Assessment Ratings" description="Configure the rating scale used across all performance assessments.">
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />Add Rating
        </Button>
      </PageHeader>

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Rating Name</TableHead>
              <TableHead className="font-semibold text-center">Value</TableHead>
              <TableHead className="font-semibold">Description</TableHead>
              <TableHead className="font-semibold">Preview</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeletonRows colSpan={5} />}
            {!isLoading && sorted.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-center font-semibold">{r.value}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.description}</TableCell>
                <TableCell>
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${r.color}`}>{r.name}</span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}><Edit2 className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => del.mutate(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem?.id ? "Edit" : "Add"} Rating</DialogTitle>
            <DialogDescription>Configure the rating level details.</DialogDescription>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={editItem.name || ""} onChange={e => setEditItem({ ...editItem, name: e.target.value })} placeholder="e.g. Outstanding" />
              </div>
              <div className="space-y-2">
                <Label>Numeric Value</Label>
                <Input type="number" min={1} max={10} value={editItem.value ?? 0} onChange={e => setEditItem({ ...editItem, value: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={editItem.description || ""} onChange={e => setEditItem({ ...editItem, description: e.target.value })} placeholder="Short description..." />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsert.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
