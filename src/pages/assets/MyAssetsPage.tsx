import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Package } from "lucide-react";
import { useAssets } from "@/contexts/AssetContext";
import { useRole } from "@/contexts/RoleContext";

export default function MyAssetsPage() {
  const { currentEmployeeId } = useRole();
  const { getAssetsForEmployee } = useAssets();
  const myAssets = currentEmployeeId ? getAssetsForEmployee(currentEmployeeId) : [];

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
          {myAssets.length === 0 ? (
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
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myAssets.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.assetTag ?? a.id}</TableCell>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell>{a.category ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{a.serialNumber ?? "—"}</TableCell>
                    <TableCell>{a.condition ?? "—"}</TableCell>
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
