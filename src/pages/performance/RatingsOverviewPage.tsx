import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { employees } from "@/data/mockData";
import { Search, Filter } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EmployeeRating {
  employeeId: string;
  cycle: string;
  selfRating: string;
  peerRating: string;
  managerRating: string;
  calibratedRating: string;
  finalRating: string;
}

const ratingColors: Record<string, string> = {
  outstanding: "bg-success/10 text-success",
  exceeds: "bg-info/10 text-info",
  meets: "bg-primary/10 text-primary",
  below: "bg-warning/10 text-warning",
  unsatisfactory: "bg-destructive/10 text-destructive",
};

const mockRatings: EmployeeRating[] = [
  { employeeId: "1", cycle: "2025-H1", selfRating: "exceeds", peerRating: "exceeds", managerRating: "exceeds", calibratedRating: "exceeds", finalRating: "exceeds" },
  { employeeId: "2", cycle: "2025-H1", selfRating: "meets", peerRating: "meets", managerRating: "meets", calibratedRating: "meets", finalRating: "meets" },
  { employeeId: "3", cycle: "2025-H1", selfRating: "", peerRating: "", managerRating: "meets", calibratedRating: "below", finalRating: "" },
  { employeeId: "4", cycle: "2025-H1", selfRating: "outstanding", peerRating: "outstanding", managerRating: "outstanding", calibratedRating: "exceeds", finalRating: "exceeds" },
  { employeeId: "5", cycle: "2025-H1", selfRating: "", peerRating: "", managerRating: "meets", calibratedRating: "", finalRating: "" },
  { employeeId: "8", cycle: "2025-H1", selfRating: "exceeds", peerRating: "meets", managerRating: "exceeds", calibratedRating: "exceeds", finalRating: "exceeds" },
];

function RatingBadge({ rating }: { rating: string }) {
  if (!rating) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold capitalize ${ratingColors[rating] || "bg-muted text-muted-foreground"}`}>
      {rating}
    </span>
  );
}

export default function RatingsOverviewPage() {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const departments = Array.from(new Set(employees.map(e => e.department)));

  const getEmp = (id: string) => employees.find(e => e.id === id);

  const filtered = mockRatings.filter(r => {
    const emp = getEmp(r.employeeId);
    if (!emp) return false;
    const q = search.toLowerCase();
    const matchSearch = !q || `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q);
    const matchDept = deptFilter === "all" || emp.department === deptFilter;
    return matchSearch && matchDept;
  });

  // Distribution stats
  const distribution = mockRatings.reduce((acc, r) => {
    if (r.finalRating) acc[r.finalRating] = (acc[r.finalRating] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <PageHeader title="Ratings Overview" description="Consolidated view of all performance ratings across assessment types." />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {["outstanding", "exceeds", "meets", "below", "unsatisfactory"].map(r => (
          <Card key={r}>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground capitalize">{r === "exceeds" ? "Exceeds Exp." : r === "below" ? "Below Exp." : r}</p>
              <p className="text-2xl font-bold">{distribution[r] || 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-[160px] h-9"><Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Self</TableHead>
                <TableHead>Peer</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Calibrated</TableHead>
                <TableHead>Final</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(r => {
                const emp = getEmp(r.employeeId);
                if (!emp) return null;
                return (
                  <TableRow key={r.employeeId}>
                    <TableCell><p className="text-sm font-medium">{emp.firstName} {emp.lastName}</p><p className="text-xs text-muted-foreground">{emp.designation}</p></TableCell>
                    <TableCell className="text-sm">{emp.department}</TableCell>
                    <TableCell><RatingBadge rating={r.selfRating} /></TableCell>
                    <TableCell><RatingBadge rating={r.peerRating} /></TableCell>
                    <TableCell><RatingBadge rating={r.managerRating} /></TableCell>
                    <TableCell><RatingBadge rating={r.calibratedRating} /></TableCell>
                    <TableCell><RatingBadge rating={r.finalRating} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>
    </div>
  );
}
