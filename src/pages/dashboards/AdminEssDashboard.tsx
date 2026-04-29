import { Link } from "react-router-dom";
import { Calendar, DollarSign, Receipt, Package, Plus, FileText, CreditCard, Download, Briefcase, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRole } from "@/contexts/RoleContext";
import { useMyDashboard } from "@/hooks/queries/useMyDashboard";
import { useLoans } from "@/hooks/queries/useLoans";
import { MetricCard } from "@/components/dashboards/MetricCard";
import { DashboardSection } from "@/components/dashboards/DashboardSection";

function fmtMoney(amount: number | null | undefined, currency = "SAR") {
  if (amount == null) return "—";
  return `${currency} ${Number(amount).toLocaleString()}`;
}

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

/**
 * Personal "My Dashboard" view shown to admin / HR users when the TopBar
 * scope is set to "Me". Reuses `useMyDashboard()` (latest payslip, leave
 * balance, expenses, assets) and adds a gradient greeting header + loans
 * card so the experience clearly differs from the team-wide AdminDashboard.
 */
export default function AdminEssDashboard() {
  const { profile, appRole } = useRole();
  const {
    employee,
    latestPayslip,
    annualLeaveBalance,
    sickLeaveBalance,
    upcomingLeaves,
    expenses,
    pendingExpenseCount,
    assets,
    documents,
    holidays,
  } = useMyDashboard();

  const { data: loans = [] } = useLoans({ employee_id: employee?.id });
  const activeLoans = loans.filter((l: any) => l.status === "active");
  const totalOutstanding = activeLoans.reduce((s: number, l: any) => s + Number(l.remaining_balance ?? 0), 0);

  const firstName =
    employee?.first_name || profile?.full_name?.split(" ")[0] || "there";

  // Friendly fallback when an admin/HR user doesn't have an employee row yet.
  if (!employee) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center space-y-3">
          <h3 className="text-lg font-semibold">No employee profile yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Your account is set up as <span className="font-medium capitalize">{appRole}</span> but
            doesn't have a matching employee record yet. Add yourself to the directory to start
            tracking your payslips, leave balance, expenses and assets here.
          </p>
          <Button asChild size="sm" className="mt-2">
            <Link to="/employees">Go to Employees Directory</Link>
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
      {/* Greeting banner */}
      <div className="rounded-xl bg-gradient-to-r from-primary to-primary/70 p-6 text-primary-foreground">
        <h2 className="text-xl font-bold mb-1">My Dashboard, {firstName} 👋</h2>
        <p className="text-sm opacity-90">
          Your personal space — payslips, leave, expenses, assets and more.
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link to="/payslips" className="group">
          <Card className="hover:border-primary/50 transition-colors h-full">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <FileText className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
              </div>
              <span className="text-sm font-medium">Download Payslip</span>
            </CardContent>
          </Card>
        </Link>
        <Link to="/leave" className="group">
          <Card className="hover:border-primary/50 transition-colors h-full">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                <Plus className="h-5 w-5 text-blue-700 dark:text-blue-300" />
              </div>
              <span className="text-sm font-medium">Apply Leave</span>
            </CardContent>
          </Card>
        </Link>
        <Link to="/expenses" className="group">
          <Card className="hover:border-primary/50 transition-colors h-full">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-amber-700 dark:text-amber-300" />
              </div>
              <span className="text-sm font-medium">Submit Expense</span>
            </CardContent>
          </Card>
        </Link>
        <Link to="/loans" className="group">
          <Card className="hover:border-primary/50 transition-colors h-full">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-purple-700 dark:text-purple-300" />
              </div>
              <span className="text-sm font-medium">Request Loan</span>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Net Salary"
          value={latestPayslip ? fmtMoney((latestPayslip as any).net_pay, (latestPayslip as any).pay_currency) : "—"}
          sublabel={
            latestPayslip && (latestPayslip as any).payroll_runs
              ? `${(latestPayslip as any).payroll_runs.month} ${(latestPayslip as any).payroll_runs.year}`
              : "No payslip yet"
          }
          icon={DollarSign}
          accent="emerald"
        />
        <MetricCard
          label="Leave Remaining"
          value={annualLeaveBalance ? `${annualLeaveBalance.remaining}d` : "—"}
          sublabel={sickLeaveBalance != null ? `Sick: ${sickLeaveBalance}d` : "No allocation yet"}
          icon={Calendar}
          accent="blue"
        />
        <MetricCard
          label="Pending Expenses"
          value={pendingExpenseCount}
          sublabel={`${expenses.length} recent total`}
          icon={Receipt}
          accent="amber"
        />
        <MetricCard
          label="My Assets"
          value={assets.length}
          sublabel={assets.length === 0 ? "None assigned" : "Assigned to you"}
          icon={Package}
          accent="purple"
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Payslip, Expenses, Loans */}
        <div className="lg:col-span-2 space-y-6">
          <DashboardSection title="Latest Payslip" viewAllHref="/payslips">
            <Card>
              <CardContent className="p-4">
                {!latestPayslip ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No payslip yet — your first one will appear after the next payroll run.
                  </p>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                      <DollarSign className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {(latestPayslip as any).payroll_runs
                          ? `${(latestPayslip as any).payroll_runs.month} ${(latestPayslip as any).payroll_runs.year}`
                          : "Latest payslip"}
                      </p>
                      <p className="text-lg font-bold">
                        {fmtMoney((latestPayslip as any).net_pay, (latestPayslip as any).pay_currency)}
                      </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/payslips"><Download className="h-3.5 w-3.5 mr-1.5" /> View</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </DashboardSection>

          <DashboardSection title="My Recent Expenses" viewAllHref="/expenses">
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

          <DashboardSection title="My Loans" viewAllHref="/loans">
            <Card><CardContent className="p-2">
              {activeLoans.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No active loans.</p>
              ) : (
                <>
                  <ul className="divide-y divide-border/40">
                    {activeLoans.slice(0, 3).map((l: any) => (
                      <li key={l.id} className="flex items-center gap-3 p-2.5">
                        <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0">
                          <CreditCard className="h-3.5 w-3.5 text-purple-700 dark:text-purple-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            Loan · SAR {Number(l.principal).toLocaleString()}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            EMI SAR {Number(l.monthly_deduction).toLocaleString()} / month
                          </p>
                        </div>
                        <p className="text-sm font-semibold tabular-nums">
                          SAR {Number(l.remaining_balance).toLocaleString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <div className="px-3 py-2 border-t flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Total outstanding</span>
                    <span className="text-sm font-bold">SAR {totalOutstanding.toLocaleString()}</span>
                  </div>
                </>
              )}
            </CardContent></Card>
          </DashboardSection>
        </div>

        {/* Right column: Profile, Leaves, Assets */}
        <div className="space-y-6">
          <DashboardSection title="My Profile" viewAllHref="/me">
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {firstName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {employee.first_name} {employee.last_name}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {employee.designation || "—"}
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5 text-[12px]">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="h-3.5 w-3.5" />
                    <span>{employee.department || "No department"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Joined {employee.joining_date ?? "—"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </DashboardSection>

          <DashboardSection title="My Upcoming Leaves" viewAllHref="/leave">
            <Card><CardContent className="p-2">
              {upcomingLeaves.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No upcoming leaves.</p>
              ) : (
                <ul className="divide-y divide-border/40">
                  {upcomingLeaves.slice(0, 4).map((l: any) => (
                    <li key={l.id} className="flex items-center gap-3 p-2.5">
                      <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                        <Calendar className="h-3.5 w-3.5 text-blue-700 dark:text-blue-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium capitalize truncate">
                          {l.leave_types?.name ?? "Leave"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {l.days}d · {l.start_date}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] capitalize">{l.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent></Card>
          </DashboardSection>

          <DashboardSection title="My Assets" viewAllHref="/assets/inventory">
            <Card><CardContent className="p-2">
              {assets.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No assets assigned.</p>
              ) : (
                <ul className="divide-y divide-border/40">
                  {assets.slice(0, 3).map((a: any) => (
                    <li key={a.id} className="flex items-center gap-3 p-2.5">
                      <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0">
                        <Package className="h-3.5 w-3.5 text-purple-700 dark:text-purple-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{a.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
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

          {expiringDocs.length > 0 && (
            <DashboardSection title="Document Expiry">
              <Card><CardContent className="p-2">
                <ul className="divide-y divide-border/40">
                  {expiringDocs.map((d: any) => {
                    const warn = (d.daysLeft ?? 999) <= 90;
                    return (
                      <li key={d.id} className="flex items-center gap-3 p-2.5">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${warn ? "bg-amber-100 dark:bg-amber-900/40" : "bg-muted"}`}>
                          <AlertCircle className={`h-3.5 w-3.5 ${warn ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"}`} />
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

          {holidays.length > 0 && (
            <DashboardSection title="Upcoming Holidays">
              <Card><CardContent className="p-2">
                <ul className="divide-y divide-border/40">
                  {holidays.slice(0, 4).map((h: any) => (
                    <li key={h.id} className="flex items-center gap-3 p-2.5">
                      <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0">
                        <Calendar className="h-3.5 w-3.5 text-purple-700 dark:text-purple-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{h.name}</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(h.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </li>
                  ))}
                </ul>
              </CardContent></Card>
            </DashboardSection>
          )}
        </div>
      </div>
    </div>
  );
}
