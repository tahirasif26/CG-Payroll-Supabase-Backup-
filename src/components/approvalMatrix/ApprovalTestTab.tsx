import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PlayCircle, ShieldCheck, ShieldAlert, ArrowRight, Users } from "lucide-react";
import type {
  ApprovalGroup,
  ApprovalPolicy,
  PolicyCategory,
} from "@/hooks/queries/useApprovalMatrix";

const CATEGORIES: { key: PolicyCategory; label: string; unit: "money" | "days" }[] = [
  { key: "expenses", label: "Expenses", unit: "money" },
  { key: "leave", label: "Leave", unit: "days" },
  { key: "loans", label: "Loans", unit: "money" },
  { key: "advances", label: "Advances", unit: "money" },
  { key: "assets", label: "Assets", unit: "money" },
];

interface TestResult {
  routedTo: "group" | "admins" | "none";
  groupId: string | null;
  groupName: string | null;
  matchedPolicy: ApprovalPolicy | null;
  approvers: { employee_id: string; via_delegation: boolean }[];
  adminFallbackCount?: number;
}

interface Props {
  clientId: string | null;
  groups: ApprovalGroup[];
  policies: ApprovalPolicy[];
  empMap: Map<string, { name: string; avatar: string | null }>;
}

const initials = (name: string) =>
  name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase() || "?";

export function ApprovalTestTab({ clientId, groups, policies, empMap }: Props) {
  const [category, setCategory] = useState<PolicyCategory>("expenses");
  const [valueInput, setValueInput] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const cat = useMemo(() => CATEGORIES.find((c) => c.key === category)!, [category]);

  // Convert UI value (SAR for money, days for leave) to stored unit (halalas / days).
  const toStored = (v: string): number => {
    const n = Number(v);
    if (isNaN(n)) return 0;
    return cat.unit === "money" ? Math.round(n * 100) : Math.round(n);
  };

  async function runTest() {
    if (!clientId) return;
    setRunning(true);
    setResult(null);
    try {
      const stored = toStored(valueInput || "0");

      // 1) Resolve policy → group
      const { data: gid } = await (supabase as any).rpc("resolve_approval_group", {
        _client_id: clientId,
        _category: category,
        _value: stored,
      });
      const groupId = (gid as string | null) ?? null;
      const matchedPolicy =
        policies.find(
          (p) =>
            p.category === category &&
            p.group_id === groupId &&
            p.min_value <= stored &&
            (p.max_value == null || p.max_value >= stored),
        ) ?? null;

      if (!groupId) {
        // Fallback path → notify_client_admins
        const { count } = await (supabase as any)
          .from("user_roles")
          .select("user_id", { count: "exact", head: true })
          .eq("client_id", clientId)
          .eq("role", "admin");
        setResult({
          routedTo: "admins",
          groupId: null,
          groupName: null,
          matchedPolicy: null,
          approvers: [],
          adminFallbackCount: count ?? 0,
        });
        return;
      }

      const groupName = groups.find((g) => g.id === groupId)?.name ?? "Group";

      // 2) Resolve active approvers (delegation-aware)
      const { data: appr } = await (supabase as any).rpc("get_active_approvers", {
        _group_id: groupId,
      });
      const approvers = Array.isArray(appr) ? appr : [];

      if (approvers.length === 0) {
        const { count } = await (supabase as any)
          .from("user_roles")
          .select("user_id", { count: "exact", head: true })
          .eq("client_id", clientId)
          .eq("role", "admin");
        setResult({
          routedTo: "admins",
          groupId,
          groupName,
          matchedPolicy,
          approvers: [],
          adminFallbackCount: count ?? 0,
        });
        return;
      }

      setResult({
        routedTo: "group",
        groupId,
        groupName,
        matchedPolicy,
        approvers,
      });
    } finally {
      setRunning(false);
    }
  }

  const fmtPolicyRange = (p: ApprovalPolicy) => {
    const fmt = (v: number | null) =>
      v == null
        ? "∞"
        : cat.unit === "money"
          ? `SAR ${(v / 100).toLocaleString()}`
          : `${v} d`;
    return `${fmt(p.min_value)} – ${fmt(p.max_value)}`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold">Live test mode</h3>
            <span className="text-xs text-muted-foreground">
              Simulates a request without creating one — uses live policies & active delegations.
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] items-end">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as PolicyCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{cat.unit === "money" ? "Amount (SAR)" : "Days"}</Label>
              <Input
                type="number"
                min={0}
                value={valueInput}
                onChange={(e) => setValueInput(e.target.value)}
                placeholder={cat.unit === "money" ? "e.g. 5000" : "e.g. 5"}
              />
            </div>
            <Button onClick={runTest} disabled={running || !clientId}>
              {running ? "Routing…" : "Run test"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardContent className="p-6 space-y-5">
            {/* Outcome banner */}
            <div className="flex items-start gap-3">
              {result.routedTo === "group" ? (
                <ShieldCheck className="h-5 w-5 text-emerald-600 mt-0.5" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-semibold">
                  {result.routedTo === "group"
                    ? `Routed to group: ${result.groupName}`
                    : `Fallback → notify all client admins (${result.adminFallbackCount ?? 0} admin${(result.adminFallbackCount ?? 0) === 1 ? "" : "s"})`}
                </div>
                <div className="text-xs text-muted-foreground">
                  {result.routedTo === "group" && result.matchedPolicy
                    ? `Matched policy band ${fmtPolicyRange(result.matchedPolicy)} (sort_order ${result.matchedPolicy.sort_order})`
                    : result.groupId
                      ? "Group has no members → falls back to admins"
                      : "No policy matched this category/value → falls back to admins"}
                </div>
              </div>
            </div>

            {/* Approver chain */}
            {result.routedTo === "group" && result.approvers.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Users className="h-4 w-4" />
                  Active approvers ({result.approvers.length})
                </div>
                <div className="space-y-2">
                  {result.approvers.map((a) => {
                    const emp = empMap.get(a.employee_id);
                    return (
                      <div
                        key={a.employee_id}
                        className="flex items-center gap-3 p-2 rounded-md border bg-muted/30"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={emp?.avatar ?? undefined} />
                          <AvatarFallback>{initials(emp?.name ?? "?")}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{emp?.name ?? a.employee_id}</div>
                        </div>
                        {a.via_delegation && (
                          <Badge variant="outline" className="gap-1">
                            <ArrowRight className="h-3 w-3" />
                            via delegation
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
