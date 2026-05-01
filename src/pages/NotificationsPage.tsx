import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from "@/hooks/queries/useNotifications";
import { cn } from "@/lib/utils";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";

const CATEGORY_LABEL: Record<string, string> = {
  leave: "Leave",
  expense: "Expense",
  advance: "Advance",
  loan: "Loan",
  asset: "Asset",
  payroll: "Payroll",
  policy: "Policy",
  document: "Document",
  probation: "Probation",
  general: "General",
};

const severityClass: Record<string, string> = {
  info: "bg-primary/10 text-primary",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  error: "bg-destructive/10 text-destructive",
};

export default function NotificationsPage() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const navigate = useNavigate();
  const { data: notifications = [], isLoading } = useNotifications(filter === "unread");
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const del = useDeleteNotification();

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Notifications"
        description="All your alerts and activity in one place."
      />

      <div className="flex items-center justify-between gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "unread")}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => markAllRead.mutate()}
        >
          <CheckCheck className="h-4 w-4" />
          Mark all read
        </Button>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-4">
            <LoadingState rows={6} variant="list" />
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notifications"
            description={filter === "unread" ? "You're all caught up." : "Activity will show up here as it happens."}
            size="spacious"
          />
        ) : (
          <ul className="divide-y">
            {notifications.map((n) => {
              const isUnread = !n.read_at;
              return (
                <li
                  key={n.id}
                  className={cn(
                    "group flex gap-4 px-5 py-4 hover:bg-muted/40 transition-colors cursor-pointer",
                    isUnread && "bg-primary/[0.03]"
                  )}
                  onClick={() => {
                    if (isUnread) markRead.mutate(n.id);
                    if (n.link) navigate(n.link);
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          "text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded",
                          severityClass[n.severity] ?? severityClass.info
                        )}
                      >
                        {CATEGORY_LABEL[n.category] ?? n.category}
                      </span>
                      <p className={cn("text-sm", isUnread ? "font-semibold" : "font-medium")}>
                        {n.title}
                      </p>
                      {isUnread && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    </div>
                    {n.body && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.body}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isUnread && (
                      <button
                        className="p-1.5 rounded hover:bg-muted"
                        onClick={(e) => {
                          e.stopPropagation();
                          markRead.mutate(n.id);
                        }}
                        aria-label="Mark read"
                      >
                        <Check className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    )}
                    <button
                      className="p-1.5 rounded hover:bg-muted"
                      onClick={(e) => {
                        e.stopPropagation();
                        del.mutate(n.id);
                      }}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
