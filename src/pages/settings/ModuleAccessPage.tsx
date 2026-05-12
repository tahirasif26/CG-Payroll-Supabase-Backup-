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
import { MODULE_CATALOG } from "@/lib/feature-catalog";
import { useClients } from "@/hooks/queries/useClients";
import { Save, RotateCcw, Info, Building2 } from "lucide-react";

export default function ModuleAccessPage() {
  const { isSuperAdmin } = useRole();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const { data: clients, isLoading: clientsLoading } = useClients();

  // Auto-select first client
  useEffect(() => {
    if (!selectedClientId && clients && clients.length > 0) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  const { data, isLoading } = useQuery({
    queryKey: ["sa-client-module-access", selectedClientId],
    enabled: !!selectedClientId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("clients")
        .select("enabled_modules, enabled_features")
        .eq("id", selectedClientId!)
        .maybeSingle();
      if (error) throw error;
      return {
        modules: (data?.enabled_modules ?? []) as string[],
        // Treat null as empty — new features must be opted in explicitly.
        features: (data?.enabled_features ?? []) as string[],
      };
    },
  });

  const [modules, setModules] = useState<string[]>([]);
  const [features, setFeatures] = useState<string[]>([]);

  useEffect(() => {
    if (!data) return;
    setModules(data.modules ?? []);
    setFeatures(data.features ?? []);
  }, [data]);

  const dirty = useMemo(() => {
    if (!data) return false;
    const a = JSON.stringify([...modules].sort());
    const b = JSON.stringify([...(data.modules ?? [])].sort());
    const c = JSON.stringify([...features].sort());
    const d = JSON.stringify([...(data.features ?? [])].sort());
    return a !== b || c !== d;
  }, [modules, features, data]);

  const toggleModule = (key: string, on: boolean) => {
    const moduleFeatureKeys = MODULE_CATALOG.find((m) => m.key === key)?.features.map((f) => f.key) ?? [];
    if (on) {
      setModules((m) => Array.from(new Set([...m, key])));
      setFeatures((f) => Array.from(new Set([...f, ...moduleFeatureKeys])));
    } else {
      setModules((m) => m.filter((k) => k !== key));
      setFeatures((f) => f.filter((k) => !moduleFeatureKeys.includes(k)));
    }
  };

  const toggleFeature = (moduleKey: string, featureKey: string, on: boolean) => {
    if (on) {
      setFeatures((f) => Array.from(new Set([...f, featureKey])));
      setModules((m) => (m.includes(moduleKey) ? m : [...m, moduleKey]));
    } else {
      setFeatures((f) => f.filter((k) => k !== featureKey));
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!selectedClientId) return;
      const { error } = await (supabase as any)
        .from("clients")
        .update({ enabled_modules: modules, enabled_features: features })
        .eq("id", selectedClientId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Module access updated",
        description: "Changes will apply to this client and all of its employees.",
      });
      qc.invalidateQueries({ queryKey: ["sa-client-module-access", selectedClientId] });
      qc.invalidateQueries({ queryKey: ["my_features"] });
    },
    onError: (err: Error) =>
      toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  const reset = () => {
    if (!data) return;
    setModules(data.modules ?? []);
    setFeatures(data.features ?? []);
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title="Module Access" description="Super admins only." />
        <Card className="p-6 text-center text-muted-foreground text-sm">
          Only super admins can manage module access for clients.
        </Card>
      </div>
    );
  }

  const selectedClient = clients?.find((c) => c.id === selectedClientId);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Client Module Access"
        description="Enable or disable modules and features for each client. New features stay disabled until you turn them on here."
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
            Editing access for <span className="font-medium text-foreground">{selectedClient.company_name}</span>. Changes apply to this client and all of its employees.
          </p>
        )}
      </Card>

      <Card className="p-4 flex items-start gap-3 bg-muted/30">
        <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
        <p className="text-xs text-muted-foreground">
          Disabling a module immediately hides it from every user in the selected client.
          Newly released features always appear here as <strong>off</strong> — you must toggle them on manually before the client and its employees can use them.
        </p>
      </Card>

      {!selectedClientId ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">Select a client to manage their module access.</Card>
      ) : isLoading ? (
        <LoadingState rows={6} variant="list" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {MODULE_CATALOG.map((m) => {
            const moduleOn = modules.includes(m.key);
            const enabledCount = m.features.filter((f) => features.includes(f.key)).length;
            return (
              <Card key={m.key} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      {m.label}
                      {moduleOn ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {enabledCount}/{m.features.length}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Off</Badge>
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {moduleOn ? "Module is visible to this client." : "Hidden from this client."}
                    </p>
                  </div>
                  <Switch checked={moduleOn} onCheckedChange={(v) => toggleModule(m.key, v)} />
                </div>

                {moduleOn && (
                  <div className="border-t pt-2 space-y-1.5">
                    {m.features.map((f) => {
                      const on = features.includes(f.key);
                      return (
                        <label
                          key={f.key}
                          className="flex items-center justify-between gap-3 py-1.5 px-2 rounded hover:bg-muted/40 cursor-pointer"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-medium">{f.label}</p>
                            {f.description && (
                              <p className="text-[11px] text-muted-foreground">{f.description}</p>
                            )}
                          </div>
                          <Switch
                            checked={on}
                            onCheckedChange={(v) => toggleFeature(m.key, f.key, v)}
                          />
                        </label>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
