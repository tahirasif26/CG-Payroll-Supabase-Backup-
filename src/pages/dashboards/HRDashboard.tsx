import { Users, Calendar, UserPlus, UserMinus, Gift, FileWarning, Briefcase, ClipboardCheck, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useActiveEmployees } from "@/hooks/useActiveEmployees";
import { useLeaveRequests } from "@/hooks/queries/useLeave";
import { useEmployees as useEmployeesCtx } from "@/contexts/EmployeeContext";

function getUpcomingBirthdays(emps: any[]) {
  const today = new Date();
  const y = today.getFullYear();
  return emps
    .filter((e) => !!e.dateOfBirth)
    .map((e) => {
      const dob = new Date(e.dateOfBirth);
      let next = new Date(y, dob.getMonth(), dob.getDate());
      if (next < today) next = new Date(y + 1, dob.getMonth(), dob.getDate());
      const daysUntil = Math.ceil((next.getTime() - today.getTime()) / 86400000);
      return { ...e, daysUntil };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil);
}
import { MetricCard } from "@/components/dashboards/MetricCard";
import { DashboardSection } from "@/components/dashboards/DashboardSection";
import { QuickActionButton } from "@/components/dashboards/QuickActionButton";
import { useRole } from "@/contexts/RoleContext";

export default function HRDashboard() {
  const { employees } = useEmployeesCtx();
  const { profile } = useRole();
  const activeEmps = useActiveEmployees();
  const { data: pendingLeavesRaw = [] } = useLeaveRequests({ status: "pending" });
  const { data: approvedLeavesRaw = [] } = useLeaveRequests({ status: "approved" });
  const pendingLeaves = pendingLeavesRaw;
  const onLeaveToday = approvedLeavesRaw.slice(0, 5).map((l: any) => ({
    id: l.id,
    employeeName: l.employees ? `${l.employees.first_name ?? ""} ${l.employees.last_name ?? ""}`.trim() : "",
    type: l.leave_types?.name ?? "Leave",
    days: l.days ?? 0,
  }));
  const birthdays = getUpcomingBirthdays(activeEmps).slice(0, 8);
  const recentHires = [...activeEmps]
    .sort((a, b) => new Date(b.joiningDate).getTime() - new Date(a.joiningDate).getTime())
    .slice(0, 10);

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome, {firstName}</h1>
        <p className="text-sm text-muted-foreground mt-1">People-first overview of your organisation.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Active Employees" value={activeEmps.length} icon={Users} accent="purple" />
        <MetricCard label="Pending Leaves" value={pendingLeaves.length} sublabel="Awaiting approval" icon={Calendar} accent="amber" />
        <MetricCard label="Pending Onboardings" value={2} sublabel="In progress" icon={UserPlus} accent="blue" />
        <MetricCard label="Pending Separations" value={1} sublabel="EOS in progress" icon={UserMinus} accent="red" />
      </div>

      <DashboardSection title="Quick Actions">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickActionButton icon={UserPlus} label="Add Employee" to="/employees" accent="emerald" />
          <QuickActionButton icon={ClipboardCheck} label="Approve Leaves" description={`${pendingLeaves.length} pending`} to="/leave" accent="amber" />
          <QuickActionButton icon={Briefcase} label="Run Reports" to="/analytics" accent="blue" />
          <QuickActionButton icon={Users} label="Org Chart" to="/org-chart" accent="purple" />
        </div>
      </DashboardSection>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DashboardSection title="Today's Leaves" viewAllHref="/leave">
          <Card><CardContent className="p-2">
            {onLeaveToday.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nobody is on leave today.</p>
            ) : (
              <ul className="divide-y divide-border/40">
                {onLeaveToday.map((l) => (
                  <li key={l.id} className="flex items-center gap-3 p-2.5">
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                      <Calendar className="h-3.5 w-3.5 text-blue-700 dark:text-blue-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{l.employeeName}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">{l.type} · {l.days} days</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">Approved</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent></Card>
        </DashboardSection>

        <DashboardSection title="Birthdays This Month" viewAllHref="/birthdays">
          <Card><CardContent className="p-2">
            <ul className="divide-y divide-border/40">
              {birthdays.map((emp) => (
                <li key={emp.id} className="flex items-center gap-3 p-2.5">
                  <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                    <Gift className="h-3.5 w-3.5 text-amber-700 dark:text-amber-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{emp.firstName} {emp.lastName}</p>
                    <p className="text-[11px] text-muted-foreground">{emp.department}</p>
                  </div>
                  <p className="text-[11px] font-medium">{emp.daysUntil === 0 ? "🎉 Today" : `in ${emp.daysUntil}d`}</p>
                </li>
              ))}
            </ul>
          </CardContent></Card>
        </DashboardSection>

        <DashboardSection title="Probation Ending Soon">
          <Card><CardContent className="p-2">
            <ul className="divide-y divide-border/40">
              {recentHires.slice(0, 3).map((emp) => (
                <li key={emp.id} className="flex items-center gap-3 p-2.5">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">{emp.firstName[0]}{emp.lastName[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{emp.firstName} {emp.lastName}</p>
                    <p className="text-[11px] text-muted-foreground">{emp.designation}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">In 14 days</Badge>
                </li>
              ))}
            </ul>
          </CardContent></Card>
        </DashboardSection>

        <DashboardSection title="Document Expiries">
          <Card><CardContent className="p-2">
            <ul className="divide-y divide-border/40">
              {[
                { name: "Ali Hassan", doc: "Passport", days: 12 },
                { name: "Sarah Khan", doc: "Visa", days: 28 },
                { name: "Omar Siddiqui", doc: "Iqama", days: 45 },
              ].map((d, i) => (
                <li key={i} className="flex items-center gap-3 p-2.5">
                  <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                    <FileWarning className="h-3.5 w-3.5 text-red-700 dark:text-red-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.name}</p>
                    <p className="text-[11px] text-muted-foreground">{d.doc}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">Expires in {d.days}d</Badge>
                </li>
              ))}
            </ul>
          </CardContent></Card>
        </DashboardSection>
      </div>

      <DashboardSection title="Recent Hires" viewAllHref="/employees">
        <Card><CardContent className="p-2">
          <ul className="divide-y divide-border/40">
            {recentHires.slice(0, 5).map((emp) => (
              <li key={emp.id} className="flex items-center gap-3 p-2.5">
                <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                  <UserPlus className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{emp.firstName} {emp.lastName}</p>
                  <p className="text-[11px] text-muted-foreground">{emp.designation} · {emp.department}</p>
                </div>
                <p className="text-[11px] text-muted-foreground">{new Date(emp.joiningDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
              </li>
            ))}
          </ul>
        </CardContent></Card>
      </DashboardSection>
    </div>
  );
}
