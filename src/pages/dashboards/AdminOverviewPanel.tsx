import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Users, DollarSign, Receipt, Calendar, Package, Clock, ArrowRight,
  Wallet, TrendingUp, FileText, Shield, BarChart3, Briefcase,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
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
  const { clientId, hasPeopleFeature, profile } = useRole();

  // Feature flags — drive what loads & what shows
  const showEmployees = hasPeopleFeature("employees.view_directory");
  const showLeave = hasPeopleFeature("leave.approve") || hasPeopleFeature("leave.view_balance");
  const showExpenses = hasPeopleFeature("expenses.approve") || hasPeopleFeature("expenses.view_all");
  const showAdvances = hasPeopleFeature("advances.approve");
  const showLoans = hasPeopleFeature("loans.approve") || hasPeopleFeature("loans.view_all");
  const showAssets = hasPeopleFeature("assets.approve_requests") || hasPeopleFeature("assets.view_inventory");
  const showPayroll = hasPeopleFeature("payroll.view_all_runs") || hasPeopleFeature("payroll.create_run");
  const showPolicies = hasPeopleFeature("policies.view");
  const showPerformance = hasPeopleFeature("performance.calibration") || hasPeopleFeature("performance.manager_assessment");
  const showReports = hasPeopleFeature("reports.view");
  const showAudit = hasPeopleFeature("audit.view");

  const { data: metrics, isLoading } = useQuery({
    queryKey: [
      "admin-overview", clientId,
      { showEmployees, showLeave, showExpenses, showAdvances, showLoans, showAssets, showPayroll },
    ],
    enabled: !!clientId,
    queryFn: async () => {
      const cid = clientId!;
      const noop = Promise.resolve({ count: 0, data: null });

      const [employees, pendingExpenses, pendingLeave, pendingAssets, pendingAdvances, pendingLoans, latestPayroll] = await Promise.all([
        showEmployees
          ? supabase.from("employees").select("id", { count: "exact", head: true }).eq("client_id", cid).eq("status", "active")
          : noop,
        showExpenses
          ? supabase.from("expenses").select("id", { count: "exact", head: true }).eq("client_id", cid).eq("status", "pending")
          : noop,
        showLeave
          ? supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("client_id", cid).eq("status", "pending")
          : noop,
        showAssets
          ? supabase.from("asset_requests").select("id", { count: "exact", head: true }).eq("client_id", cid).eq("status", "pending")
          : noop,
        showAdvances
          ? (supabase as any).from("advances").select("id", { count: "exact", head: true }).eq("client_id", cid).eq("status", "pending")
          : noop,
        showLoans
          ? supabase.from("loans").select("id", { count: "exact", head: true }).eq("client_id", cid).eq("status", "pending")
          : noop,
        showPayroll
          ? supabase.from("payroll_runs").select("id, month, year, status").eq("client_id", cid).order("created_at", { ascending: false }).limit(1).maybeSingle()
          : noop,
      ]);

      return {
        employeeCount: (employees as any).count ?? 0,
        pendingExpensesCount: (pendingExpenses as any).count ?? 0,
        pendingLeaveCount: (pendingLeave as any).count ?? 0,
        pendingAssetsCount: (pendingAssets as any).count ?? 0,
        pendingAdvancesCount: (pendingAdvances as any).count ?? 0,
        pendingLoansCount: (pendingLoans as any).count ?? 0,
        latestPayroll: (latestPayroll as any).data ?? null,
      };
    },
  });

  // Build tile list dynamically from enabled features
  const tiles: Array<{
    key: string; icon: any; label: string; value: any; accent: any; href: string;
  }> = [];

  if (showEmployees) tiles.push({ key: "emp", icon: Users, label: "Active Employees", value: metrics?.employeeCount, accent: "blue", href: "/employees" });
  if (showLeave) tiles.push({ key: "leave", icon: Clock, label: "Pending Leave", value: metrics?.pendingLeaveCount, accent: "amber", href: "/leave" });
  if (showExpenses) tiles.push({ key: "exp", icon: Receipt, label: "Pending Expenses", value: metrics?.pendingExpensesCount, accent: "purple", href: "/expenses" });
  if (showAdvances) tiles.push({ key: "adv", icon: Wallet, label: "Pending Advances", value: metrics?.pendingAdvancesCount, accent: "amber", href: "/advances" });
  if (showLoans) tiles.push({ key: "loan", icon: TrendingUp, label: "Pending Loans", value: metrics?.pendingLoansCount, accent: "purple", href: "/loans" });
  if (showAssets) tiles.push({ key: "ast", icon: Package, label: "Asset Requests", value: metrics?.pendingAssetsCount, accent: "teal", href: "/assets/requests" });
  if (showPayroll) tiles.push({
    key: "pay", icon: DollarSign, label: "Latest Payroll",
    value: metrics?.latestPayroll ? `${getMonthName(metrics.latestPayroll.month).slice(0, 3)} ${metrics.latestPayroll.year}` : "—",
    accent: "emerald", href: "/payroll",
  });

  // Quick actions, also feature-gated
  const quickActions: Array<{ label: string; href: string }> = [];
  if (hasPeopleFeature("employees.add")) quickActions.push({ label: "Add Employee", href: "/employees" });
  if (hasPeopleFeature("payroll.create_run")) quickActions.push({ label: "Run Payroll", href: "/payroll" });
  if (hasPeopleFeature("expenses.approve")) quickActions.push({ label: "Review Expenses", href: "/expenses" });
  if (hasPeopleFeature("leave.approve")) quickActions.push({ label: "Approve Leave", href: "/leave" });
  if (showReports) quickActions.push({ label: "Reports", href: "/reports" });
  if (showAudit) quickActions.push({ label: "Audit Trail", href: "/audit-trail" });
  if (showPolicies) quickActions.push({ label: "Policies", href: "/policies" });
  if (showPerformance) quickActions.push({ label: "Performance", href: "/performance/manager-assessment" });
  quickActions.push({ label: "Settings", href: "/settings/company" });

  const firstName = profile?.full_name?.split(" ")[0] ?? "";
  const nothingEnabled = tiles.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          {firstName ? `Welcome back, ${firstName}` : "Overview"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Your workspace at a glance — only the modules you have access to.
        </p>
      </div>

      {nothingEnabled ? (
        <EmptyState
          icon={Shield}
          title="No people-level modules enabled"
          description="Ask your administrator to grant you access to one or more modules to see company-wide metrics here."
        />
      ) : (
        <div className={cn(
          "grid gap-3",
          tiles.length <= 2 ? "grid-cols-1 sm:grid-cols-2" :
          tiles.length === 3 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" :
          tiles.length === 4 ? "grid-cols-2 lg:grid-cols-4" :
          "grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
        )}>
          {tiles.map((t) => (
            <MetricTile key={t.key} icon={t.icon} label={t.label} value={t.value} accent={t.accent} href={t.href} loading={isLoading} />
          ))}
        </div>
      )}

      {showPayroll && (
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
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {showReports && (
          <ShortcutCard
            icon={BarChart3}
            title="Reports & Exports"
            description="Headcount, payroll register, leave balances — export to Excel/PDF."
            href="/reports"
          />
        )}
        {showAudit && (
          <ShortcutCard
            icon={FileText}
            title="Audit Trail"
            description="See who changed what and when across the system."
            href="/audit-trail"
          />
        )}
        {showPerformance && (
          <ShortcutCard
            icon={Briefcase}
            title="Performance"
            description="Run reviews, calibrate ratings, manage cycles."
            href="/performance/manager-assessment"
          />
        )}
        {showPolicies && (
          <ShortcutCard
            icon={Shield}
            title="Company Policies"
            description="Distribute policies and track acknowledgements."
            href="/policies"
          />
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((a) => (
              <Button asChild key={a.href + a.label} variant="outline" size="sm">
                <Link to={a.href}>{a.label}</Link>
              </Button>
            ))}
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

function ShortcutCard({
  icon: Icon, title, description, href,
}: { icon: any; title: string; description: string; href: string }) {
  return (
    <Link to={href} className="block group">
      <Card className="hover:shadow-md transition-shadow h-full">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="p-2 rounded-md bg-muted text-foreground/70 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
        </CardContent>
      </Card>
    </Link>
  );
}
