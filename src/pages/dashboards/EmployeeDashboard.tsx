import { Calendar, DollarSign, Receipt, Package, Plus, Clock, FileText, Gift, Megaphone, Award, FileWarning, Download, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useRole } from "@/contexts/RoleContext";
import { leaveRequests, expenses, getUpcomingBirthdays } from "@/data/mockData";
import { usePayrollRuns } from "@/hooks/queries/usePayroll";
import { useEmployees as useEmployeesCtx } from "@/contexts/EmployeeContext";
import { useActiveEmployees } from "@/hooks/useActiveEmployees";
import { MetricCard } from "@/components/dashboards/MetricCard";
import { DashboardSection } from "@/components/dashboards/DashboardSection";
import { QuickActionButton } from "@/components/dashboards/QuickActionButton";

// TODO: replace with React Query in Prompt 2 (data currently from mockData contexts)

export default function EmployeeDashboard() {
  const { employees } = useEmployeesCtx();
  const { profile, hasFeature, currentEmployeeId } = useRole();
  const activeEmps = useActiveEmployees();
  const emp = employees.find((e) => e.id === currentEmployeeId);

  const firstName = (profile?.full_name?.split(" ")[0]) ?? emp?.firstName ?? "there";
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const myLeaves = leaveRequests.filter((l) => l.employeeId === currentEmployeeId);
  const upcomingLeaves = myLeaves.filter((l) => l.status === "approved" || l.status === "pending").slice(0, 3);
  const myExpenses = expenses.filter((e) => e.employeeId === currentEmployeeId);
  const pendingExpenses = myExpenses.filter((e) => e.status === "pending");
  const { data: payrollRuns = [] } = usePayrollRuns({ status: "completed" });
  const lastPayslip = payrollRuns[0];
  const recentPayslips = payrollRuns.slice(0, 3);
  const birthdays = getUpcomingBirthdays(activeEmps).slice(0, 5);

  const annualBalance = 21;
  const sickBalance = 10;

  // Profile completion (basic heuristic on mock data)
  const profileCompletion = (() => {
    if (!emp) return 60;
    const fields = [emp.firstName, emp.lastName, emp.email, emp.phone, emp.dateOfBirth, emp.department];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  })();

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

      {profileCompletion < 100 && (
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
          <MetricCard label="Leave Balance" value={`${annualBalance}d`} sublabel={`Sick: ${sickBalance}d`} icon={Calendar} accent="blue" />
        )}
        {hasFeature("payroll.view_own_payslip") && lastPayslip && (
          <MetricCard label="Latest Payslip" value={`SAR ${(Number(lastPayslip.total_net) || 0).toLocaleString()}`} sublabel={`${lastPayslip.month} ${lastPayslip.year}`} icon={DollarSign} accent="emerald" />
        )}
        {hasFeature("expenses.view_own") && (
          <MetricCard label="My Expenses" value={pendingExpenses.length} sublabel={`${myExpenses.length} total this year`} icon={Receipt} accent="amber" />
        )}
        {hasFeature("assets.view_my_assets") && (
          <MetricCard label="My Assets" value={2} sublabel="Assigned to you" icon={Package} accent="purple" />
        )}
      </div>

      {/* Quick action buttons */}
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
                  {upcomingLeaves.map((l) => (
                    <li key={l.id} className="flex items-center gap-3 p-2.5">
                      <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                        <Calendar className="h-3.5 w-3.5 text-blue-700 dark:text-blue-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium capitalize">{l.type} leave</p>
                        <p className="text-[11px] text-muted-foreground">{l.days} days · {l.startDate}</p>
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
              <ul className="divide-y divide-border/40">
                {recentPayslips.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 p-2.5">
                    <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{p.month} {p.year}</p>
                      <p className="text-[11px] text-muted-foreground">SAR {(Number(p.total_net) || 0).toLocaleString()}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7"><Download className="h-3.5 w-3.5" /></Button>
                  </li>
                ))}
              </ul>
            </CardContent></Card>
          </DashboardSection>
        )}

        {hasFeature("profile.upload_documents") && (
          <DashboardSection title="My Documents">
            <Card><CardContent className="p-2">
              <ul className="divide-y divide-border/40">
                {[
                  { doc: "Passport", expires: "12 months" },
                  { doc: "Visa", expires: "8 months", warn: true },
                  { doc: "Iqama", expires: "3 months", warn: true },
                ].map((d, i) => (
                  <li key={i} className="flex items-center gap-3 p-2.5">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${d.warn ? "bg-amber-100 dark:bg-amber-900/40" : "bg-muted"}`}>
                      <FileWarning className={`h-3.5 w-3.5 ${d.warn ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{d.doc}</p>
                      <p className="text-[11px] text-muted-foreground">Expires in {d.expires}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent></Card>
          </DashboardSection>
        )}

        <DashboardSection title="Holidays This Month">
          <Card><CardContent className="p-2">
            <ul className="divide-y divide-border/40">
              {[
                { name: "Eid al-Fitr Holiday", date: "Apr 21" },
                { name: "National Day Observed", date: "Apr 28" },
              ].map((h, i) => (
                <li key={i} className="flex items-center gap-3 p-2.5">
                  <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0">
                    <Calendar className="h-3.5 w-3.5 text-purple-700 dark:text-purple-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{h.name}</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{h.date}</p>
                </li>
              ))}
            </ul>
          </CardContent></Card>
        </DashboardSection>

        {hasFeature("employees.view_birthdays") && (
          <DashboardSection title="Team Birthdays" viewAllHref="/birthdays">
            <Card><CardContent className="p-2">
              <ul className="divide-y divide-border/40">
                {birthdays.map((b) => (
                  <li key={b.id} className="flex items-center gap-3 p-2.5">
                    <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                      <Gift className="h-3.5 w-3.5 text-amber-700 dark:text-amber-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{b.firstName} {b.lastName}</p>
                      <p className="text-[11px] text-muted-foreground">{b.department}</p>
                    </div>
                    <p className="text-[11px] font-medium">{b.daysUntil === 0 ? "🎉 Today" : `in ${b.daysUntil}d`}</p>
                  </li>
                ))}
              </ul>
            </CardContent></Card>
          </DashboardSection>
        )}
      </div>

      {/* Performance + Company */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {hasFeature("performance.view_own_ratings") && (
          <DashboardSection title="My Performance">
            <Card><CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                  <Award className="h-5 w-5 text-purple-700 dark:text-purple-300" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Latest rating</p>
                  <p className="text-lg font-bold">Exceeds Expectations</p>
                  <p className="text-[11px] text-muted-foreground">2025 H2 cycle</p>
                </div>
              </div>
              <div className="rounded-md border border-amber-200/50 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/40 p-2.5 text-xs">
                <p className="font-semibold">1 self-assessment pending</p>
                <p className="text-muted-foreground">2026 H1 cycle — due in 7 days</p>
              </div>
            </CardContent></Card>
          </DashboardSection>
        )}

        <DashboardSection title="Company Announcements">
          <Card><CardContent className="p-4 text-center text-sm text-muted-foreground">
            <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-30" />
            No announcements right now.
          </CardContent></Card>
        </DashboardSection>

        {hasFeature("policies.view") && (
          <DashboardSection title="Latest Policies" viewAllHref="/company-policies">
            <Card><CardContent className="p-2">
              <ul className="divide-y divide-border/40">
                {[
                  { name: "Code of Conduct", updated: "Updated last week" },
                  { name: "Leave Policy 2026", updated: "Updated 2 weeks ago" },
                  { name: "Travel & Expense Policy", updated: "Updated last month" },
                ].map((p, i) => (
                  <li key={i} className="flex items-center gap-3 p-2.5 hover:bg-muted/30 rounded-md">
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                      <BookOpen className="h-3.5 w-3.5 text-blue-700 dark:text-blue-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">{p.updated}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent></Card>
          </DashboardSection>
        )}
      </div>
    </div>
  );
}
