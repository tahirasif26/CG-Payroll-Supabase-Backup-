import { useState, useRef, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/PageHeader";
import { employees } from "@/data/mockData";
import { useActiveEmployees } from "@/hooks/useActiveEmployees";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, ChevronRight } from "lucide-react";

interface OrgNode {
  employee: typeof employees[0];
  reports: OrgNode[];
}

interface ReportMapping {
  [empId: string]: string;
}

function buildOrgTree(reportMap: ReportMapping, empList: typeof employees): OrgNode[] {
  const hierarchy = ["Partner", "Senior Manager", "Manager", "Senior Associate", "Associate", "Staff"];
  const hasCustom = Object.keys(reportMap).length > 0;

  if (hasCustom) {
    const nodeMap = new Map<string, OrgNode>();
    empList.forEach(e => nodeMap.set(e.id, { employee: e, reports: [] }));
    const roots: OrgNode[] = [];
    const hasParent = new Set<string>();
    Object.entries(reportMap).forEach(([empId, managerId]) => {
      const manager = nodeMap.get(managerId);
      const emp = nodeMap.get(empId);
      if (manager && emp && managerId !== empId) {
        manager.reports.push(emp);
        hasParent.add(empId);
      }
    });
    empList.forEach(e => {
      if (!hasParent.has(e.id)) roots.push(nodeMap.get(e.id)!);
    });
    return roots;
  }

  const grouped = hierarchy.map(level => empList.filter(e => e.designation === level));
  const tree: OrgNode[] = [];

  grouped[0].forEach(partner => {
    const partnerNode: OrgNode = { employee: partner, reports: [] };
    grouped[1].forEach(sm => {
      const smNode: OrgNode = { employee: sm, reports: [] };
      const managers = grouped[2].filter((_, i) => i % grouped[1].length === grouped[1].indexOf(sm));
      managers.forEach(mgr => {
        const mgrNode: OrgNode = { employee: mgr, reports: [] };
        const seniors = grouped[3].filter((_, i) => i % Math.max(managers.length, 1) === managers.indexOf(mgr));
        seniors.forEach(sr => {
          const srNode: OrgNode = { employee: sr, reports: [] };
          const associates = grouped[4].filter((_, i) => i % Math.max(seniors.length, 1) === seniors.indexOf(sr));
          associates.forEach(assoc => srNode.reports.push({ employee: assoc, reports: [] }));
          mgrNode.reports.push(srNode);
        });
        const staff = grouped[5].filter((_, i) => i % Math.max(managers.length, 1) === managers.indexOf(mgr));
        staff.forEach(s => mgrNode.reports.push({ employee: s, reports: [] }));
        smNode.reports.push(mgrNode);
      });
      partnerNode.reports.push(smNode);
    });
    tree.push(partnerNode);
  });

  const inTree = new Set<string>();
  function collect(nodes: OrgNode[]) {
    nodes.forEach(n => { inTree.add(n.employee.id); collect(n.reports); });
  }
  collect(tree);
  empList.filter(e => !inTree.has(e.id)).forEach(e => tree.push({ employee: e, reports: [] }));
  return tree;
}

function getManagerName(reportMap: ReportMapping, empId: string, empList: typeof employees): string | null {
  const managerId = reportMap[empId];
  if (!managerId) return null;
  const mgr = empList.find(e => e.id === managerId);
  return mgr ? `${mgr.firstName} ${mgr.lastName}` : null;
}

function OrgNodeCard({
  node,
  level = 0,
  onClickEmployee,
  highlightId,
}: {
  node: OrgNode;
  level?: number;
  onClickEmployee: (emp: typeof employees[0]) => void;
  highlightId: string | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isHighlighted = highlightId === node.employee.id;

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
        className={`
          w-44 px-4 py-3 border cursor-pointer transition-all
          ${level === 0 ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary/50"}
          ${isHighlighted ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg scale-105" : ""}
        `}
      >
        <p className={`text-sm font-semibold truncate ${level === 0 ? "" : "text-foreground"}`}>
          {node.employee.firstName} {node.employee.lastName}
        </p>
        <p className={`text-[11px] truncate ${level === 0 ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
          {node.employee.designation}
        </p>
      </div>
      {node.reports.length > 0 && (
        <>
          <div className="w-px h-5 bg-border" />
          <div className="flex gap-3 relative">
            {node.reports.length > 1 && (
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 h-px bg-border"
                style={{ width: `calc(100% - 176px)` }}
              />
            )}
            {node.reports.map(child => (
              <div key={child.employee.id} className="flex flex-col items-center">
                <div className="w-px h-5 bg-border" />
                <OrgNodeCard node={child} level={level + 1} onClickEmployee={onClickEmployee} highlightId={highlightId} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function OrgChartPage() {
  const activeEmployees = useActiveEmployees();
  const [reportMap, setReportMap] = useState<ReportMapping>({});
  const [editEmp, setEditEmp] = useState<typeof employees[0] | null>(null);
  const [selectedManager, setSelectedManager] = useState("");
  const [search, setSearch] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const { toast } = useToast();

  const tree = buildOrgTree(reportMap, activeEmployees);

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

  const handleSaveReportTo = () => {
    if (!editEmp) return;
    if (selectedManager === "__none__") {
      setReportMap(prev => {
        const next = { ...prev };
        delete next[editEmp.id];
        return next;
      });
    } else if (selectedManager) {
      setReportMap(prev => ({ ...prev, [editEmp.id]: selectedManager }));
    }
    toast({ title: "Updated", description: `Reporting line updated for ${editEmp.firstName} ${editEmp.lastName}.` });
    setEditEmp(null);
    setSelectedManager("");
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
              onClickEmployee={(emp) => {
                setEditEmp(emp);
                setSelectedManager(reportMap[emp.id] || "");
              }}
              highlightId={highlightId}
            />
          ))}
        </div>
      </div>

      <Dialog open={!!editEmp} onOpenChange={(open) => { if (!open) { setEditEmp(null); setSelectedManager(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Reporting Line</DialogTitle>
            <DialogDescription>
              {editEmp && `${editEmp.firstName} ${editEmp.lastName} — ${editEmp.designation}`}
            </DialogDescription>
          </DialogHeader>
          {editEmp && (
            <div className="space-y-4">
              {getManagerName(reportMap, editEmp.id, activeEmployees) && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Currently reports to: </span>
                  <span className="font-medium text-foreground">{getManagerName(reportMap, editEmp.id, activeEmployees)}</span>
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
            <Button variant="outline" onClick={() => { setEditEmp(null); setSelectedManager(""); }}>Cancel</Button>
            <Button onClick={handleSaveReportTo}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
