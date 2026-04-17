import { useState, useRef, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useEmployees as useEmployeesCtx } from "@/contexts/EmployeeContext";
import { useActiveEmployees } from "@/hooks/useActiveEmployees";
import type { Employee } from "@/types/hcm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useReporting } from "@/contexts/ReportingContext";
import { Search, ChevronRight } from "lucide-react";

interface OrgNode {
  employee: Employee;
  reports: OrgNode[];
}

function buildOrgTree(reportMap: Record<string, string>, empList: Employee[]): OrgNode[] {
  const nodeMap = new Map<string, OrgNode>();
  empList.forEach(e => nodeMap.set(e.id, { employee: e, reports: [] }));

  const hasParent = new Set<string>();
  Object.entries(reportMap).forEach(([empId, managerId]) => {
    const manager = nodeMap.get(managerId);
    const emp = nodeMap.get(empId);
    if (manager && emp && managerId !== empId) {
      manager.reports.push(emp);
      hasParent.add(empId);
    }
  });

  const roots: OrgNode[] = [];
  empList.forEach(e => {
    if (!hasParent.has(e.id)) roots.push(nodeMap.get(e.id)!);
  });
  return roots;
}

// Collect all descendant IDs from a node
function collectDescendantIds(node: OrgNode): Set<string> {
  const ids = new Set<string>();
  function walk(n: OrgNode) {
    n.reports.forEach(child => {
      ids.add(child.employee.id);
      walk(child);
    });
  }
  walk(node);
  return ids;
}

function OrgNodeCard({
  node, level = 0, onClickEmployee, highlightId, hoveredParentId, onHoverNode,
}: {
  node: OrgNode;
  level?: number;
  onClickEmployee: (emp: Employee) => void;
  highlightId: string | null;
  hoveredParentId: string | null;
  onHoverNode: (empId: string | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isHighlighted = highlightId === node.employee.id;
  const isHoveredParent = hoveredParentId === node.employee.id;

  // Check if this node is a descendant of the hovered parent
  const descendantIds = useMemo(() => {
    if (isHoveredParent) return collectDescendantIds(node);
    return new Set<string>();
  }, [isHoveredParent, node]);

  useEffect(() => {
    if (isHighlighted && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }
  }, [isHighlighted]);

  const hasReports = node.reports.length > 0;

  return (
    <div className="flex flex-col items-center">
      <div
        ref={ref}
        onClick={() => onClickEmployee(node.employee)}
        onMouseEnter={() => { if (hasReports) onHoverNode(node.employee.id); }}
        onMouseLeave={() => { if (hasReports) onHoverNode(null); }}
        className={`
          w-44 px-4 py-3 border cursor-pointer transition-all duration-200
          ${level === 0
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-card border-border hover:border-primary/50"
          }
          ${isHighlighted ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg scale-105" : ""}
          ${isHoveredParent ? "ring-2 ring-primary shadow-md" : ""}
        `}
      >
        <p className={`text-sm font-semibold truncate ${level === 0 ? "" : "text-foreground"}`}>
          {node.employee.firstName} {node.employee.lastName}
        </p>
        <p className={`text-[11px] truncate ${level === 0 ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
          {node.employee.designation}
        </p>
        {hasReports && (
          <p className={`text-[10px] mt-0.5 ${level === 0 ? "text-primary-foreground/50" : "text-muted-foreground/60"}`}>
            {node.reports.length} direct report{node.reports.length > 1 ? "s" : ""}
          </p>
        )}
      </div>
      {hasReports && (
        <>
          <div className={`w-px h-5 transition-colors duration-200 ${isHoveredParent ? "bg-primary" : "bg-border"}`} />
          <div className="flex gap-3 relative">
            {node.reports.length > 1 && (
              <div
                className={`absolute top-0 left-1/2 -translate-x-1/2 h-px transition-colors duration-200 ${isHoveredParent ? "bg-primary" : "bg-border"}`}
                style={{ width: `calc(100% - 176px)` }}
              />
            )}
            {node.reports.map(child => (
              <div key={child.employee.id} className="flex flex-col items-center">
                <div className={`w-px h-5 transition-colors duration-200 ${isHoveredParent ? "bg-primary" : "bg-border"}`} />
                <ChildOrgNodeCard
                  node={child}
                  level={level + 1}
                  onClickEmployee={onClickEmployee}
                  highlightId={highlightId}
                  hoveredParentId={hoveredParentId}
                  onHoverNode={onHoverNode}
                  isUnderHoveredParent={isHoveredParent}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ChildOrgNodeCard({
  node, level = 0, onClickEmployee, highlightId, hoveredParentId, onHoverNode, isUnderHoveredParent,
}: {
  node: OrgNode;
  level?: number;
  onClickEmployee: (emp: Employee) => void;
  highlightId: string | null;
  hoveredParentId: string | null;
  onHoverNode: (empId: string | null) => void;
  isUnderHoveredParent: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isHighlighted = highlightId === node.employee.id;
  const isHoveredParent = hoveredParentId === node.employee.id;
  const hasReports = node.reports.length > 0;

  useEffect(() => {
    if (isHighlighted && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }
  }, [isHighlighted]);

  return (
    <div className="flex flex-col items-center">
      <div
        ref={ref}
        onClick={() => onClickEmployee(node.employee)}
        onMouseEnter={() => { if (hasReports) onHoverNode(node.employee.id); }}
        onMouseLeave={() => { if (hasReports) onHoverNode(null); }}
        className={`
          w-44 px-4 py-3 border cursor-pointer transition-all duration-200
          ${isUnderHoveredParent ? "bg-primary/10 border-primary/40 shadow-sm" : "bg-card border-border hover:border-primary/50"}
          ${isHighlighted ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg scale-105" : ""}
          ${isHoveredParent ? "ring-2 ring-primary shadow-md" : ""}
        `}
      >
        <p className="text-sm font-semibold truncate text-foreground">
          {node.employee.firstName} {node.employee.lastName}
        </p>
        <p className="text-[11px] truncate text-muted-foreground">
          {node.employee.designation}
        </p>
        {hasReports && (
          <p className="text-[10px] mt-0.5 text-muted-foreground/60">
            {node.reports.length} direct report{node.reports.length > 1 ? "s" : ""}
          </p>
        )}
      </div>
      {hasReports && (
        <>
          <div className={`w-px h-5 transition-colors duration-200 ${isHoveredParent || isUnderHoveredParent ? "bg-primary" : "bg-border"}`} />
          <div className="flex gap-3 relative">
            {node.reports.length > 1 && (
              <div
                className={`absolute top-0 left-1/2 -translate-x-1/2 h-px transition-colors duration-200 ${isHoveredParent || isUnderHoveredParent ? "bg-primary" : "bg-border"}`}
                style={{ width: `calc(100% - 176px)` }}
              />
            )}
            {node.reports.map(child => (
              <div key={child.employee.id} className="flex flex-col items-center">
                <div className={`w-px h-5 transition-colors duration-200 ${isHoveredParent || isUnderHoveredParent ? "bg-primary" : "bg-border"}`} />
                <ChildOrgNodeCard
                  node={child}
                  level={level + 1}
                  onClickEmployee={onClickEmployee}
                  highlightId={highlightId}
                  hoveredParentId={hoveredParentId}
                  onHoverNode={onHoverNode}
                  isUnderHoveredParent={isHoveredParent || isUnderHoveredParent}
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
  const { employees } = useEmployeesCtx();
  const activeEmployees = useActiveEmployees();
  const { reportMap, setReportTo, getManagerName, getManagerId } = useReporting();
  const [editEmp, setEditEmp] = useState<Employee | null>(null);
  const [selectedManager, setSelectedManager] = useState("__none__");
  const [search, setSearch] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [hoveredParentId, setHoveredParentId] = useState<string | null>(null);
  const { toast } = useToast();

  const tree = useMemo(() => buildOrgTree(reportMap, activeEmployees), [reportMap, activeEmployees]);

  const searchResults = search.trim()
    ? activeEmployees.filter(e =>
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        e.designation.toLowerCase().includes(search.toLowerCase()) ||
        e.department.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const handlePinpoint = (empId: string) => {
    setHighlightId(empId);
    setSearch("");
    setTimeout(() => setHighlightId(null), 3000);
  };

  const openEditDialog = (emp: Employee) => {
    setEditEmp(emp);
    const currentMgr = getManagerId(emp.id);
    setSelectedManager(currentMgr || "__none__");
  };

  const handleSaveReportTo = () => {
    if (!editEmp) return;
    const currentMgr = getManagerId(editEmp.id);
    const newMgr = selectedManager === "__none__" ? null : selectedManager;

    // Only update if there's an actual change
    if (newMgr !== currentMgr) {
      setReportTo(editEmp.id, newMgr);
      toast({ title: "Updated", description: `Reporting line updated for ${editEmp.firstName} ${editEmp.lastName}.` });
    }
    setEditEmp(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Organization Chart" description="Company structure and reporting lines.">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
              {searchResults.map(emp => (
                <button key={emp.id} onClick={() => handlePinpoint(emp.id)} className="w-full text-left px-3 py-2 hover:bg-accent flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-foreground">{emp.firstName} {emp.lastName}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{emp.designation}</span>
                  </div>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>
      </PageHeader>

      <div className="bg-card border rounded-lg p-8 overflow-x-auto">
        <div className="flex justify-center gap-6 min-w-max">
          {tree.map(node => (
            <OrgNodeCard
              key={node.employee.id}
              node={node}
              onClickEmployee={openEditDialog}
              highlightId={highlightId}
              hoveredParentId={hoveredParentId}
              onHoverNode={setHoveredParentId}
            />
          ))}
        </div>
      </div>

      <Dialog open={!!editEmp} onOpenChange={(open) => { if (!open) setEditEmp(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Reporting Line</DialogTitle>
            <DialogDescription>{editEmp && `${editEmp.firstName} ${editEmp.lastName} — ${editEmp.designation}`}</DialogDescription>
          </DialogHeader>
          {editEmp && (
            <div className="space-y-4">
              {getManagerName(editEmp.id) && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Currently reports to: </span>
                  <span className="font-medium text-foreground">{getManagerName(editEmp.id)}</span>
                </div>
              )}
              <div className="space-y-2">
                <Label>Reports To</Label>
                <Select value={selectedManager} onValueChange={setSelectedManager}>
                  <SelectTrigger><SelectValue placeholder="Select manager..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No Manager (Top Level)</SelectItem>
                    {activeEmployees.filter(e => e.id !== editEmp.id).map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} — {e.designation}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEmp(null)}>Cancel</Button>
            <Button onClick={handleSaveReportTo}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
