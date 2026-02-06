import { Users, DollarSign, Calendar, TrendingUp, Gift, CreditCard, Clock, PiggyBank, FileText } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { employees, payrollRuns, leaveRequests, expenses, loans, getUpcomingBirthdays } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRole } from "@/contexts/RoleContext";

function EmployerDashboard() {
  const activeEmployees = employees.filter((e) => e.status === "active").length;
  const lastPayroll = payrollRuns.find((p) => p.status === "completed");
  const pendingLeaves = leaveRequests.filter((l) => l.status === "pending").length;
  const pendingExpenses = expenses.filter((e) => e.status === "pending");
  const birthdays = getUpcomingBirthdays(employees).slice(0, 4);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Welcome back! Here's your HR overview." />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Employees" value={employees.length} subtitle={`${activeEmployees} active`} icon={Users} variant="primary" />
        <StatCard title="Last Payroll" value={`SAR ${lastPayroll?.totalNet.toLocaleString()}`} subtitle={`${lastPayroll?.month} ${lastPayroll?.year}`} icon={DollarSign} variant="success" />
        <StatCard title="Pending Leaves" value={pendingLeaves} subtitle="Awaiting approval" icon={Calendar} variant="warning" />
        <StatCard title="Pending Expenses" value={pendingExpenses.length} subtitle={`SAR ${pendingExpenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}`} icon={CreditCard} variant="info" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" /> Recent Payroll Runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payrollRuns.map((run) => (
                <div key={run.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{run.month} {run.year}</p>
                    <p className="text-xs text-muted-foreground">{run.employeeCount} employees</p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <p className="text-sm font-semibold">SAR {run.totalNet.toLocaleString()}</p>
                    <StatusBadge status={run.status} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" /> Upcoming Birthdays
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {birthdays.map((emp) => (
                <div key={emp.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary-foreground">{emp.firstName[0]}{emp.lastName[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{emp.firstName} {emp.lastName}</p>
                    <p className="text-xs text-muted-foreground">{emp.department}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium">{new Date(emp.dateOfBirth).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
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
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leaveRequests.filter((l) => l.status === "pending").map((leave) => (
                <div key={leave.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{leave.employeeName}</p>
                    <p className="text-xs text-muted-foreground capitalize">{leave.type} leave · {leave.days} days</p>
                  </div>
                  <StatusBadge status={leave.status} />
                </div>
              ))}
              {pendingExpenses.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{exp.employeeName}</p>
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
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Department Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {["Assurance", "Tax", "Advisory", "Strategy", "Technology"].map((dept) => {
                const count = employees.filter((e) => e.department === dept).length;
                const total = employees.filter((e) => e.department === dept).reduce((s, e) => s + e.salary, 0);
                return (
                  <div key={dept} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{dept}</p>
                      <p className="text-xs text-muted-foreground">{count} employees</p>
                    </div>
                    <p className="text-sm font-semibold">SAR {total.toLocaleString()}</p>
                  </div>
                );
              })}
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
      <PageHeader title={`Welcome, ${emp.firstName}!`} description={`${emp.designation} · ${emp.department}`} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="My Salary" value={`SAR ${emp.salary.toLocaleString()}`} subtitle="Monthly gross" icon={DollarSign} variant="primary" />
        <StatCard title="Leave Requests" value={myLeaves.length} subtitle={pendingLeaves > 0 ? `${pendingLeaves} pending` : "All processed"} icon={Calendar} variant="warning" />
        <StatCard title="Active Loans" value={activeLoans.length} subtitle={totalLoanBalance > 0 ? `SAR ${totalLoanBalance.toLocaleString()} remaining` : "No active loans"} icon={PiggyBank} variant="info" />
        <StatCard title="Expenses" value={myExpenses.length} subtitle={`${myExpenses.filter(e => e.status === "pending").length} pending`} icon={CreditCard} variant="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Leave Requests */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> My Leave Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myLeaves.length === 0 && <p className="text-sm text-muted-foreground">No leave requests.</p>}
              {myLeaves.map((leave) => (
                <div key={leave.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium capitalize">{leave.type} Leave</p>
                    <p className="text-xs text-muted-foreground">{leave.startDate} — {leave.endDate} · {leave.days} days</p>
                  </div>
                  <StatusBadge status={leave.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* My Loans */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PiggyBank className="h-4 w-4 text-primary" /> My Loans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myLoans.length === 0 && <p className="text-sm text-muted-foreground">No loans.</p>}
              {myLoans.map((loan) => (
                <div key={loan.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">SAR {loan.amount.toLocaleString()}</p>
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

        {/* My Expenses */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" /> My Expense Claims
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myExpenses.length === 0 && <p className="text-sm text-muted-foreground">No expense claims.</p>}
              {myExpenses.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{exp.description}</p>
                    <p className="text-xs text-muted-foreground">{exp.category} · SAR {exp.amount.toLocaleString()}</p>
                  </div>
                  <StatusBadge status={exp.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* My Compensation */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> My Compensation Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {emp.compensation?.map((comp) => (
                <div key={comp.name} className="flex items-center justify-between py-2 border-b last:border-0">
                  <p className="text-sm font-medium">{comp.name}</p>
                  <p className="text-sm font-semibold">SAR {comp.amount.toLocaleString()}</p>
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
