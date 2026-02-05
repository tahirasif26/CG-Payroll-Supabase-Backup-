import { PageHeader } from "@/components/PageHeader";
import { employees } from "@/data/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";

interface OrgNode {
  employee: typeof employees[0];
  reports: OrgNode[];
}

function buildOrgTree(): OrgNode[] {
  // Simulate hierarchy: Partner -> Senior Manager -> Manager -> Senior Associate -> Associate -> Staff
  const hierarchy = ["Partner", "Senior Manager", "Manager", "Senior Associate", "Associate", "Staff"];
  
  const grouped = hierarchy.map(level => employees.filter(e => e.designation === level));
  
  // Build a simple tree
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
          associates.forEach(assoc => {
            const assocNode: OrgNode = { employee: assoc, reports: [] };
            srNode.reports.push(assocNode);
          });
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

  // Add anyone not in tree
  const inTree = new Set<string>();
  function collect(nodes: OrgNode[]) {
    nodes.forEach(n => { inTree.add(n.employee.id); collect(n.reports); });
  }
  collect(tree);
  employees.filter(e => !inTree.has(e.id)).forEach(e => {
    tree.push({ employee: e, reports: [] });
  });

  return tree;
}

function OrgNodeCard({ node, level = 0 }: { node: OrgNode; level?: number }) {
  return (
    <div className="flex flex-col items-center">
      <Card className={`w-48 ${level === 0 ? 'border-primary border-2' : ''}`}>
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
                <OrgNodeCard node={child} level={level + 1} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function OrgChartPage() {
  const tree = buildOrgTree();

  return (
    <div className="space-y-6">
      <PageHeader title="Organization Chart" description="Company organizational structure and reporting lines." />

      <div className="bg-card rounded-xl border p-8 overflow-x-auto">
        <div className="flex justify-center gap-8">
          {tree.map(node => (
            <OrgNodeCard key={node.employee.id} node={node} />
          ))}
        </div>
      </div>

      {/* Directory view */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {employees.map(emp => (
          <Card key={emp.id} className="hover:shadow-md transition-shadow cursor-pointer">
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
    </div>
  );
}
