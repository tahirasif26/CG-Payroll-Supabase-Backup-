import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

interface EmptyDashboardStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  actionOnClick?: () => void;
  children?: ReactNode;
}

export function EmptyDashboardState({
  icon: Icon, title, description, actionLabel, actionHref, actionOnClick, children,
}: EmptyDashboardStateProps) {
  return (
    <Card>
      <CardContent className="py-10 text-center">
        <div className="h-12 w-12 rounded-full bg-muted mx-auto flex items-center justify-center mb-3">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-semibold mb-1">{title}</h3>
        {description && <p className="text-xs text-muted-foreground max-w-sm mx-auto">{description}</p>}
        {(actionLabel && (actionHref || actionOnClick)) && (
          <div className="mt-4">
            {actionHref ? (
              <Button asChild size="sm"><Link to={actionHref}>{actionLabel}</Link></Button>
            ) : (
              <Button size="sm" onClick={actionOnClick}>{actionLabel}</Button>
            )}
          </div>
        )}
        {children}
      </CardContent>
    </Card>
  );
}
