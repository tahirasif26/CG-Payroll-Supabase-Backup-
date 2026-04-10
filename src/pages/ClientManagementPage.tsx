import { useState } from "react";
import { Building2, Plus, Search, MoreHorizontal, Users, Calendar, CheckCircle2, Clock, Pencil, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ImageUpload";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/PageHeader";

interface Client {
  id: string;
  companyName: string;
  logo?: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  industry: string;
  country: string;
  totalEmployees: number;
  status: "active" | "onboarding" | "inactive";
  subscriptionPlan: string;
  startDate: string;
  notes: string;
}

const initialClients: Client[] = [
  {
    id: "1",
    companyName: "Al Rajhi Holdings",
    contactPerson: "Mohammed Al Rajhi",
    contactEmail: "m.alrajhi@alrajhi.com",
    contactPhone: "+966 50 123 4567",
    industry: "Financial Services",
    country: "Saudi Arabia",
    totalEmployees: 450,
    status: "active",
    subscriptionPlan: "Enterprise",
    startDate: "2025-01-15",
    notes: "Key client, premium support",
  },
  {
    id: "2",
    companyName: "Dubai Tech Solutions",
    contactPerson: "Fatima Al Maktoum",
    contactEmail: "fatima@dubaitech.ae",
    contactPhone: "+971 55 987 6543",
    industry: "Technology",
    country: "UAE",
    totalEmployees: 120,
    status: "active",
    subscriptionPlan: "Professional",
    startDate: "2025-03-01",
    notes: "",
  },
  {
    id: "3",
    companyName: "Qatar Energy Corp",
    contactPerson: "Ahmad Al Thani",
    contactEmail: "a.althani@qatarenergy.qa",
    contactPhone: "+974 33 456 7890",
    industry: "Energy",
    country: "Qatar",
    totalEmployees: 800,
    status: "onboarding",
    subscriptionPlan: "Enterprise",
    startDate: "2026-04-01",
    notes: "New client — onboarding in progress",
  },
];

const emptyClient: Omit<Client, "id"> = {
  companyName: "",
  contactPerson: "",
  contactEmail: "",
  contactPhone: "",
  industry: "",
  country: "",
  totalEmployees: 0,
  status: "onboarding",
  subscriptionPlan: "Professional",
  startDate: new Date().toISOString().split("T")[0],
  notes: "",
};

const industries = ["Technology", "Financial Services", "Energy", "Healthcare", "Manufacturing", "Retail", "Real Estate", "Education", "Logistics", "Hospitality", "Other"];
const countries = ["Saudi Arabia", "UAE", "Qatar", "Bahrain", "Kuwait", "Oman", "Jordan", "Egypt", "Pakistan", "India", "Other"];
const plans = ["Starter", "Professional", "Enterprise"];

export default function ClientManagementPage() {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [form, setForm] = useState<Omit<Client, "id">>(emptyClient);
  const { toast } = useToast();

  const filtered = clients.filter(c => {
    const matchesSearch = c.companyName.toLowerCase().includes(search.toLowerCase()) ||
      c.contactPerson.toLowerCase().includes(search.toLowerCase()) ||
      c.contactEmail.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openAdd = () => {
    setEditingClient(null);
    setForm(emptyClient);
    setDialogOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    const { id, ...rest } = client;
    setForm(rest);
    setDialogOpen(true);
  };

  const openView = (client: Client) => {
    setViewingClient(client);
    setViewDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.companyName.trim() || !form.contactEmail.trim()) {
      toast({ title: "Required fields", description: "Company name and contact email are required", variant: "destructive" });
      return;
    }
    if (editingClient) {
      setClients(prev => prev.map(c => c.id === editingClient.id ? { ...c, ...form } : c));
      toast({ title: "Client updated", description: `${form.companyName} has been updated` });
    } else {
      const newClient: Client = { ...form, id: crypto.randomUUID() };
      setClients(prev => [...prev, newClient]);
      toast({ title: "Client added", description: `${form.companyName} has been added successfully` });
    }
    setDialogOpen(false);
  };

  const handleDelete = (client: Client) => {
    setClients(prev => prev.filter(c => c.id !== client.id));
    toast({ title: "Client removed", description: `${client.companyName} has been removed` });
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800";
      case "onboarding": return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800";
      case "inactive": return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800";
      default: return "";
    }
  };

  const stats = {
    total: clients.length,
    active: clients.filter(c => c.status === "active").length,
    onboarding: clients.filter(c => c.status === "onboarding").length,
    totalEmployees: clients.reduce((sum, c) => sum + c.totalEmployees, 0),
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Client Management" subtitle="Manage your client companies and their subscriptions" />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Total Clients</p>
                <p className="text-xl font-bold text-foreground">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Active</p>
                <p className="text-xl font-bold text-foreground">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
                <Clock className="h-4.5 w-4.5 text-amber-600" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Onboarding</p>
                <p className="text-xl font-bold text-foreground">{stats.onboarding}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
                <Users className="h-4.5 w-4.5 text-blue-600" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Total Employees</p>
                <p className="text-xl font-bold text-foreground">{stats.totalEmployees.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-[13px]" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9 text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="onboarding">Onboarding</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openAdd} size="sm" className="gradient-ey gap-1.5">
          <Plus className="h-4 w-4" />
          Add Client
        </Button>
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="text-[11px] uppercase tracking-wider">
                <TableHead className="font-semibold">Company</TableHead>
                <TableHead className="font-semibold">Contact</TableHead>
                <TableHead className="font-semibold">Industry</TableHead>
                <TableHead className="font-semibold">Country</TableHead>
                <TableHead className="font-semibold text-center">Employees</TableHead>
                <TableHead className="font-semibold">Plan</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <Building2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No clients found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(client => (
                  <TableRow key={client.id} className="group hover:bg-muted/30 cursor-pointer" onClick={() => openView(client)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {client.logo ? (
                          <img src={client.logo} alt="" className="h-8 w-8 rounded-md object-cover border" />
                        ) : (
                          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {client.companyName.charAt(0)}
                          </div>
                        )}
                        <span className="font-medium text-[13px]">{client.companyName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-[13px] font-medium">{client.contactPerson}</p>
                        <p className="text-[11px] text-muted-foreground">{client.contactEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-[13px]">{client.industry}</TableCell>
                    <TableCell className="text-[13px]">{client.country}</TableCell>
                    <TableCell className="text-center text-[13px] font-medium">{client.totalEmployees}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[11px] font-medium">{client.subscriptionPlan}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[11px] font-medium capitalize ${statusColor(client.status)}`}>
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => openView(client)}>
                            <Eye className="h-3.5 w-3.5 mr-2" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(client)}>
                            <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(client)} className="text-destructive focus:text-destructive">
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{editingClient ? "Edit Client" : "Add New Client"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <ImageUpload value={form.logo} onChange={logo => setForm(f => ({ ...f, logo }))} label="Company Logo" size="sm" />
              <div className="flex-1 space-y-2">
                <Label className="text-[13px] font-semibold">Company Name *</Label>
                <Input value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} placeholder="Enter company name" className="h-9 text-[13px]" />
              </div>
            </div>

            <Separator />

            {/* Contact Info */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Contact Information</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Contact Person</Label>
                  <Input value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} placeholder="Full name" className="h-9 text-[13px]" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Email *</Label>
                  <Input type="email" value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} placeholder="email@company.com" className="h-9 text-[13px]" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Phone</Label>
                  <Input value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} placeholder="+966 50 000 0000" className="h-9 text-[13px]" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Country</Label>
                  <Select value={form.country} onValueChange={v => setForm(f => ({ ...f, country: v }))}>
                    <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent>
                      {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Business Info */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Business Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Industry</Label>
                  <Select value={form.industry} onValueChange={v => setForm(f => ({ ...f, industry: v }))}>
                    <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Select industry" /></SelectTrigger>
                    <SelectContent>
                      {industries.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Subscription Plan</Label>
                  <Select value={form.subscriptionPlan} onValueChange={v => setForm(f => ({ ...f, subscriptionPlan: v }))}>
                    <SelectTrigger className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {plans.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Status</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as Client["status"] }))}>
                    <SelectTrigger className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="onboarding">Onboarding</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[13px]">Total Employees</Label>
                <Input type="number" value={form.totalEmployees || ""} onChange={e => setForm(f => ({ ...f, totalEmployees: parseInt(e.target.value) || 0 }))} placeholder="0" className="h-9 text-[13px]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">Start Date</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="h-9 text-[13px]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px]">Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Internal notes about this client..." className="text-[13px] min-h-[70px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} size="sm">Cancel</Button>
            <Button onClick={handleSave} size="sm" className="gradient-ey">{editingClient ? "Update Client" : "Add Client"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Client Details</DialogTitle>
          </DialogHeader>
          {viewingClient && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-4">
                {viewingClient.logo ? (
                  <img src={viewingClient.logo} alt="" className="h-14 w-14 rounded-lg object-cover border" />
                ) : (
                  <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                    {viewingClient.companyName.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-base">{viewingClient.companyName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={`text-[11px] capitalize ${statusColor(viewingClient.status)}`}>{viewingClient.status}</Badge>
                    <Badge variant="outline" className="text-[11px]">{viewingClient.subscriptionPlan}</Badge>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-[13px]">
                <div>
                  <p className="text-muted-foreground text-[11px] uppercase tracking-wider font-medium">Contact Person</p>
                  <p className="font-medium mt-0.5">{viewingClient.contactPerson}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px] uppercase tracking-wider font-medium">Email</p>
                  <p className="font-medium mt-0.5">{viewingClient.contactEmail}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px] uppercase tracking-wider font-medium">Phone</p>
                  <p className="font-medium mt-0.5">{viewingClient.contactPhone || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px] uppercase tracking-wider font-medium">Country</p>
                  <p className="font-medium mt-0.5">{viewingClient.country}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px] uppercase tracking-wider font-medium">Industry</p>
                  <p className="font-medium mt-0.5">{viewingClient.industry}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px] uppercase tracking-wider font-medium">Total Employees</p>
                  <p className="font-medium mt-0.5">{viewingClient.totalEmployees}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px] uppercase tracking-wider font-medium">Start Date</p>
                  <p className="font-medium mt-0.5">{new Date(viewingClient.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>
                </div>
              </div>
              {viewingClient.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-muted-foreground text-[11px] uppercase tracking-wider font-medium mb-1">Notes</p>
                    <p className="text-[13px]">{viewingClient.notes}</p>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setViewDialogOpen(false); if (viewingClient) openEdit(viewingClient); }}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
