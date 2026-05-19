import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Mail, Phone, Building2, Briefcase } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmployees, type EmployeeDirectoryItem } from "@/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";

/**
 * Phase 3a-cutover: directory now reads from NestJS via `useEmployees`. The
 * old `useActiveEmployees` hook also enforced an `is_verified` filter (employee
 * has logged in at least once); that flag isn't yet ported to the new backend
 * and will return in Phase 3b when login-status tracking lands. For now every
 * active employee appears in the directory.
 */
export default function PeopleDirectoryPage() {
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("all");
  const [selected, setSelected] = useState<EmployeeDirectoryItem | null>(null);

  // Pull a generous page; for clients with > 200 employees we'll move to
  // server-side search/pagination in a follow-up.
  const { data, isLoading } = useEmployees({ status: "active", pageSize: 200 });
  const employees = data?.data ?? [];

  const departments = useMemo(
    () =>
      Array.from(
        new Set(employees.map((e) => e.department).filter((d): d is string => !!d)),
      ).sort(),
    [employees],
  );

  const managersById = useMemo(() => {
    const map = new Map<string, EmployeeDirectoryItem>();
    for (const e of employees) map.set(e.id, e);
    return map;
  }, [employees]);

  const getManagerName = (emp: EmployeeDirectoryItem): string | null => {
    if (!emp.reportsToId) return null;
    const m = managersById.get(emp.reportsToId);
    return m ? `${m.firstName} ${m.lastName}`.trim() : null;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      const matchesQ =
        !q ||
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
        (e.designation ?? "").toLowerCase().includes(q) ||
        (e.department ?? "").toLowerCase().includes(q) ||
        (e.email ?? "").toLowerCase().includes(q);
      const matchesD = dept === "all" || e.department === dept;
      return matchesQ && matchesD;
    });
  }, [employees, search, dept]);

  return (
    <div className="space-y-6">
      <PageHeader title="People" description="Browse colleagues across the organisation." />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, role, department, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={dept} onValueChange={setDept}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="All departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="h-11 w-11 rounded-full bg-muted shrink-0" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3 w-2/3 bg-muted rounded" />
                  <div className="h-2 w-1/2 bg-muted rounded" />
                  <div className="h-2 w-1/3 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No people found"
          description="Try adjusting your search or filters."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((emp) => (
            <Card
              key={emp.id}
              className="cursor-pointer transition-colors hover:bg-muted/40"
              onClick={() => setSelected(emp)}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <Avatar className="h-11 w-11 shrink-0">
                  {emp.avatarUrl && <AvatarImage src={emp.avatarUrl} alt="" />}
                  <AvatarFallback className="text-xs font-semibold">
                    {emp.firstName?.[0]}
                    {emp.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">
                    {emp.firstName} {emp.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {emp.designation || "—"}
                  </p>
                  <p className="text-[11px] text-muted-foreground/80 truncate mt-0.5">
                    {emp.department || ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14">
                    {selected.avatarUrl && <AvatarImage src={selected.avatarUrl} alt="" />}
                    <AvatarFallback className="text-sm font-semibold">
                      {selected.firstName?.[0]}
                      {selected.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <DialogTitle className="text-base">
                      {selected.firstName} {selected.lastName}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      {selected.designation || "—"}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-2.5 text-sm pt-1">
                {selected.department && (
                  <Row icon={Building2} label="Department" value={selected.department} />
                )}
                {selected.empId && (
                  <Row icon={Briefcase} label="Employee ID" value={selected.empId} />
                )}
                {selected.email && (
                  <Row
                    icon={Mail}
                    label="Email"
                    value={
                      <a href={`mailto:${selected.email}`} className="text-primary hover:underline">
                        {selected.email}
                      </a>
                    }
                  />
                )}
                {selected.phone && (
                  <Row
                    icon={Phone}
                    label="Phone"
                    value={
                      <a href={`tel:${selected.phone}`} className="text-primary hover:underline">
                        {selected.phone}
                      </a>
                    }
                  />
                )}
                {getManagerName(selected) && (
                  <Row icon={Briefcase} label="Reports to" value={getManagerName(selected)!} />
                )}
                {selected.workLocationCountry && (
                  <Row
                    icon={Building2}
                    label="Location"
                    value={selected.workLocationCountry}
                  />
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Badge variant="outline" className="text-[10px] capitalize">
                  {selected.status}
                </Badge>
                {selected.category && (
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {selected.category}
                  </Badge>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className="text-sm text-foreground truncate">{value}</div>
      </div>
    </div>
  );
}
