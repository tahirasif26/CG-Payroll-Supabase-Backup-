import { apiDelete, apiGet, apiGetWithMeta, apiPost } from "../client";
import type { ApiResponse } from "../types";
import type {
  ListNotificationsQuery,
  MarkReadRequest,
  MarkReadResponse,
  Notification,
  UnreadCountResponse,
} from "./notifications.types";

export const notificationsApi = {
  list(query: ListNotificationsQuery = {}): Promise<ApiResponse<Notification[]>> {
    return apiGetWithMeta<Notification[]>(
      "/notifications",
      query as Record<string, unknown>,
    );
  },

  unreadCount(): Promise<UnreadCountResponse> {
    return apiGet<UnreadCountResponse>("/notifications/unread-count");
  },

  markRead(body: MarkReadRequest): Promise<MarkReadResponse> {
    return apiPost<MarkReadResponse>("/notifications/mark-read", body);
  },

  markAllRead(): Promise<MarkReadResponse> {
    return apiPost<MarkReadResponse>("/notifications/mark-all-read");
  },

  delete(id: string): Promise<{ deleted: boolean }> {
    return apiDelete<{ deleted: boolean }>(`/notifications/${id}`);
  },
};
