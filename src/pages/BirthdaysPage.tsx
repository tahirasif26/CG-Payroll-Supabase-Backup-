import { useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useActiveEmployees } from "@/hooks/useActiveEmployees";
import type { Employee } from "@/types/hcm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Cake, Briefcase, Search, Filter, ArrowUpDown, SearchX } from "lucide-react";
import { EmptyTableRow } from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CardSettingsPanel } from "@/components/cards/CardSettingsPanel";
import { HolidayCardSender } from "@/components/cards/HolidayCardSender";
import { useCards } from "@/contexts/CardContext";

/**
 * Pure helper — derives next-birthday metadata from a list of live employees.
 * (Previously imported from `@/data/mockData`; kept inline so the page makes
 * it obvious it operates on real tenant data only.)
 */
function getUpcomingBirthdays(emps: Employee[]) {
  const today = new Date();
  const currentYear = today.getFullYear();
  return emps
    .filter((e) => !!e.dateOfBirth)
    .map((e) => {
      const dob = new Date(e.dateOfBirth!);
      const birthMonth = dob.getMonth();
      const birthDay = dob.getDate();
      let next = new Date(currentYear, birthMonth, birthDay);
      if (next < today) next = new Date(currentYear + 1, birthMonth, birthDay);
      const daysUntil = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return { ...e, birthMonth, birthDay, daysUntil };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

type SortField = "name" | "birthday" | "anniversary" | "birthdayDays" | "anniversaryDays";
type SortDir = "asc" | "desc";

function getDaysUntilAnniversary(joiningDate: string) {
  const today = new Date();
  const join = new Date(joiningDate);
  const thisYear = new Date(today.getFullYear(), join.getMonth(), join.getDate());
  if (thisYear >= today) {
    return Math.ceil((thisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }
  const nextYear = new Date(today.getFullYear() + 1, join.getMonth(), join.getDate());
  return Math.ceil((nextYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getYearsOfService(joiningDate: string) {
  const today = new Date();
  const join = new Date(joiningDate);
  return Math.floor((today.getTime() - join.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

export default function BirthdaysPage() {
  const activeEmployees = useActiveEmployees();
  const allBirthdays = getUpcomingBirthdays(activeEmployees);
  const { settings, enabledEmployees, toggleEmployee, bulkToggle } = useCards();

  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterTimeframe, setFilterTimeframe] = useState("all");
  const [sortField, setSortField] = useState<SortField>("birthdayDays");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const departments = [...new Set(activeEmployees.map(e => e.department))].sort();

  const data = useMemo(() => {
    return allBirthdays.map(emp => ({
      ...emp,
      anniversaryDaysUntil: getDaysUntilAnniversary(emp.joiningDate),
      yearsOfService: getYearsOfService(emp.joiningDate),
    }));
  }, [allBirthdays]);

  const filtered = data.filter(emp => {
    const q = search.toLowerCase();
    const matchesSearch = !q || `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q) || emp.department.toLowerCase().includes(q);
    const matchesDept = filterDept === "all" || emp.department === filterDept;
    const minDays = Math.min(emp.daysUntil, emp.anniversaryDaysUntil);
    const matchesTime = filterTimeframe === "all"
      || (filterTimeframe === "today" && minDays === 0)
      || (filterTimeframe === "week" && minDays <= 7)
      || (filterTimeframe === "month" && minDays <= 30);
    return matchesSearch && matchesDept && matchesTime;
  });

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortField) {
      case "name": return dir * `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      case "birthday": return dir * (a.birthMonth * 31 + a.birthDay - (b.birthMonth * 31 + b.birthDay));
      case "anniversary": {
        const aDate = new Date(a.joiningDate);
        const bDate = new Date(b.joiningDate);
        return dir * (aDate.getMonth() * 31 + aDate.getDate() - (bDate.getMonth() * 31 + bDate.getDate()));
      }
      case "birthdayDays": return dir * (a.daysUntil - b.daysUntil);
      case "anniversaryDays": return dir * (a.anniversaryDaysUntil - b.anniversaryDaysUntil);
      default: return 0;
    }
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead className="font-semibold cursor-pointer select-none" onClick={() => toggleSort(field)}>
      <span className="flex items-center gap-1">{children}<ArrowUpDown className="h-3 w-3 text-muted-foreground" /></span>
    </TableHead>
  );

  const todayBirthdays = data.filter(e => e.daysUntil === 0).length;
  const todayAnniversaries = data.filter(e => e.anniversaryDaysUntil === 0).length;
  const weekBirthdays = data.filter(e => e.daysUntil <= 7).length;
  const weekAnniversaries = data.filter(e => e.anniversaryDaysUntil <= 7).length;

  // Bulk select logic for cards
  const allBirthdayEnabled = sorted.length > 0 && sorted.every(e => enabledEmployees[e.id]?.birthday);
  const allAnniversaryEnabled = sorted.length > 0 && sorted.every(e => enabledEmployees[e.id]?.anniversary);

  return (
    <div className="space-y-6">
      <PageHeader title="Birthdays & Anniversaries" description="Track upcoming birthdays and work anniversaries for your team." />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cards">Digital Cards</TabsTrigger>
          <TabsTrigger value="holiday">Holiday Cards</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Birthdays Today</p><p className="text-2xl font-bold">{todayBirthdays}</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Anniversaries Today</p><p className="text-2xl font-bold">{todayAnniversaries}</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Birthdays This Week</p><p className="text-2xl font-bold text-primary">{weekBirthdays}</p></CardContent></Card>
              <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Anniversaries This Week</p><p className="text-2xl font-bold text-primary">{weekAnniversaries}</p></CardContent></Card>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name or department..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
              </div>
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="w-[160px] h-9"><Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterTimeframe} onValueChange={setFilterTimeframe}>
                <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Upcoming</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <ScrollArea className="h-[550px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <SortHeader field="name">Employee</SortHeader>
                      <TableHead className="font-semibold">Department</TableHead>
                      <SortHeader field="birthday">Birthday</SortHeader>
                      <SortHeader field="birthdayDays">Days Until Birthday</SortHeader>
                      <SortHeader field="anniversary">Anniversary Date</SortHeader>
                      <SortHeader field="anniversaryDays">Days Until Anniversary</SortHeader>
                      <TableHead className="font-semibold">Years of Service</TableHead>
                      {settings.globalEnabled && <TableHead className="font-semibold text-center">
                        <span className="flex items-center gap-1 justify-center">Card
                          <Checkbox
                            checked={allBirthdayEnabled && allAnniversaryEnabled}
                            onCheckedChange={(v) => {
                              const ids = sorted.map(e => e.id);
                              bulkToggle(ids, "birthday", !!v);
                              bulkToggle(ids, "anniversary", !!v);
                            }}
                            className="ml-1"
                          />
                        </span>
                      </TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.length > 0 ? sorted.map(emp => {
                      const isBirthdayToday = emp.daysUntil === 0;
                      const isBirthdaySoon = emp.daysUntil <= 7 && emp.daysUntil > 0;
                      const isAnniversaryToday = emp.anniversaryDaysUntil === 0;
                      const isAnniversarySoon = emp.anniversaryDaysUntil <= 7 && emp.anniversaryDaysUntil > 0;
                      const empCards = enabledEmployees[emp.id] || { birthday: false, anniversary: false };

                      return (
                        <TableRow key={emp.id} className={isBirthdayToday || isAnniversaryToday ? "bg-primary/5" : ""}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                                <span className="text-[10px] font-bold text-secondary-foreground">{emp.firstName[0]}{emp.lastName[0]}</span>
                              </div>
                              <div>
                                <p className="text-sm font-medium">{emp.firstName} {emp.lastName}</p>
                                <p className="text-xs text-muted-foreground">{emp.designation}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{emp.department}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Cake className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm">{new Date(emp.dateOfBirth).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                              isBirthdayToday ? "bg-primary text-primary-foreground" :
                              isBirthdaySoon ? "bg-warning/10 text-warning" :
                              "bg-muted text-muted-foreground"
                            }`}>
                              {isBirthdayToday ? "🎉 Today!" : `${emp.daysUntil} days`}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm">{new Date(emp.joiningDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                              isAnniversaryToday ? "bg-primary text-primary-foreground" :
                              isAnniversarySoon ? "bg-info/10 text-info" :
                              "bg-muted text-muted-foreground"
                            }`}>
                              {isAnniversaryToday ? "🎊 Today!" : `${emp.anniversaryDaysUntil} days`}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-semibold">{emp.yearsOfService} yr{emp.yearsOfService !== 1 ? "s" : ""}</span>
                          </TableCell>
                          {settings.globalEnabled && (
                            <TableCell>
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={empCards.birthday}
                                    onCheckedChange={() => toggleEmployee(emp.id, "birthday")}
                                    disabled={!settings.birthdayEnabled}
                                    className="scale-75"
                                  />
                                  <Switch
                                    checked={empCards.anniversary}
                                    onCheckedChange={() => toggleEmployee(emp.id, "anniversary")}
                                    disabled={!settings.anniversaryEnabled}
                                    className="scale-75"
                                  />
                                </div>
                                <div className="flex gap-1">
                                  {empCards.birthday && settings.birthdayEnabled && <Badge variant="secondary" className="text-[9px] px-1 py-0">🎂</Badge>}
                                  {empCards.anniversary && settings.anniversaryEnabled && <Badge variant="secondary" className="text-[9px] px-1 py-0">🎊</Badge>}
                                </div>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    }) : (
                      <TableRow><TableCell colSpan={settings.globalEnabled ? 8 : 7} className="text-center py-8 text-muted-foreground">No results match your filters.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
            <p className="text-xs text-muted-foreground">{sorted.length} of {data.length} employees</p>
          </div>
        </TabsContent>

        <TabsContent value="cards">
          <CardSettingsPanel />
        </TabsContent>

        <TabsContent value="holiday">
          <HolidayCardSender />
        </TabsContent>
      </Tabs>
    </div>
  );
}
