import { PageHeader } from "@/components/PageHeader";
import { useRole } from "@/contexts/RoleContext";
import { assets } from "@/data/mockData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Monitor, Laptop, Smartphone, Key } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { StatCard } from "@/components/StatCard";

const assetIcons: Record<string, any> = {
  Laptop: Laptop,
  Monitor: Monitor,
  Phone: Smartphone,
};

export default function AssetsPage() {
  const { role, currentEmployeeId } = useRole();
  
  const displayAssets = role === "employee"
    ? assets.filter(a => a.employeeId === currentEmployeeId)
    : assets;

  const totalAssets = displayAssets.length;
  const assignedAssets = displayAssets.filter(a => a.status === "assigned").length;
  const availableAssets = displayAssets.filter(a => a.status === "available").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={role === "employee" ? "My Assets" : "Asset Management"}
        description={role === "employee" ? "Assets assigned to you." : "Track and manage company assets."}
      >
        {role === "employer" && (
          <Button size="sm" className="gradient-ey text-primary-foreground font-semibold">
            <Plus className="h-4 w-4 mr-2" />Add Asset
          </Button>
        )}
      </PageHeader>

      {role === "employer" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Total Assets" value={totalAssets} icon={Monitor} variant="primary" />
          <StatCard title="Assigned" value={assignedAssets} icon={Laptop} variant="info" />
          <StatCard title="Available" value={availableAssets} icon={Key} variant="success" />
        </div>
      )}

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Asset</TableHead>
              <TableHead className="font-semibold">Category</TableHead>
              <TableHead className="font-semibold">Serial No.</TableHead>
              {role === "employer" && <TableHead className="font-semibold">Assigned To</TableHead>}
              <TableHead className="font-semibold">Assigned Date</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayAssets.map(asset => (
              <TableRow key={asset.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-medium">{asset.name}</TableCell>
                <TableCell>{asset.category}</TableCell>
                <TableCell className="font-mono text-sm">{asset.serialNumber}</TableCell>
                {role === "employer" && <TableCell>{asset.employeeName || "—"}</TableCell>}
                <TableCell>{asset.assignedDate ? new Date(asset.assignedDate).toLocaleDateString() : "—"}</TableCell>
                <TableCell><StatusBadge status={asset.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
