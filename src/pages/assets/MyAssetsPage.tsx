import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Package } from "lucide-react";
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Assets"
        description="Assets currently assigned to you."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" /> Assigned to me ({myAssets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading assets...
            </div>
          ) : myAssets.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              You don't have any assets assigned right now.
            </div>
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
    </div>
  );
}
