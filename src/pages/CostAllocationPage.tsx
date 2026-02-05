import { PageHeader } from "@/components/PageHeader";
import { costAllocations } from "@/data/mockData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

export default function CostAllocationPage() {
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
            {costAllocations.map((ca) => (
              <TableRow key={ca.id}>
                <TableCell className="font-medium">{ca.employeeName}</TableCell>
                <TableCell className="font-mono text-sm">{ca.projectCode}</TableCell>
                <TableCell>{ca.projectName}</TableCell>
                <TableCell className="text-muted-foreground">{ca.month}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3 min-w-[140px]">
                    <Progress value={ca.allocation} className="h-2 flex-1" />
                    <span className="text-sm font-semibold w-10 text-right">{ca.allocation}%</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
