import { Calendar, DollarSign, Receipt, Package, Plus, Clock, FileText, Gift, Megaphone, FileWarning, Download, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useRole } from "@/contexts/RoleContext";
import { useMyDashboard } from "@/hooks/queries/useMyDashboard";
import { MetricCard } from "@/components/dashboards/MetricCard";
import { DashboardSection } from "@/components/dashboards/DashboardSection";
import { QuickActionButton } from "@/components/dashboards/QuickActionButton";
import { useDownloadPayslip } from "@/hooks/useDownloadPayslip";
import { Loader2 } from "lucide-react";

function fmtMoney(amount: number | null | undefined, currency = "SAR") {
  if (amount == null) return "—";
  return `${currency} ${Number(amount).toLocaleString()}`;
}

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

export default function EmployeeDashboard() {
  const { profile, hasFeature, appRole } = useRole();
  const {
    employee,
    latestPayslip,
    recentPayslips,
    annualLeaveBalance,
    sickLeaveBalance,
    upcomingLeaves,
    expenses,
    pendingExpenseCount,
    assets,
    documents,
    holidays,
    birthdays,
    profileCompletion,
  } = useMyDashboard();
  const { download: downloadPayslip, loading: downloadingKey } = useDownloadPayslip();

  const firstName = employee?.first_name || profile?.full_name?.split(" ")[0] || "there";
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  // Friendly fallback when an admin/HR user doesn't have a matching employees row yet.
  if (!employee && (appRole === "admin" || appRole === "hr")) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center space-y-3">
          <h3 className="text-lg font-semibold">No employee profile yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Your account is set up as <span className="font-medium capitalize">{appRole}</span> but
            doesn't have a matching employee record yet. Add yourself as an employee from the
            Directory to start tracking your payslips, leave balance, expenses and assets here.
          </p>
          <Button asChild size="sm" className="mt-2">
            <a href="/employees">Go to Employees Directory</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const expiringDocs = documents
    .map((d: any) => ({ ...d, daysLeft: daysUntil(d.expiry_date) }))
    .filter((d) => d.daysLeft != null && d.daysLeft <= 180)
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{greeting}, {firstName}!</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </div>

      {employee && profileCompletion < 100 && (
        <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-900/40">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Complete your profile</p>
                <p className="text-[11px] text-muted-foreground mb-2">Add missing details to unlock all features.</p>
                <Progress value={profileCompletion} className="h-1.5" />
              </div>
              <span className="text-sm font-bold tabular-nums">{profileCompletion}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {hasFeature("leave.view_balance") && (
          <MetricCard
            label="Leave Balance"
            value={annualLeaveBalance ? `${annualLeaveBalance.remaining}d` : "—"}
            sublabel={sickLeaveBalance != null ? `Sick: ${sickLeaveBalance}d` : "No allocation yet"}
            icon={Calendar}
            accent="blue"
          />
        )}
        {hasFeature("payroll.view_own_payslip") && (
          <MetricCard
            label="Latest Payslip"
            value={latestPayslip ? fmtMoney((latestPayslip as any).net_pay, (latestPayslip as any).pay_currency) : "—"}
            sublabel={
              latestPayslip && (latestPayslip as any).payroll_runs
                ? `${(latestPayslip as any).payroll_runs.month} ${(latestPayslip as any).payroll_runs.year}`
                : "No payslip yet"
            }
            icon={DollarSign}
            accent="emerald"
          />
        )}
        {hasFeature("expenses.view_own") && (
          <MetricCard
            label="My Expenses"
            value={pendingExpenseCount}
            sublabel={`${expenses.length} total recent`}
            icon={Receipt}
            accent="amber"
          />
        )}
        {hasFeature("assets.view_my_assets") && (
          <MetricCard
            label="My Assets"
            value={assets.length}
            sublabel={assets.length === 0 ? "None assigned" : "Assigned to you"}
            icon={Package}
            accent="purple"
          />
        )}
      </div>

      {/* Quick actions */}
      <DashboardSection title="Quick Actions">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {hasFeature("leave.apply") && <QuickActionButton icon={Plus} label="Apply Leave" to="/leave" accent="blue" />}
          {hasFeature("expenses.submit") && <QuickActionButton icon={Receipt} label="Submit Expense" to="/expenses" accent="amber" />}
          {hasFeature("assets.request_new") && <QuickActionButton icon={Package} label="Request Asset" to="/assets/store" accent="purple" />}
          {hasFeature("timesheets.submit") && <QuickActionButton icon={Clock} label="Submit Timesheet" to="/timesheets" accent="primary" />}
          {hasFeature("payroll.view_own_payslip") && <QuickActionButton icon={FileText} label="View Payslip" to="/payslips" accent="emerald" />}
        </div>
      </DashboardSection>

      {/* Personal sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {hasFeature("leave.view_balance") && (
          <DashboardSection title="My Upcoming Leaves" viewAllHref="/leave">
            <Card><CardContent className="p-2">
              {upcomingLeaves.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No upcoming leaves.</p>
              ) : (
                <ul className="divide-y divide-border/40">
                  {upcomingLeaves.map((l: any) => (
                    <li key={l.id} className="flex items-center gap-3 p-2.5">
                      <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                        <Calendar className="h-3.5 w-3.5 text-blue-700 dark:text-blue-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium capitalize">{l.leave_types?.name ?? "Leave"}</p>
                        <p className="text-[11px] text-muted-foreground">{l.days} days · {l.start_date}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] capitalize">{l.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent></Card>
          </DashboardSection>
        )}

        {hasFeature("payroll.view_own_payslip") && (
          <DashboardSection title="Recent Payslips" viewAllHref="/payslips">
            <Card><CardContent className="p-2">
              {recentPayslips.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No payslips yet — your first one will appear after the next payroll run.
                </p>
              ) : (
                <ul className="divide-y divide-border/40">
                  {recentPayslips.map((p: any) => (
                    <li key={p.id} className="flex items-center gap-3 p-2.5">
                      <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                        <DollarSign className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {p.payroll_runs ? `${p.payroll_runs.month} ${p.payroll_runs.year}` : "Payslip"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{fmtMoney(p.net_pay, p.pay_currency)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={!employee || downloadingKey === `${p.payroll_run_id}:${employee.id}`}
                        onClick={() => employee && downloadPayslip({ payrollRunId: p.payroll_run_id, employeeId: employee.id })}
                      >
                        {downloadingKey === `${p.payroll_run_id}:${employee?.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent></Card>
          </DashboardSection>
        )}

        {hasFeature("expenses.view_own") && (
          <DashboardSection title="Recent Expenses" viewAllHref="/expenses">
            <Card><CardContent className="p-2">
              {expenses.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No expenses submitted yet.</p>
              ) : (
                <ul className="divide-y divide-border/40">
                  {expenses.slice(0, 5).map((e: any) => (
                    <li key={e.id} className="flex items-center gap-3 p-2.5">
                      <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                        <Receipt className="h-3.5 w-3.5 text-amber-700 dark:text-amber-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {e.description || e.expense_categories?.name || "Expense"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {fmtMoney(e.amount, e.currency)} · {e.expense_date}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] capitalize">{e.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent></Card>
          </DashboardSection>
        )}

        {hasFeature("assets.view_my_assets") && (
          <DashboardSection title="My Assets" viewAllHref="/assets/inventory">
            <Card><CardContent className="p-2">
              {assets.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No assets assigned.</p>
              ) : (
                <ul className="divide-y divide-border/40">
                  {assets.slice(0, 5).map((a: any) => (
                    <li key={a.id} className="flex items-center gap-3 p-2.5">
                      <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0">
                        <Package className="h-3.5 w-3.5 text-purple-700 dark:text-purple-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{a.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {a.asset_tag} · {a.asset_categories?.name ?? "Uncategorised"}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] capitalize">{a.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent></Card>
          </DashboardSection>
        )}

        {hasFeature("profile.upload_documents") && expiringDocs.length > 0 && (
          <DashboardSection title="Document Expiry">
            <Card><CardContent className="p-2">
              <ul className="divide-y divide-border/40">
                {expiringDocs.map((d) => {
                  const warn = (d.daysLeft ?? 999) <= 90;
                  return (
                    <li key={d.id} className="flex items-center gap-3 p-2.5">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${warn ? "bg-amber-100 dark:bg-amber-900/40" : "bg-muted"}`}>
                        <FileWarning className={`h-3.5 w-3.5 ${warn ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{d.doc_type}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {d.daysLeft! < 0 ? "Expired" : `Expires in ${d.daysLeft} days`}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent></Card>
          </DashboardSection>
        )}

        <DashboardSection title="Upcoming Holidays">
          <Card><CardContent className="p-2">
            {holidays.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No upcoming holidays.</p>
            ) : (
              <ul className="divide-y divide-border/40">
                {holidays.map((h: any) => (
                  <li key={h.id} className="flex items-center gap-3 p-2.5">
                    <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0">
                      <Calendar className="h-3.5 w-3.5 text-purple-700 dark:text-purple-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{h.name}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(h.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent></Card>
        </DashboardSection>

        {hasFeature("employees.view_birthdays") && (
          <DashboardSection title="Team Birthdays" viewAllHref="/birthdays">
            <Card><CardContent className="p-2">
              {birthdays.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No birthdays in the next 30 days.</p>
              ) : (
                <ul className="divide-y divide-border/40">
                  {birthdays.map((b: any) => (
                    <li key={b.id} className="flex items-center gap-3 p-2.5">
                      <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                        <Gift className="h-3.5 w-3.5 text-amber-700 dark:text-amber-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{b.first_name} {b.last_name}</p>
                        <p className="text-[11px] text-muted-foreground">{b.department ?? ""}</p>
                      </div>
                      <p className="text-[11px] font-medium">{b.daysUntil === 0 ? "🎉 Today" : `in ${b.daysUntil}d`}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent></Card>
          </DashboardSection>
        )}

        {hasFeature("policies.view") && (
          <DashboardSection title="Company Policies" viewAllHref="/company-policies">
            <Card><CardContent className="p-4 text-center text-sm text-muted-foreground">
              <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
              View all company policies
            </CardContent></Card>
          </DashboardSection>
        )}

        <DashboardSection title="Company Announcements">
          <Card><CardContent className="p-4 text-center text-sm text-muted-foreground">
            <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-30" />
            No announcements right now.
          </CardContent></Card>
        </DashboardSection>
      </div>
    </div>
  );
}
