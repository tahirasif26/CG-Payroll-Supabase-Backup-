import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "./notifications.api";
import { tokenStorage } from "../token-storage";
import type {
  ListNotificationsQuery,
  MarkReadRequest,
} from "./notifications.types";

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (q: ListNotificationsQuery) => [...notificationKeys.all, "list", q] as const,
  unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
};

export function useNotifications(query: ListNotificationsQuery = {}) {
  return useQuery({
    queryKey: notificationKeys.list(query),
    queryFn: () => notificationsApi.list(query),
    enabled: !!tokenStorage.getAccessToken(),
  });
}

/**
 * Drives the bell badge. Poll every 60s while the tab is visible — switch to
 * the WebSocket gateway in Phase 8 to eliminate polling.
 */
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => notificationsApi.unreadCount(),
    enabled: !!tokenStorage.getAccessToken(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: MarkReadRequest) => notificationsApi.markRead(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
