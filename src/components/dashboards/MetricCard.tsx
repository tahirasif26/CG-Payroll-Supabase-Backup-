import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type MetricAccent = "purple" | "emerald" | "amber" | "red" | "blue" | "teal" | "orange" | "slate";

const ACCENT_STYLES: Record<MetricAccent, { bar: string; bg: string; icon: string }> = {
  purple: { bar: "bg-purple-500", bg: "bg-purple-50/60 dark:bg-purple-950/20", icon: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
  emerald: { bar: "bg-emerald-500", bg: "bg-emerald-50/60 dark:bg-emerald-950/20", icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  amber: { bar: "bg-amber-500", bg: "bg-amber-50/60 dark:bg-amber-950/20", icon: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  red: { bar: "bg-red-500", bg: "bg-red-50/60 dark:bg-red-950/20", icon: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  blue: { bar: "bg-blue-500", bg: "bg-blue-50/60 dark:bg-blue-950/20", icon: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  teal: { bar: "bg-teal-500", bg: "bg-teal-50/60 dark:bg-teal-950/20", icon: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300" },
  orange: { bar: "bg-orange-500", bg: "bg-orange-50/60 dark:bg-orange-950/20", icon: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
  slate: { bar: "bg-slate-500", bg: "bg-slate-50/60 dark:bg-slate-900/20", icon: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
};

interface MetricCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: LucideIcon;
  accent: MetricAccent;
  loading?: boolean;
  onClick?: () => void;
}

export function MetricCard({ label, value, sublabel, icon: Icon, accent, loading, onClick }: MetricCardProps) {
  const s = ACCENT_STYLES[accent];
  return (
    <Card
      className={cn("relative overflow-hidden border-0 shadow-sm transition-all", s.bg, onClick && "cursor-pointer hover:shadow-md")}
      onClick={onClick}
    >
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", s.bar)} />
      <CardContent className="p-4 pl-5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{label}</p>
            {loading ? (
              <Skeleton className="h-7 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold mt-0.5 tabular-nums truncate">
                {typeof value === "number" ? value.toLocaleString() : value}
              </p>
            )}
            {sublabel && !loading && <p className="text-[11px] text-muted-foreground mt-0.5">{sublabel}</p>}
          </div>
          <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", s.icon)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
