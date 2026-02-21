import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { employees } from "@/data/mockData";
import { useActiveEmployees } from "@/hooks/useActiveEmployees";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface OrgNode {
  employee: typeof employees[0];
  reports: OrgNode[];
}

interface ReportMapping {
  [empId: string]: string; // empId -> reportsToEmpId
}

function buildOrgTree(reportMap: ReportMapping, empList: typeof employees): OrgNode[] {
  const hierarchy = ["Partner", "Senior Manager", "Manager", "Senior Associate", "Associate", "Staff"];
  
  // Check if we have custom mappings
  const hasCustom = Object.keys(reportMap).length > 0;
  
  if (hasCustom) {
    // Build tree from reportMap
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

  // Default hierarchy-based tree
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

function OrgNodeCard({ node, level = 0, onClickEmployee }: { node: OrgNode; level?: number; onClickEmployee: (emp: typeof employees[0]) => void }) {
  return (
    <div className="flex flex-col items-center">
      <Card
        className={`w-48 cursor-pointer hover:shadow-md transition-shadow ${level === 0 ? 'border-primary border-2' : ''}`}
        onClick={() => onClickEmployee(node.employee)}
      >
        <CardContent className="p-4 text-center">
          <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center mx-auto mb-2">
            <span className="text-xs font-bold text-secondary-foreground">
              {node.employee.firstName[0]}{node.employee.lastName[0]}
            </span>
          </div>
          <p className="text-sm font-semibold truncate">{node.employee.firstName} {node.employee.lastName}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{node.employee.designation}</p>
          <p className="text-[10px] text-primary font-medium">{node.employee.department}</p>
        </CardContent>
      </Card>
      {node.reports.length > 0 && (
        <>
          <div className="w-px h-6 bg-border" />
          <div className="flex gap-4 relative">
            {node.reports.length > 1 && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px bg-border"
                style={{ width: `${(node.reports.length - 1) * 100}%` }} />
            )}
            {node.reports.map(child => (
              <div key={child.employee.id} className="flex flex-col items-center">
                <div className="w-px h-6 bg-border" />
                <OrgNodeCard node={child} level={level + 1} onClickEmployee={onClickEmployee} />
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
  const { toast } = useToast();

  const tree = buildOrgTree(reportMap, activeEmployees);

  const handleSaveReportTo = () => {
    if (!editEmp) return;
    if (selectedManager === "__none__") {
      // Remove mapping (make root)
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
      <PageHeader title="Organization Chart" description="Company organizational structure and reporting lines. Click any employee to change their reporting line." />

      <div className="bg-card rounded-xl border p-8 overflow-x-auto">
        <div className="flex justify-center gap-8">
          {tree.map(node => (
            <OrgNodeCard key={node.employee.id} node={node} onClickEmployee={(emp) => {
              setEditEmp(emp);
              setSelectedManager(reportMap[emp.id] || "");
            }} />
          ))}
        </div>
      </div>

      {/* Directory view */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {activeEmployees.map(emp => (
          <Card key={emp.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => {
            setEditEmp(emp);
            setSelectedManager(reportMap[emp.id] || "");
          }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-secondary-foreground">{emp.firstName[0]}{emp.lastName[0]}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{emp.firstName} {emp.lastName}</p>
                  <p className="text-xs text-muted-foreground">{emp.designation}</p>
                  <p className="text-xs text-primary font-medium">{emp.department}</p>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
                <p className="text-xs text-muted-foreground">{emp.phone}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Report To Dialog */}
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
