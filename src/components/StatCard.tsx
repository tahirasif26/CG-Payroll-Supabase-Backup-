import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  variant?: "default" | "primary" | "success" | "warning" | "info";
  compact?: boolean;
}

const variantStyles = {
  default: "bg-card",
  primary: "bg-primary/10 border-primary/20",
  success: "bg-success/10 border-success/20",
  warning: "bg-warning/10 border-warning/20",
  info: "bg-info/10 border-info/20",
};

const iconVariantStyles = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary text-primary-foreground",
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  info: "bg-info text-info-foreground",
};

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = "default", compact = false }: StatCardProps) {
  const TrendIcon = trend?.positive ? ArrowUp : ArrowDown;
  return (
    <div className={cn("rounded-xl border animate-fade-in flex items-start gap-3", compact ? "p-3" : "p-5", variantStyles[variant])}>
      <div
        className={cn(
          "shrink-0 rounded-lg flex items-center justify-center",
          compact ? "h-8 w-8" : "h-10 w-10",
          iconVariantStyles[variant],
        )}
        aria-hidden="true"
      >
        <Icon className={cn(compact ? "h-4 w-4" : "h-5 w-5")} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("font-medium text-muted-foreground uppercase tracking-wider", compact ? "text-[10px] leading-tight" : "text-xs")}>{title}</p>
        <p className={cn("font-bold mt-1 tracking-tight", compact ? "text-sm" : "text-2xl")}>{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        {trend && (
          <p className={cn("flex items-center gap-1 text-xs font-medium mt-1", trend.positive ? "text-success" : "text-destructive")}>
            <TrendIcon className="h-3 w-3" strokeWidth={2.5} />
            {trend.value}
          </p>
        )}
      </div>
    </div>
  );
}
