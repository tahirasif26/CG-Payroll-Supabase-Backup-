import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TabDefinition {
  id: string;
  module_key: string;
  tab_key: string;
  label: string;
  path: string;
  scope: "people_only" | "both";
  default_for_admin: boolean;
  sort_order: number;
}

export interface ClientTabAccessRow {
  id: string;
  client_id: string;
  tab_key: string;
  enabled: boolean;
}

export interface RoleTabAccessRow {
  id: string;
  role_id: string;
  tab_key: string;
  enabled: boolean;
}

/** All tabs in the app (global, cached forever-ish). */
export function useTabDefinitions() {
  return useQuery({
    queryKey: ["tab_definitions"],
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<TabDefinition[]> => {
      const { data, error } = await (supabase as any)
        .from("tab_definitions")
        .select("*")
        .order("module_key")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as TabDefinition[];
    },
  });
}

/** Tabs available to a single client (set by super admin). */
export function useClientTabAccess(clientId: string | null | undefined) {
  return useQuery({
    queryKey: ["client_tab_access", clientId],
    enabled: !!clientId,
    queryFn: async (): Promise<ClientTabAccessRow[]> => {
      const { data, error } = await (supabase as any)
        .from("client_tab_access")
        .select("*")
        .eq("client_id", clientId!);
      if (error) throw error;
      return (data ?? []) as ClientTabAccessRow[];
    },
  });
}

/** Set the full enabled-tab list for a client (super admin only). */
export function useSetClientTabAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      client_id,
      enabled_tab_keys,
      all_tab_keys,
    }: {
      client_id: string;
      enabled_tab_keys: string[];
      all_tab_keys: string[];
    }) => {
      // Upsert "enabled" rows
      if (enabled_tab_keys.length > 0) {
        const rows = enabled_tab_keys.map((tab_key) => ({ client_id, tab_key, enabled: true }));
        const { error: upErr } = await (supabase as any)
          .from("client_tab_access")
          .upsert(rows, { onConflict: "client_id,tab_key" });
        if (upErr) throw upErr;
      }
      // Disable everything else
      const enabledSet = new Set(enabled_tab_keys);
      const toDisable = all_tab_keys.filter((k) => !enabledSet.has(k));
      if (toDisable.length > 0) {
        const rows = toDisable.map((tab_key) => ({ client_id, tab_key, enabled: false }));
        const { error: dErr } = await (supabase as any)
          .from("client_tab_access")
          .upsert(rows, { onConflict: "client_id,tab_key" });
        if (dErr) throw dErr;
      }
      return { client_id };
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["client_tab_access", d.client_id] });
      qc.invalidateQueries({ queryKey: ["accessible_tabs"] });
      toast.success("Tab access updated");
    },
    onError: (err: Error) => toast.error("Update failed", { description: err.message }),
  });
}

/** Tabs a role can access. */
export function useRoleTabAccess(roleId: string | null | undefined) {
  return useQuery({
    queryKey: ["role_tab_access", roleId],
    enabled: !!roleId,
    queryFn: async (): Promise<RoleTabAccessRow[]> => {
      const { data, error } = await (supabase as any)
        .from("role_tab_access")
        .select("*")
        .eq("role_id", roleId!);
      if (error) throw error;
      return (data ?? []) as RoleTabAccessRow[];
    },
  });
}

export function useSetRoleTabAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      role_id,
      enabled_tab_keys,
      all_tab_keys,
    }: {
      role_id: string;
      enabled_tab_keys: string[];
      all_tab_keys: string[];
    }) => {
      if (enabled_tab_keys.length > 0) {
        const rows = enabled_tab_keys.map((tab_key) => ({ role_id, tab_key, enabled: true }));
        const { error } = await (supabase as any)
          .from("role_tab_access")
          .upsert(rows, { onConflict: "role_id,tab_key" });
        if (error) throw error;
      }
      const enabledSet = new Set(enabled_tab_keys);
      const toDisable = all_tab_keys.filter((k) => !enabledSet.has(k));
      if (toDisable.length > 0) {
        const rows = toDisable.map((tab_key) => ({ role_id, tab_key, enabled: false }));
        const { error } = await (supabase as any)
          .from("role_tab_access")
          .upsert(rows, { onConflict: "role_id,tab_key" });
        if (error) throw error;
      }
      return { role_id };
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["role_tab_access", d.role_id] });
      qc.invalidateQueries({ queryKey: ["accessible_tabs"] });
      toast.success("Role tabs updated");
    },
    onError: (err: Error) => toast.error("Update failed", { description: err.message }),
  });
}

/** Tabs the current user can access (combination of client + role). */
export function useAccessibleTabs(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["accessible_tabs", userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await (supabase as any).rpc("get_user_accessible_tabs", {
        _user_id: userId,
      });
      if (error) throw error;
      return ((data ?? []) as Array<{ tab_key: string }>).map((r) => r.tab_key);
    },
  });
}
