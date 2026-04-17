import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useAssets(filters?: { status?: string; employee_id?: string }) {
  return useQuery({
    queryKey: ["assets", filters],
    queryFn: async () => {
      let q = (supabase as any).from("assets").select("*, asset_categories(name), asset_locations(name), asset_conditions(name)").order("created_at", { ascending: false });
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.employee_id) q = q.eq("employee_id", filters.employee_id);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useAsset(id: string | undefined) {
  return useQuery({
    queryKey: ["asset", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("assets").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await (supabase as any).from("assets").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
      toast.success("Asset created");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Record<string, any>) => {
      const { data, error } = await (supabase as any).from("assets").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
      qc.invalidateQueries({ queryKey: ["asset"] });
    },
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("assets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  });
}

export function useAssetCategories() {
  return useQuery({
    queryKey: ["asset_categories"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("asset_categories").select("*").eq("status", "active").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useAssetLocations() {
  return useQuery({
    queryKey: ["asset_locations"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("asset_locations").select("*").eq("status", "active").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useAssetConditions() {
  return useQuery({
    queryKey: ["asset_conditions"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("asset_conditions").select("*").eq("status", "active").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useAssetStoreItems() {
  return useQuery({
    queryKey: ["asset_store_items"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("asset_store_items").select("*, asset_categories(name)").eq("status", "active");
      if (error) throw error;
      return data;
    },
  });
}

export function useAssetRequests() {
  return useQuery({
    queryKey: ["asset_requests"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("asset_requests").select("*, asset_store_items(name), employees(first_name, last_name)").order("request_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAssetAudits() {
  return useQuery({
    queryKey: ["asset_audits"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("asset_audits").select("*").order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAssetHistory(asset_id?: string) {
  return useQuery({
    queryKey: ["asset_history", asset_id],
    queryFn: async () => {
      let q = (supabase as any).from("asset_history").select("*").order("date", { ascending: false });
      if (asset_id) q = q.eq("asset_id", asset_id);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}
