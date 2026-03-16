import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAssets } from "@/contexts/AssetContext";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Monitor, Laptop, Key, AlertTriangle, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--info))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(210, 40%, 60%)",
  "hsl(280, 40%, 60%)",
];

interface ActiveFilter {
  type: "category" | "status" | "location" | "requestStatus";
  value: string;
  label: string;
}

export default function AssetDashboardPage() {
  const { assets, assetRequests } = useAssets();
  const [activeFilter, setActiveFilter] = useState<ActiveFilter | null>(null);

  const totalAssets = assets.length;
  const assignedAssets = assets.filter(a => a.status === "assigned").length;
  const availableAssets = assets.filter(a => a.status === "available").length;

  const today = new Date();
  const warrantyExpiring = assets.filter(a => {
    if (!a.warrantyExpiry) return false;
    const exp = new Date(a.warrantyExpiry);
    const diff = (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  }).length;

  // Assets by Category
  const categoryMap: Record<string, number> = {};
  assets.forEach(a => { categoryMap[a.category] = (categoryMap[a.category] || 0) + 1; });
  const categoryData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

  // Assets by Location
  const locationMap: Record<string, number> = {};
  assets.forEach(a => { const loc = a.location || "Unspecified"; locationMap[loc] = (locationMap[loc] || 0) + 1; });
  const locationData = Object.entries(locationMap).map(([name, value]) => ({ name, value }));

  // Request Trends (by status)
  const requestData = [
    { name: "Pending", value: assetRequests.filter(r => r.status === "pending").length },
    { name: "Approved", value: assetRequests.filter(r => r.status === "approved").length },
    { name: "Rejected", value: assetRequests.filter(r => r.status === "rejected").length },
  ];

  // Assets by status for pie
  const statusData = [
    { name: "Assigned", value: assignedAssets },
    { name: "Available", value: availableAssets },
    { name: "Retired", value: assets.filter(a => a.status === "retired").length },
  ].filter(d => d.value > 0);

  // Filtered data for the detail table
  const filteredAssets = activeFilter
    ? assets.filter(a => {
        switch (activeFilter.type) {
          case "category": return a.category === activeFilter.value;
          case "status": return a.status === activeFilter.value.toLowerCase();
          case "location": return (a.location || "Unspecified") === activeFilter.value;
          default: return true;
        }
      })
    : [];

  const filteredRequests = activeFilter?.type === "requestStatus"
    ? assetRequests.filter(r => r.status === activeFilter.value.toLowerCase())
    : [];

  const handleChartClick = (type: ActiveFilter["type"], value: string) => {
    if (activeFilter?.type === type && activeFilter?.value === value) {
      setActiveFilter(null);
    } else {
      setActiveFilter({ type, value, label: `${type === "requestStatus" ? "Request Status" : type.charAt(0).toUpperCase() + type.slice(1)}: ${value}` });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Asset Dashboard" description="Overview of all company assets and trends. Click any chart element to filter." />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Assets" value={totalAssets} icon={Monitor} variant="primary" />
        <StatCard title="Assigned" value={assignedAssets} icon={Laptop} variant="info" />
        <StatCard title="Available" value={availableAssets} icon={Key} variant="success" />
        <StatCard title="Warranty Expiring" value={warrantyExpiring} icon={AlertTriangle} variant="warning" />
      </div>

      {/* Active Filter Badge */}
      {activeFilter && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtered by:</span>
          <Badge variant="secondary" className="gap-1.5 pl-3 pr-1.5 py-1">
            {activeFilter.label}
            <Button variant="ghost" size="icon" className="h-4 w-4 hover:bg-transparent" onClick={() => setActiveFilter(null)}>
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets by Category */}
        <Card>
          <CardHeader><CardTitle className="text-base">Assets by Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={categoryData} className="cursor-pointer">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}
                  onClick={(data) => handleChartClick("category", data.name)}
                >
                  {categoryData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={activeFilter?.type === "category" && activeFilter.value === entry.name ? "hsl(var(--primary))" : activeFilter?.type === "category" ? "hsl(var(--primary) / 0.3)" : "hsl(var(--primary))"}
                      className="cursor-pointer transition-opacity"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Assets by Status */}
        <Card>
          <CardHeader><CardTitle className="text-base">Assets by Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  onClick={(_, index) => handleChartClick("status", statusData[index].name)}
                  className="cursor-pointer"
                >
                  {statusData.map((entry, i) => (
                    <Cell
                      key={`cell-${i}`}
                      fill={COLORS[i % COLORS.length]}
                      opacity={activeFilter?.type === "status" && activeFilter.value !== entry.name ? 0.3 : 1}
                      className="cursor-pointer"
                    />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Assets by Location */}
        <Card>
          <CardHeader><CardTitle className="text-base">Assets by Location</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={locationData} layout="vertical" className="cursor-pointer">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={120} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Bar dataKey="value" fill="hsl(var(--info))" radius={[0, 4, 4, 0]}
                  onClick={(data) => handleChartClick("location", data.name)}
                >
                  {locationData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={activeFilter?.type === "location" && activeFilter.value === entry.name ? "hsl(var(--info))" : activeFilter?.type === "location" ? "hsl(var(--info) / 0.3)" : "hsl(var(--info))"}
                      className="cursor-pointer"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Request Trends */}
        <Card>
          <CardHeader><CardTitle className="text-base">Request Trends</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={requestData} className="cursor-pointer">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}
                  onClick={(data) => handleChartClick("requestStatus", data.name)}
                >
                  {requestData.map((entry, i) => {
                    const baseColor = i === 0 ? "hsl(var(--warning))" : i === 1 ? "hsl(var(--success))" : "hsl(var(--destructive))";
                    return (
                      <Cell
                        key={`cell-${i}`}
                        fill={baseColor}
                        opacity={activeFilter?.type === "requestStatus" && activeFilter.value !== entry.name ? 0.3 : 1}
                        className="cursor-pointer"
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filtered Detail Table */}
      {activeFilter && (filteredAssets.length > 0 || filteredRequests.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Filtered Results
              <Badge variant="outline" className="text-xs">{activeFilter.type === "requestStatus" ? filteredRequests.length : filteredAssets.length} items</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {activeFilter.type !== "requestStatus" ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Asset Tag</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Assigned To</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAssets.map(a => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono text-xs">{a.assetTag}</TableCell>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell>{a.category}</TableCell>
                        <TableCell>
                          <Badge variant={a.status === "assigned" ? "default" : a.status === "available" ? "secondary" : "outline"} className="text-xs capitalize">
                            {a.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{a.location || "—"}</TableCell>
                        <TableCell>{a.assignedEmployee || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Employee</TableHead>
                      <TableHead>Asset Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Request Date</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.employeeName}</TableCell>
                        <TableCell>{r.assetType}</TableCell>
                        <TableCell>
                          <Badge variant={r.status === "approved" ? "default" : r.status === "pending" ? "secondary" : "destructive"} className="text-xs capitalize">
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{r.requestDate}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{r.notes || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
