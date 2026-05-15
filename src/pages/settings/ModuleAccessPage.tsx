import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";

import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState } from "@/components/LoadingState";
import { useClients } from "@/hooks/queries/useClients";
import { useTabDefinitions } from "@/hooks/queries/useTabAccess";
import { Save, RotateCcw, Info, Building2 } from "lucide-react";

const MODULE_META: Record<string, { label: string; emoji: string; order: number }> = {
  employees:   { label: "Employees",        emoji: "👥", order: 1 },
  payroll:     { label: "Payroll",          emoji: "💰", order: 2 },
  expenses:    { label: "Expense Tracking", emoji: "🧾", order: 3 },
  assets:      { label: "Assets",           emoji: "📦", order: 4 },
  performance: { label: "Performance",      emoji: "⭐", order: 5 },
  projects:    { label: "Projects",         emoji: "📂", order: 6 },
  reports:     { label: "Reports",          emoji: "📊", order: 7 },
  settings:    { label: "Settings",         emoji: "⚙️", order: 8 },
};

export default function ModuleAccessPage() {
  const { isSuperAdmin } = useRole();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: tabDefs, isLoading: defsLoading } = useTabDefinitions();

  useEffect(() => {
    if (!selectedClientId && clients && clients.length > 0) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  // Existing per-client tab access
  const { data: existing, isLoading } = useQuery({
    queryKey: ["sa-client-tab-access", selectedClientId],
    enabled: !!selectedClientId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("client_tab_access")
        .select("tab_key, enabled")
        .eq("client_id", selectedClientId!);
      if (error) throw error;
      const map = new Map<string, boolean>();
      for (const r of (data ?? []) as { tab_key: string; enabled: boolean }[]) {
        map.set(r.tab_key, r.enabled);
      }
      return map;
    },
  });

  // Local state: tab_key → enabled
  const [tabs, setTabs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!tabDefs || !existing) return;
    const next: Record<string, boolean> = {};
    for (const td of tabDefs) {
      // Settings tabs default-on; others default to whatever DB has (or false)
      const dbVal = existing.get(td.tab_key);
      next[td.tab_key] = dbVal ?? (td.module_key === "settings");
    }
    setTabs(next);
  }, [tabDefs, existing]);

  const dirty = useMemo(() => {
    if (!tabDefs || !existing) return false;
    for (const td of tabDefs) {
      const cur = tabs[td.tab_key] ?? false;
      const orig = existing.get(td.tab_key) ?? (td.module_key === "settings");
      if (cur !== orig) return true;
    }
    return false;
  }, [tabs, tabDefs, existing]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof tabDefs>();
    for (const td of tabDefs ?? []) {
      if (!map.has(td.module_key)) map.set(td.module_key, [] as any);
      (map.get(td.module_key) as any).push(td);
    }
    return Array.from(map.entries())
      .sort((a, b) => (MODULE_META[a[0]]?.order ?? 99) - (MODULE_META[b[0]]?.order ?? 99));
  }, [tabDefs]);

  const setTab = (key: string, on: boolean) =>
    setTabs((t) => ({ ...t, [key]: on }));

  const toggleModule = (moduleKey: string, on: boolean) => {
    const moduleTabs = (tabDefs ?? []).filter((t) => t.module_key === moduleKey);
    setTabs((prev) => {
      const next = { ...prev };
      for (const t of moduleTabs) next[t.tab_key] = on;
      return next;
    });
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!selectedClientId || !tabDefs) return;
      // Upsert all tab rows
      const rows = tabDefs.map((td) => ({
        client_id: selectedClientId,
        tab_key: td.tab_key,
        enabled: !!tabs[td.tab_key],
      }));
      const { error } = await (supabase as any)
        .from("client_tab_access")
        .upsert(rows, { onConflict: "client_id,tab_key" });
      if (error) throw error;

      // Keep clients.enabled_modules in sync with selected tabs (for module gates)
      const enabledModules = Array.from(
        new Set(
          tabDefs
            .filter((td) => tabs[td.tab_key] && td.module_key !== "settings")
            .map((td) => td.module_key),
        ),
      );
      const { error: cErr } = await (supabase as any)
        .from("clients")
        .update({ enabled_modules: enabledModules })
        .eq("id", selectedClientId);
      if (cErr) throw cErr;
    },
    onSuccess: () => {
      toast({
        title: "Tab access updated",
        description: "Changes apply immediately to this client and its users.",
      });
      qc.invalidateQueries({ queryKey: ["sa-client-tab-access", selectedClientId] });
      qc.invalidateQueries({ queryKey: ["accessible_tabs"] });
      qc.invalidateQueries({ queryKey: ["my_features"] });
    },
    onError: (err: Error) =>
      toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  const reset = () => {
    if (!tabDefs || !existing) return;
    const next: Record<string, boolean> = {};
    for (const td of tabDefs) {
      next[td.tab_key] = existing.get(td.tab_key) ?? (td.module_key === "settings");
    }
    setTabs(next);
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title="Module Access" description="Super admins only." />
        <Card className="p-6 text-center text-muted-foreground text-sm">
          Only super admins can manage tab access for clients.
        </Card>
      </div>
    );
  }

  const selectedClient = clients?.find((c) => c.id === selectedClientId);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Client Tab Access"
        description="Pick which sidebar tabs each client can see. Whatever you turn on here is what their admins and employees will see — nothing more."
      >
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={reset} disabled={!dirty || save.isPending}>
            <RotateCcw className="h-4 w-4 mr-1" /> Reset
          </Button>
          <Button size="sm" onClick={() => save.mutate()} disabled={!dirty || save.isPending || !selectedClientId}>
            <Save className="h-4 w-4 mr-1" />
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </PageHeader>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          Select Client
        </div>
        <Select value={selectedClientId ?? ""} onValueChange={setSelectedClientId} disabled={clientsLoading}>
          <SelectTrigger className="w-full md:w-[420px]">
            <SelectValue placeholder={clientsLoading ? "Loading clients…" : "Choose a client"} />
          </SelectTrigger>
          <SelectContent>
            {(clients ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.company_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedClient && (
          <p className="text-xs text-muted-foreground">
            Editing tab access for{" "}
            <span className="font-medium text-foreground">{selectedClient.company_name}</span>.
          </p>
        )}
      </Card>

      <Card className="p-4 flex items-start gap-3 bg-muted/30">
        <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
        <p className="text-xs text-muted-foreground">
          Each toggle below corresponds to one sidebar tab inside the client's workspace.
          Turn a tab off to hide it for everyone in this client (admins, HR and employees).
          Settings tabs control what's available inside the client's Settings area.
        </p>
      </Card>

      {!selectedClientId ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Select a client to manage their tab access.
        </Card>
      ) : isLoading || defsLoading ? (
        <LoadingState rows={6} variant="list" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {grouped.map(([moduleKey, moduleTabs]) => {
            const meta = MODULE_META[moduleKey] ?? { label: moduleKey, emoji: "📁", order: 99 };
            const enabledCount = (moduleTabs ?? []).filter((t) => tabs[t.tab_key]).length;
            const total = moduleTabs?.length ?? 0;
            const allOn = enabledCount === total;
            return (
              <Card key={moduleKey} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <span>{meta.emoji}</span>
                      {meta.label}
                      <Badge variant={enabledCount > 0 ? "secondary" : "outline"} className="text-[10px]">
                        {enabledCount}/{total}
                      </Badge>
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {enabledCount === 0
                        ? "All tabs hidden from this client."
                        : allOn
                          ? "All tabs visible."
                          : `${enabledCount} of ${total} tabs visible.`}
                    </p>
                  </div>
                  <Switch checked={allOn} onCheckedChange={(v) => toggleModule(moduleKey, v)} />
                </div>

                <div className="border-t pt-2 space-y-1.5">
                  {(moduleTabs ?? []).map((t) => {
                    const on = !!tabs[t.tab_key];
                    return (
                      <label
                        key={t.tab_key}
                        className="flex items-center justify-between gap-3 py-1.5 px-2 rounded hover:bg-muted/40 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium">{t.label}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {t.scope === "both" ? "Visible in Me + People" : "Visible in People only"}
                          </p>
                        </div>
                        <Switch checked={on} onCheckedChange={(v) => setTab(t.tab_key, v)} />
                      </label>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
