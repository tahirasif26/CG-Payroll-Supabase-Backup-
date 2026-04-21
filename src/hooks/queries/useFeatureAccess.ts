import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { useToast } from "@/hooks/use-toast";

export type AccessLevel = "none" | "view" | "edit";

export interface FeatureDefinition {
  feature_key: string;
  module: string;
  /** Machine identifier for the module (e.g. "payroll", "assets"). */
  module_key: string;
  name: string;
  description: string | null;
  default_enabled_for_roles: string[];
}

export interface FeatureToggleRow {
  id: string;
  client_id: string;
  user_id: string;
  feature_key: string;
  is_enabled: boolean;
  access_level: AccessLevel;
}

export interface FeaturePreset {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  toggles: Record<string, boolean | AccessLevel>;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/** Module summary derived from feature_definitions. */
export interface ModuleInfo {
  key: string;
  label: string;
  features: FeatureDefinition[];
}

/** Group definitions by module_key. Stable ordering by module label. */
export function groupByModule(defs: FeatureDefinition[]): ModuleInfo[] {
  const map = new Map<string, ModuleInfo>();
  for (const d of defs) {
    if (!map.has(d.module_key)) {
      map.set(d.module_key, { key: d.module_key, label: d.module, features: [] });
    }
    map.get(d.module_key)!.features.push(d);
  }
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
}

/** All feature definitions (global, not tenant-scoped). */
export function useFeatureDefinitions() {
  return useQuery({
    queryKey: ["feature_definitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_definitions")
        .select("feature_key, module, module_key, name, description, default_enabled_for_roles")
        .order("module", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as FeatureDefinition[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** All explicit toggles for the current tenant (across all users). */
export function useAllFeatureToggles() {
  const { clientId } = useRole();
  return useQuery({
    queryKey: ["feature_toggles", "all", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_toggles")
        .select("id, client_id, user_id, feature_key, is_enabled, access_level");
      if (error) throw error;
      return (data ?? []) as FeatureToggleRow[];
    },
  });
}

/** Toggles for a single user. */
export function useUserFeatureToggles(userId: string | null) {
  return useQuery({
    queryKey: ["feature_toggles", "user", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_toggles")
        .select("feature_key, is_enabled, access_level")
        .eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []) as Array<{ feature_key: string; is_enabled: boolean; access_level: AccessLevel }>;
    },
  });
}

/** Read-only feature access for the current authenticated user. */
export function useMyFeatures() {
  const { user } = useRole();
  return useQuery({
    queryKey: ["my_features", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_features", { _user_id: user!.id });
      if (error) throw error;
      return (data ?? []) as Array<{ feature_key: string; enabled: boolean }>;
    },
  });
}

export function useFeaturePresets() {
  const { clientId } = useRole();
  return useQuery({
    queryKey: ["feature_presets", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_presets")
        .select("*")
        .order("is_default", { ascending: false })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        toggles: (r.toggles ?? {}) as Record<string, boolean | AccessLevel>,
      })) as FeaturePreset[];
    },
  });
}

// ============================================================================
// Client-level module enablement
// ============================================================================

/** Enabled modules for a single client. */
export function useClientModules(clientId: string | null) {
  return useQuery({
    queryKey: ["client_modules", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("clients")
        .select("enabled_modules")
        .eq("id", clientId!)
        .maybeSingle();
      if (error) throw error;
      return ((data?.enabled_modules ?? []) as string[]);
    },
  });
}

export function useUpdateClientModules() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ clientId, enabledModules }: { clientId: string; enabledModules: string[] }) => {
      const { error } = await (supabase as any)
        .from("clients")
        .update({ enabled_modules: enabledModules })
        .eq("id", clientId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["client_modules", vars.clientId] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["my_features"] });
      toast({ title: "Modules updated", description: "Tenant module access has been saved." });
    },
    onError: (err: Error) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });
}

// ============================================================================
// Mutations: per-employee toggles
// ============================================================================

export function useBulkSetToggles() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({
      userId,
      toggles,
    }: {
      userId: string;
      toggles: Array<{ feature_key: string; access_level: AccessLevel }>;
    }) => {
      const { data, error } = await supabase.functions.invoke("bulk-set-feature-toggles", {
        body: {
          user_id: userId,
          // Send both for backward compat with older edge fn deployments
          toggles: toggles.map((t) => ({
            feature_key: t.feature_key,
            access_level: t.access_level,
            is_enabled: t.access_level !== "none",
          })),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feature_toggles"] });
      qc.invalidateQueries({ queryKey: ["my_features"] });
      toast({ title: "Saved", description: "Feature access updated." });
    },
    onError: (err: Error) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });
}

export function useBulkApplyPreset() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ presetId, userIds }: { presetId: string; userIds: string[] }) => {
      const { data, error } = await supabase.functions.invoke("bulk-apply-preset", {
        body: { preset_id: presetId, user_ids: userIds },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["feature_toggles"] });
      qc.invalidateQueries({ queryKey: ["my_features"] });
      toast({
        title: "Preset applied",
        description: `Applied to ${data?.updated_count ?? 0} employees.`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Apply failed", description: err.message, variant: "destructive" });
    },
  });
}

export function useUpsertPreset() {
  const qc = useQueryClient();
  const { clientId, user } = useRole();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (preset: Partial<FeaturePreset> & { name: string; toggles: Record<string, boolean | AccessLevel> }) => {
      if (!clientId) throw new Error("No client context");
      const row = {
        id: preset.id,
        client_id: clientId,
        name: preset.name,
        description: preset.description ?? null,
        toggles: preset.toggles,
        is_default: !!preset.is_default,
        created_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("feature_presets")
        .upsert(row, { onConflict: "id" })
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feature_presets"] });
      toast({ title: "Preset saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });
}

export function useDeletePreset() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("feature_presets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feature_presets"] });
      toast({ title: "Preset deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });
}

// ============================================================================
// Helpers
// ============================================================================

/** Coerce a stored toggle value (boolean OR access level) into an AccessLevel. */
export function toAccessLevel(v: boolean | AccessLevel | undefined): AccessLevel {
  if (typeof v === "string") return v;
  if (v === true) return "edit";
  return "none";
}

/** Compute the effective access level for each feature, given defs + explicit toggles + role + (optional) enabled module list. */
export function computeEffectiveAccess(
  defs: FeatureDefinition[],
  explicit: Array<{ feature_key: string; access_level: AccessLevel }>,
  role: string | null,
  enabledModules?: string[],
): Map<string, AccessLevel> {
  const map = new Map<string, AccessLevel>();
  const explicitMap = new Map(explicit.map((e) => [e.feature_key, e.access_level]));
  const moduleGated = enabledModules && enabledModules.length > 0;
  for (const def of defs) {
    if (moduleGated && !enabledModules!.includes(def.module_key)) {
      map.set(def.feature_key, "none");
      continue;
    }
    if (explicitMap.has(def.feature_key)) {
      map.set(def.feature_key, explicitMap.get(def.feature_key)!);
    } else {
      map.set(def.feature_key, role && def.default_enabled_for_roles.includes(role) ? "edit" : "none");
    }
  }
  return map;
}

/** Backward-compat boolean wrapper. */
export function computeEffective(
  defs: FeatureDefinition[],
  explicit: Array<{ feature_key: string; is_enabled?: boolean; access_level?: AccessLevel }>,
  role: string | null,
): Map<string, boolean> {
  const normalized = explicit.map((e) => ({
    feature_key: e.feature_key,
    access_level: e.access_level ?? (e.is_enabled ? ("edit" as AccessLevel) : ("none" as AccessLevel)),
  }));
  const acc = computeEffectiveAccess(defs, normalized, role);
  const out = new Map<string, boolean>();
  acc.forEach((lvl, key) => out.set(key, lvl !== "none"));
  return out;
}
