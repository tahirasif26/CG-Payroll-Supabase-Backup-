import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useRole } from "@/contexts/RoleContext";

export type TabScope = "both" | "people_only";

export interface TabDefinition {
  id: string;
  module_key: string;
  tab_key: string;
  label: string;
  path: string;
  scope: TabScope;
  sort_order: number;
}

export interface ClientTabAccess {
  client_id: string;
  tab_key: string;
  enabled: boolean;
}

export interface RoleTabAccess {
  role_id: string;
  tab_key: string;
  people_enabled: boolean;
}

export interface AccessibleTab {
  tab_key: string;
  scope: TabScope;
  people_enabled: boolean;
}

// ── All tab definitions (global) ─────────────────────────────────
export function useTabDefinitions() {
  return useQuery({
    queryKey: ["tab_definitions"],
    queryFn: async (): Promise<TabDefinition[]> => {
      const { data, error } = await (supabase as any)
        .from("tab_definitions")
        .select("id, module_key, tab_key, label, path, scope, sort_order")
        .order("module_key")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as TabDefinition[];
    },
  });
}

// ── Per-client tab enablement (super-admin gating) ────────────────
export function useClientTabAccess(clientId: string | null) {
  return useQuery({
    queryKey: ["client_tab_access", clientId],
    enabled: !!clientId,
    queryFn: async (): Promise<ClientTabAccess[]> => {
      const { data, error } = await (supabase as any)
        .from("client_tab_access")
        .select("client_id, tab_key, enabled")
        .eq("client_id", clientId!);
      if (error) throw error;
      return (data ?? []) as ClientTabAccess[];
    },
  });
}

// ── Per-role people_enabled flags ─────────────────────────────────
export function useRoleTabAccess(roleId: string | null) {
  return useQuery({
    queryKey: ["role_tab_access", roleId],
    enabled: !!roleId,
    queryFn: async (): Promise<RoleTabAccess[]> => {
      const { data, error } = await (supabase as any)
        .from("role_tab_access")
        .select("role_id, tab_key, people_enabled")
        .eq("role_id", roleId!);
      if (error) throw error;
      return (data ?? []) as RoleTabAccess[];
    },
  });
}

// ── Save the people_enabled state for a whole role (replace all) ─
export function useSetRoleTabAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      role_id: string;
      client_id: string;
      tabs: { tab_key: string; people_enabled: boolean }[];
    }) => {
      const rows = input.tabs.map((t) => ({
        role_id: input.role_id,
        tab_key: t.tab_key,
        people_enabled: t.people_enabled,
      }));
      // Upsert all rows; tabs not in the array stay as-is.
      // To make it a true "replace" within the rows we send, use upsert.
      const { error } = await (supabase as any)
        .from("role_tab_access")
        .upsert(rows, { onConflict: "role_id,tab_key" });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["role_tab_access", vars.role_id] });
      qc.invalidateQueries({ queryKey: ["accessible_tabs"] });
      toast.success("Tab permissions saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Accessible tabs for current user (used by sidebar) ────────────
export function useAccessibleTabs() {
  const { user } = useRole();
  return useQuery({
    queryKey: ["accessible_tabs", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async (): Promise<Map<string, AccessibleTab>> => {
      const { data, error } = await (supabase as any).rpc("get_user_accessible_tabs", {
        _user_id: user!.id,
      });
      if (error) throw error;
      const map = new Map<string, AccessibleTab>();
      for (const row of (data ?? []) as AccessibleTab[]) {
        map.set(row.tab_key, row);
      }
      return map;
    },
  });
}
