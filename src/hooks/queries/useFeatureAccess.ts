import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { useToast } from "@/hooks/use-toast";

export interface FeatureDefinition {
  feature_key: string;
  module: string;
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
}

export interface FeaturePreset {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  toggles: Record<string, boolean>;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/** All feature definitions (global, not tenant-scoped). */
export function useFeatureDefinitions() {
  return useQuery({
    queryKey: ["feature_definitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_definitions")
        .select("feature_key, module, name, description, default_enabled_for_roles")
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
        .select("id, client_id, user_id, feature_key, is_enabled");
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
        .select("feature_key, is_enabled")
        .eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []) as Array<{ feature_key: string; is_enabled: boolean }>;
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
        toggles: (r.toggles ?? {}) as Record<string, boolean>,
      })) as FeaturePreset[];
    },
  });
}

export function useBulkSetToggles() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({
      userId,
      toggles,
    }: {
      userId: string;
      toggles: Array<{ feature_key: string; is_enabled: boolean }>;
    }) => {
      const { data, error } = await supabase.functions.invoke("bulk-set-feature-toggles", {
        body: { user_id: userId, toggles },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feature_toggles"] });
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
    mutationFn: async (preset: Partial<FeaturePreset> & { name: string; toggles: Record<string, boolean> }) => {
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

/** Compute the effective enabled-state for a user, given definitions + their explicit toggles. */
export function computeEffective(
  defs: FeatureDefinition[],
  explicit: Array<{ feature_key: string; is_enabled: boolean }>,
  role: string | null,
): Map<string, boolean> {
  const map = new Map<string, boolean>();
  const explicitMap = new Map(explicit.map((e) => [e.feature_key, e.is_enabled]));
  for (const def of defs) {
    if (explicitMap.has(def.feature_key)) {
      map.set(def.feature_key, explicitMap.get(def.feature_key)!);
    } else {
      map.set(def.feature_key, !!role && def.default_enabled_for_roles.includes(role));
    }
  }
  return map;
}
