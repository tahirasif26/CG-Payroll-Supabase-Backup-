import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useViewScope } from "@/contexts/ViewScopeContext";
import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronRight, ChevronDown, Loader2, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface OrgEmp {
  id: string;
  first_name: string | null;
  last_name: string | null;
  designation: string | null;
  department: string | null;
  avatar_url: string | null;
  reports_to: string | null;
  status: string;
}

interface OrgNode {
  employee: OrgEmp | null; // null = virtual root
  children: OrgNode[];
}

const VIRTUAL_ROOT_ID = "__company_root__";

function fullName(e: OrgEmp | null): string {
  if (!e) return "Company";
  return `${e.first_name ?? ""} ${e.last_name ?? ""}`.trim() || "—";
}

function initials(e: OrgEmp | null): string {
  if (!e) return "CO";
  return `${(e.first_name ?? "?")[0] ?? ""}${(e.last_name ?? "?")[0] ?? ""}`.toUpperCase();
}

function buildTree(emps: OrgEmp[]): OrgNode {
  const byId = new Map<string, OrgNode>();
  emps.forEach(e => byId.set(e.id, { employee: e, children: [] }));

  const roots: OrgNode[] = [];
  emps.forEach(e => {
    const node = byId.get(e.id)!;
    const parent = e.reports_to ? byId.get(e.reports_to) : undefined;
    if (parent && parent !== node) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  if (roots.length === 1) return roots[0];
  return { employee: null, children: roots };
}

function NodeCard({
  node,
  depth,
  highlightId,
  defaultCollapsedFromDepth,
}: {
  node: OrgNode;
  depth: number;
  highlightId: string | null;
  defaultCollapsedFromDepth: number;
}) {
  const initialCollapsed = depth >= defaultCollapsedFromDepth && node.children.length > 0;
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const ref = useRef<HTMLDivElement>(null);

  const isMe = node.employee?.id === highlightId;
  const isVirtual = !node.employee;
  const hasChildren = node.children.length > 0;

  useEffect(() => {
    if (isMe && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }
  }, [isMe]);

  return (
    <div className="flex flex-col items-center">
      <div
        ref={ref}
        onClick={() => hasChildren && setCollapsed(c => !c)}
        className={[
          "w-48 px-3 py-2.5 border rounded-md transition-all duration-150 select-none",
          hasChildren ? "cursor-pointer" : "",
          isVirtual
            ? "bg-muted/50 border-dashed text-muted-foreground"
            : depth === 0
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card border-border hover:border-primary/50",
          isMe ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-md" : "",
        ].join(" ")}
      >
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8 shrink-0">
            {node.employee?.avatar_url && <AvatarImage src={node.employee.avatar_url} />}
            <AvatarFallback className="text-[10px] font-bold">{initials(node.employee)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-semibold truncate flex items-center gap-1">
              {fullName(node.employee)}
              {isMe && (
                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary-foreground/20 text-primary-foreground">
                  You
                </span>
              )}
            </p>
            <p className={`text-[10.5px] truncate ${depth === 0 && !isVirtual ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
              {node.employee?.designation || (isVirtual ? "All employees" : "—")}
            </p>
          </div>
          {hasChildren && (
            <span className={`shrink-0 ${depth === 0 && !isVirtual ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
              {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </span>
          )}
        </div>
        {hasChildren && (
          <p className={`mt-1 text-[10px] ${depth === 0 && !isVirtual ? "text-primary-foreground/60" : "text-muted-foreground/70"}`}>
            {node.children.length} direct report{node.children.length > 1 ? "s" : ""}
          </p>
        )}
      </div>

      {hasChildren && !collapsed && (
        <>
          <div className="w-px h-5 bg-border" />
          <div className="flex gap-4 relative">
            {node.children.length > 1 && (
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 h-px bg-border"
                style={{ width: `calc(100% - 192px)` }}
              />
            )}
            {node.children.map(child => (
              <div key={child.employee?.id ?? VIRTUAL_ROOT_ID} className="flex flex-col items-center">
                <div className="w-px h-5 bg-border" />
                <NodeCard
                  node={child}
                  depth={depth + 1}
                  highlightId={highlightId}
                  defaultCollapsedFromDepth={defaultCollapsedFromDepth}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function OrgChartPage() {
  const { clientId } = useAuth();
  const { scope } = useViewScope();
  const { data: currentEmp } = useCurrentEmployee();
  const [search, setSearch] = useState("");
  const [pinpointId, setPinpointId] = useState<string | null>(null);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["org-chart-employees", clientId],
    enabled: !!clientId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name, designation, department, avatar_url, reports_to, status")
        .eq("client_id", clientId!)
        .eq("status", "active")
        .order("first_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as OrgEmp[];
    },
  });

  const tree = useMemo(() => buildTree(employees), [employees]);

  const highlightId =
    pinpointId ?? (scope === "me" ? currentEmp?.id ?? null : null);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return employees
      .filter(e =>
        `${e.first_name ?? ""} ${e.last_name ?? ""}`.toLowerCase().includes(q) ||
        (e.designation ?? "").toLowerCase().includes(q) ||
        (e.department ?? "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [search, employees]);

  const handlePinpoint = (empId: string) => {
    setPinpointId(empId);
    setSearch("");
    setTimeout(() => setPinpointId(null), 4000);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Organization Chart" description="Company structure and reporting lines.">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employee..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
              {searchResults.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => handlePinpoint(emp.id)}
                  className="w-full text-left px-3 py-2 hover:bg-accent flex items-center justify-between text-sm"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-foreground">{fullName(emp)}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{emp.designation ?? "—"}</span>
                  </div>
                  <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </PageHeader>

      <div className="bg-card border rounded-lg" style={{ height: "calc(100vh - 220px)", minHeight: 480 }}>
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : employees.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground">No employees yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Add employees to see the org chart.
            </p>
          </div>
        ) : (
          <div className="h-full overflow-auto p-8">
            <div className="flex justify-center min-w-max">
              <NodeCard
                node={tree}
                depth={0}
                highlightId={highlightId}
                defaultCollapsedFromDepth={3}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
