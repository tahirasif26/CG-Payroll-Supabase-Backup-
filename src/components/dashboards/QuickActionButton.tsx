import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface QuickActionButtonProps {
  icon: LucideIcon;
  label: string;
  to?: string;
  onClick?: () => void;
  description?: string;
  accent?: "primary" | "blue" | "emerald" | "amber" | "purple" | "rose";
}

const ACCENTS = {
  primary: "bg-primary/10 text-primary",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  rose: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
};

export function QuickActionButton({ icon: Icon, label, to, onClick, description, accent = "primary" }: QuickActionButtonProps) {
  const inner = (
    <Card className="p-4 hover:shadow-md hover:border-primary/40 transition-all cursor-pointer group h-full">
      <div className="flex items-start gap-3">
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform", ACCENTS[accent])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">{label}</p>
          {description && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{description}</p>}
        </div>
      </div>
    </Card>
  );

  if (to) return <Link to={to} className="block">{inner}</Link>;
  return <button onClick={onClick} className="block w-full text-left">{inner}</button>;
}
