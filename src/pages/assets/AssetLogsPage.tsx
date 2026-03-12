import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAssets } from "@/contexts/AssetContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/StatCard";

const activityColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  "Asset Created": "outline",
  "Assigned": "default",
  "Reassigned": "default",
  "Returned": "secondary",
  "Condition Updated": "secondary",
  "Maintenance Recorded": "secondary",
  "Audit Verified": "outline",
  "Asset Retired": "destructive",
  "QR Verified": "default",
  "QR Assignment": "default",
  "QR Audit Verification": "outline",
  "QR Issue Reported": "destructive",
};

export default function AssetLogsPage() {
  const { assetLogs } = useAssets();
  const [search, setSearch] = useState("");
  const [filterActivity, setFilterActivity] = useState("all");

  const activities = [...new Set(assetLogs.map(l => l.activity))];

  const filteredLogs = assetLogs.filter(log => {
    const q = search.toLowerCase();
    const matchSearch = !q || log.assetName.toLowerCase().includes(q) || log.assetTag.toLowerCase().includes(q) || (log.employeeName || "").toLowerCase().includes(q) || log.activity.toLowerCase().includes(q);
    const matchActivity = filterActivity === "all" || log.activity === filterActivity;
    return matchSearch && matchActivity;
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Asset Logs" description="Track all asset activity and changes." />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard title="Total Log Entries" value={assetLogs.length} icon={Activity} variant="primary" />
        <StatCard title="Activity Types" value={activities.length} icon={Activity} variant="info" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by asset, tag, employee..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterActivity} onValueChange={setFilterActivity}>
          <SelectTrigger className="w-[200px]"><Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" /><SelectValue placeholder="Activity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Activities</SelectItem>
            {activities.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Asset Tag</TableHead>
              <TableHead className="font-semibold">Asset Name</TableHead>
              <TableHead className="font-semibold">Activity</TableHead>
              <TableHead className="font-semibold">Employee</TableHead>
              <TableHead className="font-semibold">Performed By</TableHead>
              <TableHead className="font-semibold">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length > 0 ? filteredLogs.map(log => (
              <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="text-sm">{new Date(log.date).toLocaleDateString()}</TableCell>
                <TableCell className="font-mono text-xs">{log.assetTag}</TableCell>
                <TableCell className="font-medium">{log.assetName}</TableCell>
                <TableCell><Badge variant={activityColors[log.activity] || "secondary"}>{log.activity}</Badge></TableCell>
                <TableCell>{log.employeeName || "—"}</TableCell>
                <TableCell className="text-sm">{log.performedBy}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={log.details}>{log.details}</TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No log entries found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
