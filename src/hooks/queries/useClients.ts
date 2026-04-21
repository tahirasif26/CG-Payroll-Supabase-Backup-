import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ClientStat {
  id: string;
  company_name: string;
  company_slug: string | null;
  company_email: string | null;
  company_phone: string | null;
  country: string | null;
  status: "active" | "trial" | "suspended";
  subscription_plan: "starter" | "pro" | "enterprise";
  timezone: string;
  base_currency: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  user_count: number;
  last_activity: string | null;
}

export interface ClientUserRow {
  id: string;
  full_name: string | null;
  client_id: string | null;
  employee_id: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  role?: "super_admin" | "admin" | "employee" | null;
  email?: string | null;
}

export interface ClientFilters {
  status?: string;
  plan?: string;
  country?: string;
  search?: string;
}

export interface CreateClientInput {
  company_name: string;
  company_email: string;
  company_phone?: string;
  country: string;
  timezone?: string;
  base_currency?: string;
  subscription_plan?: "starter" | "pro" | "enterprise";
  status?: "trial" | "active";
  admin_full_name: string;
  admin_email: string;
  enabled_modules?: string[];
}

export function useClients(filters?: ClientFilters) {
  return useQuery({
    queryKey: ["clients", filters],
    queryFn: async (): Promise<ClientStat[]> => {
      let query = (supabase as any).from("client_stats").select("*");
      if (filters?.status && filters.status !== "all") query = query.eq("status", filters.status);
      if (filters?.plan && filters.plan !== "all") query = query.eq("subscription_plan", filters.plan);
      if (filters?.country && filters.country !== "all") query = query.eq("country", filters.country);
      if (filters?.search) query = query.ilike("company_name", `%${filters.search}%`);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClientStat[];
    },
    staleTime: 30_000,
  });
}

export function useClientUsers(clientId: string | null) {
  return useQuery({
    queryKey: ["client-users", clientId],
    enabled: !!clientId,
    queryFn: async (): Promise<ClientUserRow[]> => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name, client_id, employee_id, is_active, last_login_at, created_at")
        .eq("client_id", clientId!)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const ids = (profiles ?? []).map((p) => p.id);
      if (ids.length === 0) return [];

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", ids);

      const roleMap = new Map<string, ClientUserRow["role"]>();
      (roles ?? []).forEach((r: any) => roleMap.set(r.user_id, r.role));

      return (profiles ?? []).map((p) => ({
        ...p,
        role: roleMap.get(p.id) ?? null,
      }));
    },
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateClientInput) => {
      const { data, error } = await supabase.functions.invoke("create-client", { body: input });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client created", {
        description: `Invitation sent to ${vars.admin_email}.`,
      });
    },
    onError: (err: Error) => {
      toast.error("Failed to create client", { description: err.message });
    },
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ClientStat> }) => {
      const { error } = await supabase.from("clients").update(updates as any).eq("id", id);
      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client updated");
    },
    onError: (err: Error) => {
      toast.error("Failed to update client", { description: err.message });
    },
  });
}

export function useSetClientStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "trial" | "suspended" }) => {
      const { error } = await supabase.from("clients").update({ status }).eq("id", id);
      if (error) throw error;
      // When suspending, deactivate all profiles in that client
      if (status === "suspended") {
        await supabase.from("profiles").update({ is_active: false }).eq("client_id", id);
      } else {
        await supabase.from("profiles").update({ is_active: true }).eq("client_id", id);
      }
      return { id, status };
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["client-users"] });
      toast.success(vars.status === "suspended" ? "Client suspended" : "Client activated");
    },
    onError: (err: Error) => {
      toast.error("Action failed", { description: err.message });
    },
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client deleted");
    },
    onError: (err: Error) => {
      toast.error("Failed to delete client", { description: err.message });
    },
  });
}
