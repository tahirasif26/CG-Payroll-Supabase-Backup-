import { useMemo } from "react";
import { Users, DollarSign, Calendar, TrendingUp, Gift, CreditCard, Clock, PiggyBank, FileText, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { employees, payrollRuns, leaveRequests, expenses, loans, getUpcomingBirthdays } from "@/data/mockData";
import { useActiveEmployees } from "@/hooks/useActiveEmployees";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRole } from "@/contexts/RoleContext";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";

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

function QuickStat({ label, value, change, positive }: { label: string; value: string; change?: string; positive?: boolean }) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
        {change && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${positive ? "text-success" : "text-destructive"}`}>
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {change}
          </div>
        )}
      </CardContent>
      <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-[40px]" />
    </Card>
  );
}

function EmployerDashboard() {
  const CHART_COLORS = useMemo(() => getChartColors(), []);
  const activeEmps = useActiveEmployees();
  const activeCount = activeEmps.filter((e) => e.status === "active").length;
  const lastPayroll = payrollRuns.find((p) => p.status === "completed");
  const pendingLeaves = leaveRequests.filter((l) => l.status === "pending").length;
  const pendingExpenses = expenses.filter((e) => e.status === "pending");
  const birthdays = getUpcomingBirthdays(activeEmps).slice(0, 5);

  const departments = ["Assurance", "Tax", "Advisory", "Strategy", "Technology"];
  const deptData = departments.map((dept) => ({
    name: dept,
    count: activeEmps.filter((e) => e.department === dept).length,
    cost: activeEmps.filter((e) => e.department === dept).reduce((s, e) => s + e.salary, 0),
  }));

  const statusData = [
    { name: "Active", value: activeEmps.filter(e => e.status === "active").length },
    { name: "On Leave", value: activeEmps.filter(e => e.status === "on-leave").length },
    { name: "Inactive", value: activeEmps.filter(e => e.status === "inactive").length },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome back. Here's your HR overview at a glance.</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickStat label="Total Employees" value={String(activeEmps.length)} change={`${activeCount} active`} positive />
        <QuickStat label="Last Payroll" value={`SAR ${lastPayroll?.totalNet.toLocaleString() ?? "—"}`} change={`${lastPayroll?.month} ${lastPayroll?.year}`} positive />
        <QuickStat label="Pending Leaves" value={String(pendingLeaves)} change="Awaiting approval" positive={pendingLeaves === 0} />
        <QuickStat label="Pending Expenses" value={String(pendingExpenses.length)} change={`SAR ${pendingExpenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}`} />
      </div>

      {/* Charts & Lists Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Latest Joiners
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...activeEmps]
                .sort((a, b) => new Date(b.joiningDate).getTime() - new Date(a.joiningDate).getTime())
                .slice(0, 5)
                .map((emp) => (
                  <div key={emp.id} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">{emp.firstName[0]}{emp.lastName[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{emp.firstName} {emp.lastName}</p>
                      <p className="text-xs text-muted-foreground">{emp.department}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(emp.joiningDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4 text-destructive" /> Recent Leavers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(() => {
                const leavers = employees.filter(e => e.status === "separated" || e.status === "inactive")
                  .sort((a, b) => new Date(b.joiningDate).getTime() - new Date(a.joiningDate).getTime())
                  .slice(0, 5);
                return leavers.length > 0 ? leavers.map((emp) => (
                  <div key={emp.id} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-destructive">{emp.firstName[0]}{emp.lastName[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{emp.firstName} {emp.lastName}</p>
                      <p className="text-xs text-muted-foreground">{emp.department}</p>
                    </div>
                    <StatusBadge status={emp.status} />
                  </div>
                )) : <p className="text-sm text-muted-foreground">No recent leavers.</p>;
              })()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Employee Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={45}>
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(0,0%,88%)" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 justify-center mt-1">
              {statusData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="text-muted-foreground">{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" /> Recent Payroll Runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {payrollRuns.map((run) => (
                <div key={run.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground">{run.month} {run.year}</p>
                    <p className="text-xs text-muted-foreground">{run.employeeCount} employees</p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <p className="text-sm font-semibold text-foreground">SAR {run.totalNet.toLocaleString()}</p>
                    <StatusBadge status={run.status} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" /> Upcoming Birthdays
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {birthdays.map((emp) => (
                <div key={emp.id} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">{emp.firstName[0]}{emp.lastName[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{emp.firstName} {emp.lastName}</p>
                    <p className="text-xs text-muted-foreground">{emp.department}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-foreground">{new Date(emp.dateOfBirth).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {emp.daysUntil === 0 ? "🎉 Today!" : `in ${emp.daysUntil} days`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {leaveRequests.filter((l) => l.status === "pending").map((leave) => (
                <div key={leave.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground">{leave.employeeName}</p>
                    <p className="text-xs text-muted-foreground capitalize">{leave.type} leave · {leave.days} days</p>
                  </div>
                  <StatusBadge status={leave.status} />
                </div>
              ))}
              {pendingExpenses.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground">{exp.employeeName}</p>
                    <p className="text-xs text-muted-foreground">{exp.category} · SAR {exp.amount.toLocaleString()}</p>
                  </div>
                  <StatusBadge status={exp.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Department Payroll Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {deptData.map((dept) => (
                <div key={dept.name} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground">{dept.name}</p>
                    <p className="text-xs text-muted-foreground">{dept.count} employees</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground">SAR {dept.cost.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmployeeDashboard() {
  const { currentEmployeeId } = useRole();
  const emp = employees.find((e) => e.id === currentEmployeeId);
  if (!emp) return null;

  const myLeaves = leaveRequests.filter((l) => l.employeeId === currentEmployeeId);
  const myLoans = loans.filter((l) => l.employeeId === currentEmployeeId);
  const myExpenses = expenses.filter((e) => e.employeeId === currentEmployeeId);
  const pendingLeaves = myLeaves.filter((l) => l.status === "pending").length;
  const activeLoans = myLoans.filter((l) => l.status === "active");
  const totalLoanBalance = activeLoans.reduce((s, l) => s + l.remainingBalance, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome, {emp.firstName}!</h1>
        <p className="text-sm text-muted-foreground mt-1">{emp.designation} · {emp.department}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickStat label="My Salary" value={`SAR ${emp.salary.toLocaleString()}`} change="Monthly gross" positive />
        <QuickStat label="Leave Requests" value={String(myLeaves.length)} change={pendingLeaves > 0 ? `${pendingLeaves} pending` : "All processed"} positive={pendingLeaves === 0} />
        <QuickStat label="Active Loans" value={String(activeLoans.length)} change={totalLoanBalance > 0 ? `SAR ${totalLoanBalance.toLocaleString()} remaining` : "No active loans"} />
        <QuickStat label="Expenses" value={String(myExpenses.length)} change={`${myExpenses.filter(e => e.status === "pending").length} pending`} positive />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> My Leave Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {myLeaves.length === 0 && <p className="text-sm text-muted-foreground">No leave requests.</p>}
              {myLeaves.map((leave) => (
                <div key={leave.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground capitalize">{leave.type} Leave</p>
                    <p className="text-xs text-muted-foreground">{leave.startDate} — {leave.endDate} · {leave.days} days</p>
                  </div>
                  <StatusBadge status={leave.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PiggyBank className="h-4 w-4 text-primary" /> My Loans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {myLoans.length === 0 && <p className="text-sm text-muted-foreground">No loans.</p>}
              {myLoans.map((loan) => (
                <div key={loan.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground">SAR {loan.amount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      Balance: SAR {loan.remainingBalance.toLocaleString()} · SAR {loan.monthlyDeduction.toLocaleString()}/mo
                    </p>
                  </div>
                  <StatusBadge status={loan.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" /> My Expense Claims
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {myExpenses.length === 0 && <p className="text-sm text-muted-foreground">No expense claims.</p>}
              {myExpenses.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground">{exp.description}</p>
                    <p className="text-xs text-muted-foreground">{exp.category} · SAR {exp.amount.toLocaleString()}</p>
                  </div>
                  <StatusBadge status={exp.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> My Compensation Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {emp.compensation?.map((comp) => (
                <div key={comp.name} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <p className="text-sm font-medium text-foreground">{comp.name}</p>
                  <p className="text-sm font-semibold text-foreground">SAR {comp.amount.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { role } = useRole();
  return role === "employer" ? <EmployerDashboard /> : <EmployeeDashboard />;
}
