import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { jobTitles, JobTitle } from "@/data/settingsData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function JobTitlesPage() {
  const [items, setItems] = useState<JobTitle[]>(jobTitles);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<JobTitle | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formLevel, setFormLevel] = useState("Entry");
  const { toast } = useToast();

  const openAdd = () => { setEditItem(null); setFormTitle(""); setFormLevel("Entry"); setDialogOpen(true); };
  const openEdit = (item: JobTitle) => { setEditItem(item); setFormTitle(item.title); setFormLevel(item.level); setDialogOpen(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editItem) {
      setItems(prev => prev.map(i => i.id === editItem.id ? { ...i, title: formTitle, level: formLevel } : i));
      toast({ title: "Updated", description: `${formTitle} updated.` });
    } else {
      setItems(prev => [...prev, { id: String(Date.now()), title: formTitle, level: formLevel, isActive: true }]);
      toast({ title: "Added", description: `${formTitle} added.` });
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => { setItems(prev => prev.filter(i => i.id !== id)); toast({ title: "Deleted" }); };

  return (
    <div className="space-y-6">
      <PageHeader title="Job Titles" description="Manage job titles and career levels.">
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add Title</Button>
      </PageHeader>
      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader><TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Title</TableHead><TableHead className="font-semibold">Level</TableHead><TableHead className="font-semibold">Status</TableHead><TableHead className="font-semibold text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell><Badge variant="outline">{item.level}</Badge></TableCell>
                <TableCell><StatusBadge status={item.isActive ? "active" : "inactive"} /></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? "Edit Title" : "Add Title"}</DialogTitle><DialogDescription>Configure a job title.</DialogDescription></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Title</Label><Input value={formTitle} onChange={e => setFormTitle(e.target.value)} required /></div>
            <div className="space-y-2"><Label>Level</Label>
              <Select value={formLevel} onValueChange={setFormLevel}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Leadership">Leadership</SelectItem><SelectItem value="Management">Management</SelectItem><SelectItem value="Professional">Professional</SelectItem><SelectItem value="Entry">Entry</SelectItem></SelectContent>
              </Select>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit">{editItem ? "Update" : "Add"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
