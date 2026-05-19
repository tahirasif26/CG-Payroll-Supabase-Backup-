import type { PaginationQuery } from "../types";

export type NotificationSeverity = "info" | "warning" | "urgent";

export interface Notification {
  id: string;
  clientId: string;
  userId: string;
  title: string;
  body: string | null;
  category: string;
  link: string | null;
  severity: NotificationSeverity;
  entityType: string | null;
  entityId: string | null;
  actorUserId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface ListNotificationsQuery extends PaginationQuery {
  state?: "unread" | "read";
  category?: string;
  severity?: NotificationSeverity;
}

export interface MarkReadRequest {
  ids: string[];
}

export interface UnreadCountResponse {
  count: number;
}

export interface MarkReadResponse {
  updated: number;
}
