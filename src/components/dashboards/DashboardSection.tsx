import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface DashboardSectionProps {
  title: string;
  description?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function DashboardSection({ title, description, viewAllHref, viewAllLabel = "View all", action, children }: DashboardSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {viewAllHref ? (
          <Link
            to={viewAllHref}
            className="text-xs font-medium text-primary hover:underline flex items-center gap-1 shrink-0"
          >
            {viewAllLabel} <ArrowRight className="h-3 w-3" />
          </Link>
        ) : action}
      </div>
      {children}
    </section>
  );
}
