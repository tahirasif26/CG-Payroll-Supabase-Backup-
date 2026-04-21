import * as React from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Responsive table wrapper.
 *
 * On desktop (≥768px): renders a normal `<table>` with horizontal scroll fallback.
 * On mobile (<768px): renders a stacked card list using the `mobileItem` render prop,
 * so columns don't overflow off-screen.
 *
 * Usage:
 *   <ResponsiveTable
 *     items={employees}
 *     getKey={(e) => e.id}
 *     desktop={<Table>...</Table>}
 *     mobileItem={(e) => (
 *       <div className="space-y-1">
 *         <div className="font-medium">{e.name}</div>
 *         <div className="text-xs text-muted-foreground">{e.email}</div>
 *       </div>
 *     )}
 *   />
 */
interface ResponsiveTableProps<T> {
  items: T[];
  getKey: (item: T) => string | number;
  desktop: React.ReactNode;
  mobileItem: (item: T) => React.ReactNode;
  empty?: React.ReactNode;
  onItemClick?: (item: T) => void;
  className?: string;
}

export function ResponsiveTable<T>({
  items,
  getKey,
  desktop,
  mobileItem,
  empty,
  onItemClick,
  className,
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return <>{desktop}</>;
  }

  if (items.length === 0 && empty) {
    return <>{empty}</>;
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {items.map((item) => {
        const interactive = !!onItemClick;
        return (
          <div
            key={getKey(item)}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            onClick={interactive ? () => onItemClick!(item) : undefined}
            onKeyDown={
              interactive
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onItemClick!(item);
                    }
                  }
                : undefined
            }
            className={cn(
              "rounded-lg border bg-card p-3 text-sm",
              interactive && "cursor-pointer transition-colors hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-ring",
            )}
          >
            {mobileItem(item)}
          </div>
        );
      })}
    </div>
  );
}
