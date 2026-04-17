import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: ["notifications", unreadOnly],
    queryFn: async () => {
      let q = (supabase as any).from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
      if (unreadOnly) q = q.is("read_at", null);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useReminderSettings() {
  return useQuery({
    queryKey: ["reminder_settings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("reminder_settings").select("*");
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertReminderSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await (supabase as any).from("reminder_settings").upsert(payload, { onConflict: "client_id,category" }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminder_settings"] }),
  });
}
