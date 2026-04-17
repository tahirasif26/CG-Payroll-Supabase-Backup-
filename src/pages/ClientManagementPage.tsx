import { useMemo, useState } from "react";
import {
  Building2, Plus, Search, MoreHorizontal, Users, Eye, Pencil,
  Pause, Play, Trash2, Download, CheckCircle2, Clock, XCircle, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  useClients, useSetClientStatus, useDeleteClient, type ClientStat, type ClientFilters,
} from "@/hooks/queries/useClients";
import { AddClientWizard } from "@/components/clients/AddClientWizard";
import { ClientDetailsSheet } from "@/components/clients/ClientDetailsSheet";

const PLAN_STYLES: Record<string, string> = {
  starter: "bg-slate-100 text-slate-700 border-slate-200",
  pro: "bg-blue-50 text-blue-700 border-blue-200",
  enterprise: "bg-purple-50 text-purple-700 border-purple-200",
};

const STATUS_STYLES: Record<string, { bg: string; dot: string; label: string }> = {
  active: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", label: "Active" },
  trial: { bg: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", label: "Trial" },
  suspended: { bg: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500", label: "Suspended" },
};

const AVATAR_COLORS = [
  "from-purple-500 to-pink-500",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-orange-500 to-amber-500",
  "from-rose-500 to-red-500",
  "from-indigo-500 to-violet-500",
];

function avatarColor(name: string) {
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export default function ClientManagementPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [detailsClient, setDetailsClient] = useState<ClientStat | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: "suspend" | "activate" | "delete";
    client: ClientStat;
  } | null>(null);

  const filters: ClientFilters = useMemo(() => ({
    status: statusFilter,
    plan: planFilter,
    country: countryFilter,
    search,
  }), [statusFilter, planFilter, countryFilter, search]);

  const { data: clients, isLoading } = useClients(filters);
  const setStatus = useSetClientStatus();
  const deleteClient = useDeleteClient();

  const stats = useMemo(() => {
    const all = clients ?? [];
    return {
      total: all.length,
      active: all.filter((c) => c.status === "active").length,
      trial: all.filter((c) => c.status === "trial").length,
      suspended: all.filter((c) => c.status === "suspended").length,
      users: all.reduce((s, c) => s + (c.user_count ?? 0), 0),
    };
  }, [clients]);

  const countries = useMemo(() => {
    const set = new Set<string>();
    (clients ?? []).forEach((c) => c.country && set.add(c.country));
    return Array.from(set).sort();
  }, [clients]);

  const totalPages = Math.max(1, Math.ceil((clients?.length ?? 0) / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = (clients ?? []).slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleExport = () => {
    if (!clients?.length) return;
    const headers = ["Company", "Email", "Country", "Plan", "Status", "Users", "Created"];
    const rows = clients.map((c) => [
      c.company_name, c.company_email ?? "", c.country ?? "", c.subscription_plan,
      c.status, c.user_count, c.created_at,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;
    if (confirmAction.type === "delete") {
      await deleteClient.mutateAsync(confirmAction.client.id);
    } else {
      await setStatus.mutateAsync({
        id: confirmAction.client.id,
        status: confirmAction.type === "suspend" ? "suspended" : "active",
      });
    }
    setConfirmAction(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Client Management"
          description="Manage all client companies and their administrators"
        />
        <Button onClick={() => setWizardOpen(true)} className="gap-1.5 bg-orange-600 hover:bg-orange-700 text-white shadow-sm">
          <Plus className="h-4 w-4" /> Add Client
        </Button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard label="Total Clients" value={stats.total} icon={Building2} accent="purple" loading={isLoading} />
        <MetricCard label="Active" value={stats.active} icon={CheckCircle2} accent="emerald" loading={isLoading} />
        <MetricCard label="Trial" value={stats.trial} icon={Clock} accent="amber" loading={isLoading} />
        <MetricCard label="Suspended" value={stats.suspended} icon={XCircle} accent="red" loading={isLoading} />
        <MetricCard label="Total Users" value={stats.users} icon={Users} accent="blue" loading={isLoading} />
      </div>

      {/* Filters bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by company name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Company</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Email</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Country</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Plan</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Status</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-center">Users</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Created</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}><Skeleton className="h-10 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <EmptyState onAdd={() => setWizardOpen(true)} hasFilters={!!search || statusFilter !== "all" || planFilter !== "all"} />
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((c) => {
                  const sStyle = STATUS_STYLES[c.status];
                  return (
                    <TableRow
                      key={c.id}
                      className="group hover:bg-muted/30 cursor-pointer"
                      onClick={() => setDetailsClient(c)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-9 w-9 rounded-lg bg-gradient-to-br flex items-center justify-center text-white font-bold text-xs shrink-0",
                            avatarColor(c.company_name)
                          )}>
                            {c.company_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-[13px] truncate">{c.company_name}</p>
                            {c.company_slug && <p className="text-[10px] text-muted-foreground font-mono">{c.company_slug}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-[12px] text-muted-foreground">{c.company_email ?? "—"}</TableCell>
                      <TableCell className="text-[12px]">{c.country ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px] capitalize font-semibold", PLAN_STYLES[c.subscription_plan])}>
                          {c.subscription_plan}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px] gap-1.5 font-semibold", sStyle.bg)}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", sStyle.dot)} />
                          {sStyle.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-[12px] font-semibold">{c.user_count}</TableCell>
                      <TableCell className="text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-60 group-hover:opacity-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => setDetailsClient(c)}>
                              <Eye className="h-3.5 w-3.5 mr-2" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDetailsClient(c)}>
                              <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {c.status === "suspended" ? (
                              <DropdownMenuItem onClick={() => setConfirmAction({ type: "activate", client: c })}>
                                <Play className="h-3.5 w-3.5 mr-2" /> Activate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => setConfirmAction({ type: "suspend", client: c })}>
                                <Pause className="h-3.5 w-3.5 mr-2" /> Suspend
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => setConfirmAction({ type: "delete", client: c })}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination footer */}
        {!isLoading && (clients?.length ?? 0) > 0 && (
          <div className="flex items-center justify-between p-3 border-t text-[12px]">
            <p className="text-muted-foreground">
              Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, clients!.length)} of {clients!.length}
            </p>
            <div className="flex items-center gap-3">
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={safePage === 1} onClick={() => setPage(safePage - 1)}>Prev</Button>
                <span className="px-2 text-muted-foreground">{safePage} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={safePage === totalPages} onClick={() => setPage(safePage + 1)}>Next</Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      <AddClientWizard open={wizardOpen} onOpenChange={setWizardOpen} />
      <ClientDetailsSheet
        client={detailsClient}
        open={!!detailsClient}
        onOpenChange={(o) => !o && setDetailsClient(null)}
      />

      <AlertDialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "delete" && `Delete ${confirmAction.client.company_name}?`}
              {confirmAction?.type === "suspend" && `Suspend ${confirmAction.client.company_name}?`}
              {confirmAction?.type === "activate" && `Activate ${confirmAction.client.company_name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "delete" && "This will permanently delete the client and all related data. This cannot be undone."}
              {confirmAction?.type === "suspend" && "All users in this client will lose access until reactivated."}
              {confirmAction?.type === "activate" && "All users in this client will regain access."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={confirmAction?.type === "delete" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const ACCENT_STYLES: Record<string, { bar: string; bg: string; icon: string }> = {
  purple: { bar: "bg-purple-500", bg: "bg-purple-50/60", icon: "bg-purple-100 text-purple-700" },
  emerald: { bar: "bg-emerald-500", bg: "bg-emerald-50/60", icon: "bg-emerald-100 text-emerald-700" },
  amber: { bar: "bg-amber-500", bg: "bg-amber-50/60", icon: "bg-amber-100 text-amber-700" },
  red: { bar: "bg-red-500", bg: "bg-red-50/60", icon: "bg-red-100 text-red-700" },
  blue: { bar: "bg-blue-500", bg: "bg-blue-50/60", icon: "bg-blue-100 text-blue-700" },
};

function MetricCard({
  label, value, icon: Icon, accent, loading,
}: { label: string; value: number; icon: any; accent: keyof typeof ACCENT_STYLES; loading?: boolean }) {
  const s = ACCENT_STYLES[accent];
  return (
    <Card className={cn("relative overflow-hidden border-0 shadow-sm", s.bg)}>
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", s.bar)} />
      <CardContent className="p-4 pl-5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{label}</p>
            {loading ? <Skeleton className="h-7 w-12 mt-1" /> : (
              <p className="text-2xl font-bold mt-0.5 tabular-nums">{value.toLocaleString()}</p>
            )}
          </div>
          <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", s.icon)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ onAdd, hasFilters }: { onAdd: () => void; hasFilters: boolean }) {
  return (
    <div className="text-center py-16">
      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 mx-auto flex items-center justify-center mb-4">
        <Sparkles className="h-7 w-7 text-white" />
      </div>
      <h3 className="text-lg font-bold mb-1">{hasFilters ? "No clients match" : "No clients yet"}</h3>
      <p className="text-sm text-muted-foreground mb-4">
        {hasFilters ? "Try adjusting your filters." : "Create your first client to get started."}
      </p>
      {!hasFilters && (
        <Button onClick={onAdd} className="gap-1.5 bg-orange-600 hover:bg-orange-700 text-white">
          <Plus className="h-4 w-4" /> Add Client
        </Button>
      )}
    </div>
  );
}
