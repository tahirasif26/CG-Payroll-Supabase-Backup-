import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  type NotificationRow,
} from "@/hooks/queries/useNotifications";
import { cn } from "@/lib/utils";

const severityDot: Record<string, string> = {
  info: "bg-primary",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-destructive",
};

function NotificationItem({
  n,
  onClick,
  onMarkRead,
  onDelete,
}: {
  n: NotificationRow;
  onClick: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
}) {
  const isUnread = !n.read_at;
  return (
    <div
      className={cn(
        "group relative flex gap-3 px-3 py-2.5 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors",
        isUnread && "bg-primary/[0.03]"
      )}
      onClick={onClick}
    >
      <div className="flex-shrink-0 pt-1.5">
        <span className={cn("block h-1.5 w-1.5 rounded-full", severityDot[n.severity] ?? "bg-muted-foreground")} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-[13px] leading-tight", isUnread ? "font-semibold" : "font-medium text-foreground/90")}>
            {n.title}
          </p>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap pt-0.5">
            {formatDistanceToNow(new Date(n.created_at), { addSuffix: false })}
          </span>
        </div>
        {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
      </div>
      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {isUnread && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead();
            }}
            className="p-1 rounded hover:bg-muted"
            aria-label="Mark read"
            title="Mark as read"
          >
            <Check className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 rounded hover:bg-muted"
          aria-label="Delete"
          title="Delete"
        >
          <Trash2 className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

export function NotificationBell() {
  const navigate = useNavigate();
  const { data: notifications = [] } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const del = useDeleteNotification();

  const top = notifications.slice(0, 8);

  const handleClick = (n: NotificationRow) => {
    if (!n.read_at) markRead.mutate(n.id);
    if (n.link) {
      navigate(n.link);
      return;
    }
    // Fallback: route by entity type
    switch (n.entity_type) {
      case "expense": navigate("/expenses"); break;
      case "leave": navigate("/leave"); break;
      case "loan": navigate("/loans"); break;
      case "advance": navigate("/advances"); break;
      case "asset_request": navigate("/assets/requests"); break;
      case "asset": navigate("/assets/inventory"); break;
      case "payroll": navigate("/payroll"); break;
      case "separation": navigate("/separations"); break;
      case "policy": navigate("/policies"); break;
      default: navigate("/notifications");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell className="h-4 w-4 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">Notifications</p>
            {unreadCount > 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheck className="h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>

        {top.length === 0 ? (
          <div className="py-12 text-center">
            <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              You'll be notified about requests and updates here
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[420px]">
            {top.map((n) => (
              <NotificationItem
                key={n.id}
                n={n}
                onClick={() => handleClick(n)}
                onMarkRead={() => markRead.mutate(n.id)}
                onDelete={() => del.mutate(n.id)}
              />
            ))}
          </ScrollArea>
        )}

        {notifications.length > top.length && (
          <div className="border-t">
            <button
              className="w-full text-center text-xs font-medium text-primary py-2.5 hover:bg-muted/50 transition-colors"
              onClick={() => navigate("/notifications")}
            >
              View all notifications
            </button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
