import { useMemo, useState } from "react";
import { Users, DollarSign, Calendar, TrendingUp, Gift, Clock, X, Briefcase, Receipt, Package, Award, BarChart3, Settings, FileText } from "lucide-react";
import { leaveRequests, expenses, getUpcomingBirthdays } from "@/data/mockData";
import { usePayrollRuns } from "@/hooks/queries/usePayroll";
import { useEmployees as useEmployeesCtx } from "@/contexts/EmployeeContext";
import { useActiveEmployees } from "@/hooks/useActiveEmployees";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge } from "@/components/StatusBadge";
import { useRole } from "@/contexts/RoleContext";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";
import { MetricCard } from "@/components/dashboards/MetricCard";
import { DashboardSection } from "@/components/dashboards/DashboardSection";
import { QuickActionButton } from "@/components/dashboards/QuickActionButton";
import { ActivityFeed } from "@/components/dashboards/ActivityFeed";

// TODO: replace with React Query in Prompt 2 (data currently from mockData contexts)

function getChartColors() {
  const style = getComputedStyle(document.documentElement);
  return [
    `hsl(${style.getPropertyValue("--primary").trim()})`,
    `hsl(${style.getPropertyValue("--chart-2").trim()})`,
    `hsl(${style.getPropertyValue("--chart-3").trim()})`,
    `hsl(${style.getPropertyValue("--chart-4").trim()})`,
    `hsl(${style.getPropertyValue("--chart-5").trim()})`,
  ];
}

export default function AdminDashboard() {
  const { employees } = useEmployeesCtx();
  const { profile } = useRole();
  const CHART_COLORS = useMemo(() => getChartColors(), []);
  const activeEmps = useActiveEmployees();
  const { data: payrollRuns = [] } = usePayrollRuns();
  const lastPayroll = payrollRuns.find((p) => p.status === "completed");
  const pendingLeaves = leaveRequests.filter((l) => l.status === "pending").length;
  const pendingExpenses = expenses.filter((e) => e.status === "pending");
  const pendingApprovals = pendingLeaves + pendingExpenses.length;
  const birthdays = getUpcomingBirthdays(activeEmps).slice(0, 5);

  const monthPayrollTotal = payrollRuns.filter((p) => p.status === "completed").reduce((s, p) => s + (Number(p.total_net) || 0), 0);
  const newHires = activeEmps.filter((e) => {
    const d = new Date(e.joiningDate);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const departments = ["Assurance", "Tax", "Advisory", "Strategy", "Technology"];
  const deptData = departments.map((dept) => ({
    name: dept,
    count: activeEmps.filter((e) => e.department === dept).length,
  })).filter((d) => d.count > 0);

  // Headcount trend (placeholder)
  const headcountTrend = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"].map((m, i) => ({
    month: m,
    headcount: Math.max(0, activeEmps.length - (5 - i) * 3),
  }));

  // Payroll trend (placeholder)
  const payrollTrend = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"].map((m) => ({
    month: m,
    cost: Math.round((Number(lastPayroll?.total_net) || 100000) * (0.85 + Math.random() * 0.3)),
  }));

  const statusData = [
    { name: "Active", value: activeEmps.filter((e) => e.status === "active").length },
    { name: "On Leave", value: activeEmps.filter((e) => e.status === "on-leave").length },
    { name: "Inactive", value: activeEmps.filter((e) => e.status === "inactive").length },
  ].filter((d) => d.value > 0);

  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const statusValueMap: Record<string, string> = { Active: "active", "On Leave": "on-leave", Inactive: "inactive" };
  const displayEmps = statusFilter ? activeEmps.filter((e) => e.status === statusValueMap[statusFilter]) : null;

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome, {firstName}</h1>
        <p className="text-sm text-muted-foreground mt-1">Here's how your organisation is doing today.</p>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Employees" value={activeEmps.length} sublabel={`${newHires} new this month`} icon={Users} accent="purple" />
        <MetricCard label="Active Payroll Runs" value={payrollRuns.filter((p) => p.status !== "completed").length} sublabel="Draft / processing" icon={DollarSign} accent="blue" />
        <MetricCard label="Pending Approvals" value={pendingApprovals} sublabel={`${pendingLeaves} leave · ${pendingExpenses.length} expense`} icon={Clock} accent="amber" />
        <MetricCard label="This Month Payroll" value={`SAR ${monthPayrollTotal.toLocaleString()}`} sublabel="Completed runs" icon={TrendingUp} accent="emerald" />
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3">
          <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">New Hires</p>
          <p className="text-xl font-bold mt-1">{newHires}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Probation Ending</p>
          <p className="text-xl font-bold mt-1">3</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Birthdays This Week</p>
          <p className="text-xl font-bold mt-1">{birthdays.filter((b) => b.daysUntil <= 7).length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Doc Expiries (60d)</p>
          <p className="text-xl font-bold mt-1">5</p>
        </CardContent></Card>
      </div>

      {/* Module shortcuts */}
      <DashboardSection title="Modules">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickActionButton icon={Users} label="Employees" description={`${activeEmps.length} active`} to="/employees" accent="purple" />
          <QuickActionButton icon={DollarSign} label="Payroll" description={`${payrollRuns.length} runs`} to="/payroll" accent="emerald" />
          <QuickActionButton icon={Receipt} label="Expenses" description={`${pendingExpenses.length} pending`} to="/expenses" accent="amber" />
          <QuickActionButton icon={Calendar} label="Leave" description={`${pendingLeaves} pending`} to="/leave" accent="blue" />
          <QuickActionButton icon={Package} label="Assets" to="/assets/dashboard" accent="rose" />
          <QuickActionButton icon={Award} label="Performance" to="/performance/ratings" accent="purple" />
          <QuickActionButton icon={BarChart3} label="Analytics" to="/analytics" accent="primary" />
          <QuickActionButton icon={Settings} label="Settings" to="/settings/company" accent="primary" />
        </div>
      </DashboardSection>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Headcount Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={headcountTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Line type="monotone" dataKey="headcount" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Payroll Cost (6 mo)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={payrollTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="cost" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              Employee Status
              {statusFilter && (
                <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-0.5 text-xs">
                  {statusFilter}
                  <Button variant="ghost" size="icon" className="h-3.5 w-3.5 hover:bg-transparent" onClick={() => setStatusFilter(null)}>
                    <X className="h-2.5 w-2.5" />
                  </Button>
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}
                    onClick={(_, i) => setStatusFilter((p) => p === statusData[i]?.name ? null : statusData[i]?.name)}
                    className="cursor-pointer">
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]}
                        opacity={statusFilter && statusFilter !== entry.name ? 0.3 : 1} className="cursor-pointer" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {displayEmps && displayEmps.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              {statusFilter} Employees <Badge variant="outline">{displayEmps.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader><TableRow className="bg-muted/50">
                  <TableHead>Name</TableHead><TableHead>Department</TableHead><TableHead>Designation</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {displayEmps.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.firstName} {emp.lastName}</TableCell>
                      <TableCell>{emp.department}</TableCell>
                      <TableCell>{emp.designation}</TableCell>
                      <TableCell><StatusBadge status={emp.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DashboardSection title="Latest Joiners" viewAllHref="/employees">
          <Card><CardContent className="p-2">
            <ul className="divide-y divide-border/40">
              {[...activeEmps].sort((a, b) => new Date(b.joiningDate).getTime() - new Date(a.joiningDate).getTime()).slice(0, 5).map((emp) => (
                <li key={emp.id} className="flex items-center gap-3 p-2.5 hover:bg-muted/30 rounded-md">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">{emp.firstName[0]}{emp.lastName[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{emp.firstName} {emp.lastName}</p>
                    <p className="text-[11px] text-muted-foreground">{emp.department}</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{new Date(emp.joiningDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                </li>
              ))}
            </ul>
          </CardContent></Card>
        </DashboardSection>

        <DashboardSection title="Upcoming Birthdays" viewAllHref="/birthdays">
          <Card><CardContent className="p-2">
            <ul className="divide-y divide-border/40">
              {birthdays.map((emp) => (
                <li key={emp.id} className="flex items-center gap-3 p-2.5 hover:bg-muted/30 rounded-md">
                  <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                    <Gift className="h-3.5 w-3.5 text-amber-700 dark:text-amber-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{emp.firstName} {emp.lastName}</p>
                    <p className="text-[11px] text-muted-foreground">{emp.department}</p>
                  </div>
                  <p className="text-[11px] font-medium">{emp.daysUntil === 0 ? "Today!" : `in ${emp.daysUntil}d`}</p>
                </li>
              ))}
            </ul>
          </CardContent></Card>
        </DashboardSection>

        <DashboardSection title="Recent Activity">
          <ActivityFeed emptyMessage="Activity logging will appear here once enabled." />
        </DashboardSection>
      </div>
    </div>
  );
}
