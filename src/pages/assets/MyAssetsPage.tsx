import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Package, ClipboardList } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";

export default function MyAssetsPage() {
  const { data: employee } = useCurrentEmployee();

  const { data: myAssets = [], isLoading } = useQuery({
    queryKey: ["my-assets", employee?.id],
    enabled: !!employee?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assets")
        .select(
          "id, asset_tag, name, status, serial_number, warranty_expiry, asset_categories(name), asset_conditions(name)"
        )
        .eq("employee_id", employee!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: myRequests = [], isLoading: loadingReqs } = useQuery({
    queryKey: ["my-asset-requests", employee?.id],
    enabled: !!employee?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("asset_requests")
        .select("id, request_date, reason, priority, status, asset_store_items(name, asset_categories(name))")
        .eq("employee_id", employee!.id)
        .order("request_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Assets"
        description="Assets currently assigned to you and your asset requests."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" /> Assigned to me ({myAssets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState rows={4} variant="table" />
          ) : myAssets.length === 0 ? (
            <EmptyState icon={Package} title="No assets assigned" description="Assets your manager assigns to you will show up here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tag</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Serial #</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Warranty</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myAssets.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.asset_tag ?? a.id}</TableCell>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell>{a.asset_categories?.name ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{a.serial_number ?? "—"}</TableCell>
                    <TableCell>{a.asset_conditions?.name ?? "—"}</TableCell>
                    <TableCell>
                      {a.warranty_expiry
                        ? new Date(a.warranty_expiry).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell><StatusBadge status={a.status ?? "assigned"} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" /> My Requests ({myRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingReqs ? (
            <LoadingState rows={3} variant="table" />
          ) : myRequests.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No requests yet" description="Requests you submit from the Asset Store will appear here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Request Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myRequests.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.asset_store_items?.name ?? "—"}</TableCell>
                    <TableCell>{r.asset_store_items?.asset_categories?.name ?? "—"}</TableCell>
                    <TableCell>{new Date(r.request_date).toLocaleDateString()}</TableCell>
                    <TableCell className="max-w-[240px] truncate" title={r.reason ?? ""}>{r.reason ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={r.priority === "high" ? "destructive" : r.priority === "medium" ? "default" : "secondary"}>
                        {String(r.priority).charAt(0).toUpperCase() + String(r.priority).slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
