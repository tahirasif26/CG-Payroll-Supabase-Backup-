/**
 * Phase 3-notifications cutover: this file is now a thin adapter over `@/api`
 * (NestJS). Consumers (TopBar, NotificationBell, NotificationsPage) continue
 * to use the same hook signatures and `NotificationRow` snake_case shape —
 * they don't need to change.
 *
 * Reminder rules (`useReminderSettings` / `useUpsertReminderSetting`) still
 * call Supabase because the reminders module hasn't been ported yet — that's
 * Phase 8. They are unrelated to in-app notifications and keep working.
 *
 * Realtime push: removed for now. The bell relies on the 60-second poll built
 * into `useUnreadNotificationCount` plus React Query invalidation on
 * mutations. Postgres realtime returns via the NestJS WebSocket gateway in
 * Phase 8.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useUnreadNotificationCount as useUnreadNotificationCountApi,
  useMarkNotificationsRead as useMarkReadApi,
  useMarkAllNotificationsRead as useMarkAllReadApi,
  useDeleteNotification as useDeleteNotificationApi,
  notificationsApi,
  type Notification as ApiNotification,
} from "@/api";

export type NotificationRow = {
  id: string;
  client_id: string | null;
  user_id: string;
  actor_user_id: string | null;
  title: string;
  body: string | null;
  category: string;
  severity: string;
  entity_type: string | null;
  entity_id: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

function toRow(n: ApiNotification): NotificationRow {
  return {
    id: n.id,
    client_id: n.clientId ?? null,
    user_id: n.userId,
    actor_user_id: n.actorUserId,
    title: n.title,
    body: n.body,
    category: n.category,
    severity: n.severity,
    entity_type: n.entityType,
    entity_id: n.entityId,
    link: n.link,
    read_at: n.readAt,
    created_at: n.createdAt,
  };
}

// ─── Notifications list ──────────────────────────────────────────────────────

export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: ["notifications", unreadOnly],
    queryFn: async (): Promise<NotificationRow[]> => {
      const res = await notificationsApi.list({
        ...(unreadOnly ? { state: "unread" as const } : {}),
        pageSize: 50,
      });
      const items = res.data ?? [];
      return items.map(toRow);
    },
  });
}

export function useUnreadNotificationCount() {
  // Delegates to the new API hook but exposes just the number (legacy shape).
  const q = useUnreadNotificationCountApi();
  return {
    ...q,
    data: q.data?.count ?? 0,
  };
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  const m = useMarkReadApi();
  return {
    ...m,
    mutate: (id: string) => {
      m.mutate(
        { ids: [id] },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["notifications"] });
          },
        },
      );
    },
    mutateAsync: async (id: string) => {
      const r = await m.mutateAsync({ ids: [id] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      return r;
    },
  };
}

export function useMarkAllNotificationsRead() {
  return useMarkAllReadApi();
}

export function useDeleteNotification() {
  return useDeleteNotificationApi();
}

// ─── Reminder rules — still Supabase until Phase 8 ───────────────────────────

export function useReminderSettings() {
  return useQuery({
    queryKey: ["reminder_settings"],
    queryFn: async () => {
      const { data, error } = await (supabase as never as { from: (t: string) => any })
        .from("reminder_settings")
        .select("*");
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertReminderSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await (supabase as never as { from: (t: string) => any })
        .from("reminder_settings")
        .upsert(payload, { onConflict: "client_id,category" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminder_settings"] }),
  });
}
