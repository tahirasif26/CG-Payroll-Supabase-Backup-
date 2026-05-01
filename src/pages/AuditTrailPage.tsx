import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, History, Search, RefreshCw } from "lucide-react";

interface AuditLog {
  id: string;
  user_id: string;
  user_email: string | null;
  user_role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_label: string | null;
  before_value: unknown;
  after_value: unknown;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const actionColor = (a: string): "default" | "secondary" | "destructive" | "outline" => {
  if (a.includes("delete") || a.includes("remove")) return "destructive";
  if (a.includes("create") || a.includes("add") || a.includes("insert")) return "default";
  if (a.includes("update") || a.includes("edit") || a.includes("change")) return "secondary";
  return "outline";
};

export default function AuditTrailPage() {
  const { clientId } = useRole();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const { data: logs = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["audit-logs", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("client_id", clientId!)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as AuditLog[];
    },
  });

  const actions = useMemo(() => Array.from(new Set(logs.map((l) => l.action))).sort(), [logs]);
  const entities = useMemo(
    () => Array.from(new Set(logs.map((l) => l.entity_type).filter(Boolean) as string[])).sort(),
    [logs],
  );

  const filtered = logs.filter((l) => {
    if (actionFilter !== "all" && l.action !== actionFilter) return false;
    if (entityFilter !== "all" && l.entity_type !== entityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = [l.user_email, l.entity_label, l.entity_type, l.action, l.entity_id]
        .filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Trail"
        description="Track who changed what and when across the system."
      >
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs">Search</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="User, entity, action..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Action</Label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {actions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Entity Type</Label>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entities</SelectItem>
                {entities.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
            <span className="text-xs text-muted-foreground font-normal ml-2">(latest 500)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No audit entries found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 border-b">
                  <tr className="text-left">
                    <th className="px-4 py-2 font-medium">When</th>
                    <th className="px-4 py-2 font-medium">User</th>
                    <th className="px-4 py-2 font-medium">Action</th>
                    <th className="px-4 py-2 font-medium">Entity</th>
                    <th className="px-4 py-2 font-medium">Label</th>
                    <th className="px-4 py-2 font-medium w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => (
                    <tr key={l.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">
                        {format(new Date(l.created_at), "MMM d, yyyy HH:mm")}
                      </td>
                      <td className="px-4 py-2 truncate max-w-[180px]">{l.user_email ?? l.user_id.slice(0, 8)}</td>
                      <td className="px-4 py-2">
                        <Badge variant={actionColor(l.action)} className="text-[10px] font-mono">
                          {l.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{l.entity_type ?? "—"}</td>
                      <td className="px-4 py-2 truncate max-w-[240px]">{l.entity_label ?? "—"}</td>
                      <td className="px-4 py-2">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelected(l)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Entry Details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">When:</span> <span className="font-medium">{format(new Date(selected.created_at), "PPpp")}</span></div>
                <div><span className="text-muted-foreground">User:</span> <span className="font-medium">{selected.user_email ?? selected.user_id}</span></div>
                <div><span className="text-muted-foreground">Role:</span> <span className="font-medium">{selected.user_role ?? "—"}</span></div>
                <div><span className="text-muted-foreground">Action:</span> <Badge variant={actionColor(selected.action)} className="text-[10px]">{selected.action}</Badge></div>
                <div><span className="text-muted-foreground">Entity:</span> <span className="font-medium">{selected.entity_type ?? "—"}</span></div>
                <div className="truncate"><span className="text-muted-foreground">Entity ID:</span> <span className="font-mono">{selected.entity_id ?? "—"}</span></div>
              </div>
              {selected.entity_label && (
                <div><span className="text-muted-foreground">Label:</span> <span className="font-medium">{selected.entity_label}</span></div>
              )}
              {(selected.before_value !== null || selected.after_value !== null) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Before</Label>
                    <pre className="bg-muted/50 p-3 rounded text-[10px] overflow-x-auto max-h-60">
                      {JSON.stringify(selected.before_value ?? null, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <Label className="text-xs">After</Label>
                    <pre className="bg-muted/50 p-3 rounded text-[10px] overflow-x-auto max-h-60">
                      {JSON.stringify(selected.after_value ?? null, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
              {selected.user_agent && (
                <div className="text-[10px] text-muted-foreground border-t pt-2">
                  <div>IP: {selected.ip_address ?? "—"}</div>
                  <div className="truncate">UA: {selected.user_agent}</div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
