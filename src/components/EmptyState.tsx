import { LucideIcon, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { TableCell, TableRow } from "@/components/ui/table";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  /** Visual density. `compact` = py-8 (in-table), `default` = py-12, `spacious` = py-16 (full-page) */
  size?: "compact" | "default" | "spacious";
}

const sizeStyles = {
  compact: "py-8",
  default: "py-12",
  spacious: "py-16",
};

/**
 * Standardized empty state used across the app.
 * Always renders an icon, title, and optional description + CTA so the user
 * sees a consistent design no matter which module is empty.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
  size = "default",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-4",
        sizeStyles[size],
        className,
      )}
    >
      <div className="rounded-full bg-muted/60 p-3 mb-3" aria-hidden="true">
        <Icon className="h-6 w-6 text-muted-foreground" strokeWidth={1.75} />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

interface EmptyTableRowProps extends Omit<EmptyStateProps, "size"> {
  colSpan: number;
}

/**
 * Drop-in replacement for the inlined
 * `<TableRow><TableCell colSpan={N} className="text-center py-8 text-muted-foreground">No X.</TableCell></TableRow>`
 * pattern. Uses compact size to fit naturally inside a table.
 */
export function EmptyTableRow({ colSpan, ...props }: EmptyTableRowProps) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="p-0">
        <EmptyState size="compact" {...props} />
      </TableCell>
    </TableRow>
  );
}
