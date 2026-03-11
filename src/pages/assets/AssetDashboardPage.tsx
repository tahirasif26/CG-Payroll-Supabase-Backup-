import { PageHeader } from "@/components/PageHeader";
import { useAssets } from "@/contexts/AssetContext";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Monitor, Laptop, Key, Wrench, AlertTriangle, ShieldCheck } from "lucide-react";
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

export default function AssetDashboardPage() {
  const { assets, assetRequests } = useAssets();

  const totalAssets = assets.length;
  const assignedAssets = assets.filter(a => a.status === "assigned").length;
  const availableAssets = assets.filter(a => a.status === "available").length;
  const maintenanceAssets = assets.filter(a => a.status === "maintenance").length;

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
    { name: "Maintenance", value: maintenanceAssets },
    { name: "Retired", value: assets.filter(a => a.status === "retired").length },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Asset Dashboard" description="Overview of all company assets and trends." />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Assets" value={totalAssets} icon={Monitor} variant="primary" />
        <StatCard title="Assigned" value={assignedAssets} icon={Laptop} variant="info" />
        <StatCard title="Available" value={availableAssets} icon={Key} variant="success" />
        <StatCard title="Maintenance" value={maintenanceAssets} icon={Wrench} variant="warning" />
        <StatCard title="Warranty Expiring" value={warrantyExpiring} icon={AlertTriangle} variant="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets by Category */}
        <Card>
          <CardHeader><CardTitle className="text-base">Assets by Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
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
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {statusData.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
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
              <BarChart data={locationData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={120} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Bar dataKey="value" fill="hsl(var(--info))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Request Trends */}
        <Card>
          <CardHeader><CardTitle className="text-base">Request Trends</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={requestData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {requestData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={i === 0 ? "hsl(var(--warning))" : i === 1 ? "hsl(var(--success))" : "hsl(var(--destructive))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
