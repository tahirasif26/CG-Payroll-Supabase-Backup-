import React, { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { usePolicy, PolicyDocument, PolicyCategory } from "@/contexts/PolicyContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, FileText, Upload, Search, Users } from "lucide-react";
import { toast } from "sonner";

const categoryLabels: Record<PolicyCategory, string> = {
  hr: "HR",
  finance: "Finance",
  it: "IT",
  "health-safety": "Health & Safety",
  general: "General",
};

const categoryColors: Record<PolicyCategory, string> = {
  hr: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  finance: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  it: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "health-safety": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  general: "bg-muted text-muted-foreground",
};

const TOTAL_EMPLOYEES = 50;

const emptyForm = {
  title: "",
  description: "",
  category: "general" as PolicyCategory,
  fileName: "",
  fileUrl: "#",
  version: 1,
  effectiveDate: new Date().toISOString().split("T")[0],
  requiresAck: false,
  status: "active" as "active" | "archived",
};

export default function CompanyPoliciesPage() {
  const { policies, addPolicy, updatePolicy, deletePolicy } = usePolicy();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const filtered = policies.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase());
    const matchesCat = filterCategory === "all" || p.category === filterCategory;
    return matchesSearch && matchesCat;
  });

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (policy: PolicyDocument) => {
    setEditingId(policy.id);
    setForm({
      title: policy.title,
      description: policy.description,
      category: policy.category,
      fileName: policy.fileName,
      fileUrl: policy.fileUrl,
      version: policy.version,
      effectiveDate: policy.effectiveDate,
      requiresAck: policy.requiresAck,
      status: policy.status,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) {
      toast.error("Policy title is required");
      return;
    }
    if (editingId) {
      updatePolicy(editingId, form);
      toast.success("Policy updated successfully");
    } else {
      addPolicy(form);
      toast.success("Policy added successfully");
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    deletePolicy(id);
    toast.success("Policy deleted successfully");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Company Policies" description="Manage policy documents accessible to all employees" />

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search policies..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={openAdd} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Policy
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Policy Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No policies found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="font-medium text-sm">{policy.title}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[250px]">{policy.description}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={categoryColors[policy.category]}>
                          {categoryLabels[policy.category]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">v{policy.version}</TableCell>
                      <TableCell className="text-sm">{policy.effectiveDate}</TableCell>
                      <TableCell>
                        {policy.requiresAck ? (
                          <div className="flex items-center gap-1.5 text-sm">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium">{policy.acknowledgments.length}</span>
                            <span className="text-muted-foreground">/ {TOTAL_EMPLOYEES}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not required</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={policy.status === "active" ? "default" : "secondary"} className="text-[11px]">
                          {policy.status === "active" ? "Active" : "Archived"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(policy)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Policy</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{policy.title}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(policy.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Policy" : "Add New Policy"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Policy Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Annual Leave Policy" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of the policy..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as PolicyCategory })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Effective Date</Label>
                <Input type="date" value={form.effectiveDate} onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Upload Document</Label>
              <div className="relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1.5" />
                <p className="text-sm text-muted-foreground">Click to upload PDF, DOCX, or image</p>
                <p className="text-xs text-muted-foreground mt-0.5">{form.fileName || "No file selected"}</p>
                <input
                  type="file"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setForm({ ...form, fileName: file.name, fileUrl: URL.createObjectURL(file) });
                  }}
                  
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingId ? "Update Policy" : "Add Policy"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
