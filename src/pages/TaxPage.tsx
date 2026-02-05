import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { taxConfigs } from "@/data/mockData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function TaxPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Tax Configuration" description="Manage tax rates and rules.">
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold"><Plus className="h-4 w-4 mr-2" />Add Tax Rule</Button>
      </PageHeader>

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Tax Name</TableHead>
              <TableHead className="font-semibold text-right">Rate (%)</TableHead>
              <TableHead className="font-semibold">Applicable To</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {taxConfigs.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="text-right font-semibold">{t.rate}%</TableCell>
                <TableCell>{t.applicableTo}</TableCell>
                <TableCell><StatusBadge status={t.isActive ? "active" : "inactive"} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
