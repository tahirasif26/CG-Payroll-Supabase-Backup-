import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface ActivityItem {
  id: string;
  actor?: string;
  action: string;
  detail?: string;
  timestamp: string | Date;
  icon?: React.ComponentType<{ className?: string }>;
}

interface ActivityFeedProps {
  items?: ActivityItem[];
  loading?: boolean;
  emptyMessage?: string;
  maxItems?: number;
}

export function ActivityFeed({ items, loading, emptyMessage = "No recent activity yet.", maxItems = 10 }: ActivityFeedProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  const list = (items ?? []).slice(0, maxItems);

  if (list.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-2">
        <ul className="divide-y divide-border/40">
          {list.map((it) => {
            const Icon = it.icon ?? Activity;
            return (
              <li key={it.id} className="flex items-start gap-3 p-2.5 rounded-md hover:bg-muted/30">
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-tight">
                    {it.actor && <span className="font-semibold">{it.actor}</span>}{" "}
                    <span className="text-muted-foreground">{it.action}</span>
                    {it.detail && <span className="font-medium"> {it.detail}</span>}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(it.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
