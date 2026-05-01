import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Mail, Phone, Building2, Briefcase } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActiveEmployees } from "@/hooks/useActiveEmployees";
import { useReporting } from "@/contexts/ReportingContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import type { Employee } from "@/types/hcm";

export default function PeopleDirectoryPage() {
  const employees = useActiveEmployees();
  const { getManagerName } = useReporting();
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("all");
  const [selected, setSelected] = useState<Employee | null>(null);

  const departments = useMemo(
    () => Array.from(new Set(employees.map((e) => e.department).filter(Boolean))).sort(),
    [employees]
  );

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
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
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
                  {emp.avatar && <AvatarImage src={emp.avatar} alt="" />}
                  <AvatarFallback className="text-xs font-semibold">
                    {emp.firstName?.[0]}{emp.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">
                    {emp.firstName} {emp.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{emp.designation || "—"}</p>
                  <p className="text-[11px] text-muted-foreground/80 truncate mt-0.5">{emp.department || ""}</p>
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
                    {selected.avatar && <AvatarImage src={selected.avatar} alt="" />}
                    <AvatarFallback className="text-sm font-semibold">
                      {selected.firstName?.[0]}{selected.lastName?.[0]}
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
                {getManagerName(selected.id) && (
                  <Row icon={Briefcase} label="Reports to" value={getManagerName(selected.id)!} />
                )}
                {selected.workLocationCountry && (
                  <Row icon={Building2} label="Location" value={selected.workLocationCountry} />
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Badge variant="outline" className="text-[10px] capitalize">{selected.status}</Badge>
                {selected.category && (
                  <Badge variant="outline" className="text-[10px] capitalize">{selected.category}</Badge>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
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
