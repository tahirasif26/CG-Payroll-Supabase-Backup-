import { cn } from "@/lib/utils";

type StatusVariant = "active" | "inactive" | "on-leave" | "pending" | "approved" | "rejected" | "completed" | "processing" | "draft" | "failed" | "defaulted";

const styles: Record<StatusVariant, string> = {
  active: "bg-success/15 text-success",
  completed: "bg-success/15 text-success",
  approved: "bg-success/15 text-success",
  inactive: "bg-muted text-muted-foreground",
  draft: "bg-muted text-muted-foreground",
  "on-leave": "bg-warning/15 text-warning",
  pending: "bg-warning/15 text-warning",
  processing: "bg-info/15 text-info",
  rejected: "bg-destructive/15 text-destructive",
  failed: "bg-destructive/15 text-destructive",
  defaulted: "bg-destructive/15 text-destructive",
};

export function StatusBadge({ status }: { status: StatusVariant }) {
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize", styles[status] || styles.active)}>
      {status.replace("-", " ")}
    </span>
  );
}
