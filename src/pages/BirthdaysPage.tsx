import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { getUpcomingBirthdays } from "@/data/mockData";
import { useActiveEmployees } from "@/hooks/useActiveEmployees";
import { Card, CardContent } from "@/components/ui/card";
import { Gift, PartyPopper, Cake, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function BirthdaysPage() {
  const activeEmployees = useActiveEmployees();
  const allBirthdays = getUpcomingBirthdays(activeEmployees);

  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterTimeframe, setFilterTimeframe] = useState("all");

  const departments = [...new Set(activeEmployees.map(e => e.department))].sort();

  const birthdays = allBirthdays.filter(emp => {
    const q = search.toLowerCase();
    const matchesSearch = !q || `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q) || emp.department.toLowerCase().includes(q);
    const matchesDept = filterDept === "all" || emp.department === filterDept;
    const matchesTime = filterTimeframe === "all"
      || (filterTimeframe === "today" && emp.daysUntil === 0)
      || (filterTimeframe === "week" && emp.daysUntil <= 7)
      || (filterTimeframe === "month" && emp.daysUntil <= 30);
    return matchesSearch && matchesDept && matchesTime;
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Birthdays" description="Celebrate your team! Send birthday wishes and flyers." />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or department..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-[160px]"><Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" /><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterTimeframe} onValueChange={setFilterTimeframe}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Timeframe" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Upcoming</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {birthdays.length > 0 ? birthdays.map((emp) => {
          const isToday = emp.daysUntil === 0;
          const isSoon = emp.daysUntil <= 7 && emp.daysUntil > 0;

          return (
            <Card key={emp.id} className={`overflow-hidden transition-all hover:shadow-lg ${isToday ? "ring-2 ring-primary shadow-lg" : ""}`}>
              <div className={`h-2 w-full ${isToday ? "gradient-ey" : isSoon ? "bg-warning" : "bg-muted"}`} />
              <CardContent className="pt-5">
                <div className="text-center">
                  <div className={`h-16 w-16 rounded-full mx-auto flex items-center justify-center mb-3 ${isToday ? "gradient-ey" : "bg-secondary"}`}>
                    {isToday ? (
                      <PartyPopper className="h-7 w-7 text-primary-foreground" />
                    ) : (
                      <span className="text-lg font-bold text-secondary-foreground">{emp.firstName[0]}{emp.lastName[0]}</span>
                    )}
                  </div>
                  <h3 className="font-semibold">{emp.firstName} {emp.lastName}</h3>
                  <p className="text-xs text-muted-foreground">{emp.department} · {emp.designation}</p>
                  <div className="mt-3 flex items-center justify-center gap-1.5">
                    <Cake className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">
                      {new Date(emp.dateOfBirth).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                    </span>
                  </div>
                  <p className={`text-xs font-medium mt-1 ${isToday ? "text-primary-foreground bg-primary rounded-full px-3 py-1 inline-block" : isSoon ? "text-warning" : "text-muted-foreground"}`}>
                    {isToday ? "🎉 Happy Birthday!" : `In ${emp.daysUntil} days`}
                  </p>
                  {(isToday || isSoon) && (
                    <button className="mt-3 text-xs font-semibold text-primary hover:underline flex items-center gap-1 mx-auto">
                      <Gift className="h-3 w-3" /> Send Birthday Flyer
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        }) : (
          <div className="col-span-full text-center py-12 text-muted-foreground">No birthdays match your search criteria.</div>
        )}
      </div>
    </div>
  );
}
