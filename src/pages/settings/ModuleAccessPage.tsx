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
import { LoadingState } from "@/components/LoadingState";
import { MODULE_CATALOG, allFeaturesForModules } from "@/lib/feature-catalog";
import { Save, RotateCcw, Info } from "lucide-react";

export default function ModuleAccessPage() {
  const { clientId, appRole } = useRole();
  const isAdmin = appRole === "admin" || appRole === "super_admin";
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["client-module-access", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("clients")
        .select("enabled_modules, enabled_features")
        .eq("id", clientId!)
        .maybeSingle();
      if (error) throw error;
      return {
        modules: (data?.enabled_modules ?? []) as string[],
        features: (data?.enabled_features ?? []) as string[] | null,
      };
    },
  });

  const [modules, setModules] = useState<string[]>([]);
  const [features, setFeatures] = useState<string[]>([]);

  useEffect(() => {
    if (!data) return;
    setModules(data.modules ?? []);
    // Treat null (legacy = "all allowed") as full catalog so admin sees current state explicitly.
    setFeatures(
      data.features ?? allFeaturesForModules((data.modules ?? []).length ? data.modules! : MODULE_CATALOG.map((m) => m.key))
    );
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
      const { error } = await (supabase as any)
        .from("clients")
        .update({ enabled_modules: modules, enabled_features: features })
        .eq("id", clientId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Module access updated",
        description: "Reloading so changes take effect everywhere…",
      });
      qc.invalidateQueries({ queryKey: ["client-module-access", clientId] });
      qc.invalidateQueries({ queryKey: ["my_features"] });
      setTimeout(() => window.location.reload(), 600);
    },
    onError: (err: Error) =>
      toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  const reset = () => {
    if (!data) return;
    setModules(data.modules ?? []);
    setFeatures(
      data.features ?? allFeaturesForModules((data.modules ?? []).length ? data.modules! : MODULE_CATALOG.map((m) => m.key))
    );
  };

  if (!isAdmin) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title="Module Access" description="Admins only." />
        <Card className="p-6 text-center text-muted-foreground text-sm">
          Only company admins can manage module access.
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title="Module Access" description="Loading…" />
        <LoadingState rows={6} variant="list" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Module Access"
        description="Turn modules and features on or off for your company. Newly launched features stay disabled until you enable them here."
      >
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={reset} disabled={!dirty || save.isPending}>
            <RotateCcw className="h-4 w-4 mr-1" /> Reset
          </Button>
          <Button size="sm" onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
            <Save className="h-4 w-4 mr-1" />
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </PageHeader>

      <Card className="p-4 flex items-start gap-3 bg-muted/30">
        <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
        <p className="text-xs text-muted-foreground">
          Disabling a module immediately hides it from every user in your company.
          New features released in future updates will appear here as <strong>off</strong> — you must enable them manually before they show up.
        </p>
      </Card>

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
                    {moduleOn ? "Module is visible to your team." : "Hidden from everyone."}
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
    </div>
  );
}
