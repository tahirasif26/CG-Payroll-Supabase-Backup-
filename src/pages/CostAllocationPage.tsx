import { PageHeader } from "@/components/PageHeader";
import { useCostAllocations } from "@/hooks/queries/useProjects";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

export default function CostAllocationPage() {
  const { data: allocations = [], isLoading } = useCostAllocations();
  // Active employees only
  const filtered = allocations.filter((ca: any) => ca.employees?.status === "active");

  return (
    <div className="space-y-6">
      <PageHeader title="Cost Allocation" description="Track employee time and cost allocation across projects." />

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Employee</TableHead>
              <TableHead className="font-semibold">Project Code</TableHead>
              <TableHead className="font-semibold">Project Name</TableHead>
              <TableHead className="font-semibold">Period</TableHead>
              <TableHead className="font-semibold">Allocation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((ca: any) => (
              <TableRow key={ca.id}>
                <TableCell className="font-medium">{ca.employees?.first_name} {ca.employees?.last_name}</TableCell>
                <TableCell className="font-mono text-sm">{ca.projects?.code || "—"}</TableCell>
                <TableCell>{ca.projects?.name || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{ca.month} {ca.year}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3 min-w-[140px]">
                    <Progress value={Number(ca.allocation)} className="h-2 flex-1" />
                    <span className="text-sm font-semibold w-10 text-right">{Number(ca.allocation)}%</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  {isLoading ? "Loading…" : "No cost allocations recorded yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
