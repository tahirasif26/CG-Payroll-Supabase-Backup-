import React, { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { usePolicy, PolicyCategory } from "@/contexts/PolicyContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, CheckCircle2, Clock, Search } from "lucide-react";
import { toast } from "sonner";
import { useMyPolicyAcks, useAcknowledgePolicy } from "@/hooks/queries/usePolicyAcks";
import { useViewScope } from "@/contexts/ViewScopeContext";
import { useRole } from "@/contexts/RoleContext";
import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";

const categoryLabels: Record<PolicyCategory, string> = {
  hr: "HR",
  finance: "Finance",
  it: "IT",
  "health-safety": "Health & Safety",
  general: "General",
};

const categoryColors: Record<PolicyCategory, string> = {
  hr: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  finance: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  it: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "health-safety": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  general: "bg-muted text-muted-foreground",
};

const CURRENT_EMPLOYEE_ID = "emp-current";

export default function CompanyPoliciesPage() {
  const { policies, acknowledgePolicy } = usePolicy();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const { data: ackedSet } = useMyPolicyAcks();
  const ackMutation = useAcknowledgePolicy();
  const { scope } = useViewScope();
  const { appRole } = useRole();
  const canAcknowledge = scope === "people" && (appRole === "admin" || appRole === "hr");

  const isAcked = (policyId: string, fallback: boolean) =>
    ackedSet?.has(policyId) ?? fallback;

  const activePolicies = policies.filter((p) => p.status === "active");

  const filtered = activePolicies.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
    const matchesCat = activeTab === "all" || p.category === activeTab;
    return matchesSearch && matchesCat;
  });

  const pendingCount = activePolicies.filter(
    (p) => p.requiresAck && !isAcked(p.id, p.acknowledgments.includes(CURRENT_EMPLOYEE_ID))
  ).length;

  const handleAcknowledge = (policyId: string) => {
    acknowledgePolicy(policyId, CURRENT_EMPLOYEE_ID);
    ackMutation.mutate(policyId);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Policies"
        description="View and acknowledge company policy documents"
      />

      {pendingCount > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <CardContent className="py-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              You have {pendingCount} {pendingCount === 1 ? "policy" : "policies"} pending acknowledgment
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <TabsTrigger key={key} value={key}>{label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative flex-1 w-full sm:max-w-xs ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search policies..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="grid gap-4">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No policies found</p>
              <p className="text-sm mt-1">Try adjusting your search or filter</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((policy) => {
            const isAcknowledged = isAcked(policy.id, policy.acknowledgments.includes(CURRENT_EMPLOYEE_ID));
            const needsAck = policy.requiresAck && !isAcknowledged;

            return (
              <Card key={policy.id} className={needsAck ? "border-amber-200 dark:border-amber-800" : ""}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="rounded-lg bg-muted p-2.5 shrink-0">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm">{policy.title}</h3>
                          <Badge variant="secondary" className={`text-[10px] ${categoryColors[policy.category]}`}>
                            {categoryLabels[policy.category]}
                          </Badge>
                          {needsAck && (
                            <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-600 dark:text-amber-400">
                              Pending
                            </Badge>
                          )}
                          {isAcknowledged && (
                            <Badge variant="outline" className="text-[10px] border-green-400 text-green-600 dark:text-green-400 gap-0.5">
                              <CheckCircle2 className="h-3 w-3" /> Acknowledged
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{policy.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>Effective: {policy.effectiveDate}</span>
                          <span>•</span>
                          <span>v{policy.version}</span>
                          <span>•</span>
                          <span>{policy.fileName}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                        <Download className="h-3.5 w-3.5" /> Download
                      </Button>
                      {needsAck && canAcknowledge && (
                        <Button size="sm" className="gap-1.5 text-xs" onClick={() => handleAcknowledge(policy.id)}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Acknowledge
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
