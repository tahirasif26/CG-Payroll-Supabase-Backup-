import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Users, DollarSign, Receipt, Calendar, Package, Clock, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getMonthName(m: number | string | null | undefined): string {
  if (m == null) return "";
  const n = typeof m === "string" ? parseInt(m, 10) : m;
  if (Number.isNaN(n)) return String(m);
  return MONTHS[(n - 1) % 12] || String(n);
}

export default function AdminOverviewPanel() {
  const { clientId } = useRole();

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["admin-overview", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const [employees, pendingExpenses, pendingLeave, pendingAssets, latestPayroll] = await Promise.all([
        supabase.from("employees").select("id", { count: "exact", head: true }).eq("client_id", clientId!).eq("status", "active"),
        supabase.from("expenses").select("id", { count: "exact", head: true }).eq("client_id", clientId!).eq("status", "pending"),
        supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("client_id", clientId!).eq("status", "pending"),
        supabase.from("asset_requests").select("id", { count: "exact", head: true }).eq("client_id", clientId!).eq("status", "pending"),
        supabase.from("payroll_runs").select("id, month, year, status").eq("client_id", clientId!).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);

      return {
        employeeCount: employees.count ?? 0,
        pendingExpensesCount: pendingExpenses.count ?? 0,
        pendingLeaveCount: pendingLeave.count ?? 0,
        pendingAssetsCount: pendingAssets.count ?? 0,
        latestPayroll: latestPayroll.data ?? null,
      };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Admin Overview</h2>
        <p className="text-sm text-muted-foreground mt-1">Company-wide metrics and pending actions.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <MetricTile icon={Users} label="Active Employees" value={metrics?.employeeCount} accent="blue" href="/employees" loading={isLoading} />
        <MetricTile icon={Clock} label="Pending Leave" value={metrics?.pendingLeaveCount} accent="amber" href="/leave" loading={isLoading} />
        <MetricTile icon={Receipt} label="Pending Expenses" value={metrics?.pendingExpensesCount} accent="purple" href="/expenses" loading={isLoading} />
        <MetricTile icon={Package} label="Asset Requests" value={metrics?.pendingAssetsCount} accent="teal" href="/assets/requests" loading={isLoading} />
        <MetricTile icon={DollarSign} label="Latest Payroll" value={metrics?.latestPayroll ? `${getMonthName(metrics.latestPayroll.month).slice(0, 3)} ${metrics.latestPayroll.year}` : "—"} accent="emerald" href="/payroll" loading={isLoading} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Latest Payroll Run
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : metrics?.latestPayroll ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-semibold">
                  {getMonthName(metrics.latestPayroll.month)} {metrics.latestPayroll.year}
                </p>
                <p className="text-xs text-muted-foreground capitalize mt-0.5">
                  Status: {metrics.latestPayroll.status}
                </p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/payroll">
                  View details
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No payroll runs yet.{" "}
              <Link to="/payroll" className="text-primary hover:underline font-medium">
                Create one →
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <QuickAction label="Add Employee" href="/employees" />
            <QuickAction label="Run Payroll" href="/payroll" />
            <QuickAction label="Review Expenses" href="/expenses" />
            <QuickAction label="Approve Leave" href="/leave" />
            <QuickAction label="Settings" href="/settings/company" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricTile({
  icon: Icon, label, value, accent, href, loading,
}: {
  icon: any;
  label: string;
  value: number | string | undefined;
  accent: "blue" | "amber" | "purple" | "teal" | "emerald";
  href: string;
  loading?: boolean;
}) {
  const accentClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
    purple: "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300",
    teal: "bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
  };

  return (
    <Link to={href} className="block">
      <Card className="hover:shadow-md transition-shadow h-full">
        <CardContent className="p-4">
          <div className={cn("inline-flex p-2 rounded-md mb-3", accentClasses[accent])}>
            <Icon className="h-4 w-4" />
          </div>
          {loading ? (
            <Skeleton className="h-7 w-16 mb-1" />
          ) : (
            <p className="text-2xl font-bold tabular-nums">{value ?? "—"}</p>
          )}
          <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mt-1">{label}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function QuickAction({ label, href }: { label: string; href: string }) {
  return (
    <Button asChild variant="outline" size="sm">
      <Link to={href}>{label}</Link>
    </Button>
  );
}
