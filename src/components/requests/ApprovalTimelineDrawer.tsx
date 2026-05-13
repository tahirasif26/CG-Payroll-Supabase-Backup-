import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useApprovalHistory, useRequestApproval } from "@/hooks/queries/useRequestWorkflow";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, Clock, ArrowRight, Send, Truck, Wallet, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import type { RequestModule } from "@/lib/workflow";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: RequestModule;
  entityId: string | undefined;
}

const ACTION_META: Record<string, { icon: any; color: string; label: string }> = {
  submitted: { icon: Send, color: "text-info", label: "Submitted" },
  approved:  { icon: CheckCircle2, color: "text-success", label: "Approved" },
  rejected:  { icon: XCircle, color: "text-destructive", label: "Rejected" },
  delegated: { icon: ArrowRight, color: "text-warning", label: "Delegated" },
  escalated: { icon: ArrowRight, color: "text-warning", label: "Escalated" },
  reassigned:{ icon: ArrowRight, color: "text-info", label: "Reassigned" },
  paid:      { icon: Wallet, color: "text-success", label: "Paid" },
  unpaid:    { icon: Wallet, color: "text-warning", label: "Marked unpaid" },
  delivered: { icon: Truck, color: "text-success", label: "Delivered" },
  comment:   { icon: MessageSquare, color: "text-muted-foreground", label: "Comment" },
};

export function ApprovalTimelineDrawer({ open, onOpenChange, module, entityId }: Props) {
  const { data: req } = useRequestApproval(module, entityId);
  const { data: history = [], isLoading } = useApprovalHistory(req?.id);
  const [empNames, setEmpNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!history.length && !req) return;
    const ids = new Set<string>();
    history.forEach((h: any) => { if (h.actor_employee_id) ids.add(h.actor_employee_id); });
    (req?.assignments ?? []).forEach((a: any) => { if (a.employee_id) ids.add(a.employee_id); });
    if (ids.size === 0) return;
    (async () => {
      const { data } = await (supabase as any).from("employees")
        .select("id, first_name, last_name").in("id", Array.from(ids));
      const map: Record<string, string> = {};
      (data ?? []).forEach((e: any) => {
        map[e.id] = [e.first_name, e.last_name].filter(Boolean).join(" ") || "—";
      });
      setEmpNames(map);
    })();
  }, [history, req]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Approval Timeline</SheetTitle>
          <SheetDescription>
            {req ? (
              <span className="flex items-center gap-2">
                <span>Status:</span>
                <Badge variant="secondary" className="capitalize">{req.status}</Badge>
                <span>· Level {req.current_level}</span>
              </span>
            ) : "No workflow record yet."}
          </SheetDescription>
        </SheetHeader>

        {req && (req.assignments ?? []).filter((a: any) => a.status === "pending").length > 0 && (
          <div className="mt-4 rounded-lg border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Currently with</p>
            <div className="flex flex-wrap gap-1">
              {(req.assignments ?? [])
                .filter((a: any) => a.status === "pending")
                .map((a: any) => (
                  <Badge key={a.id} variant="outline" className="text-xs">
                    {empNames[a.employee_id] ?? "Approver"}
                    {a.via_delegation && <span className="ml-1 text-warning">(delegated)</span>}
                  </Badge>
                ))}
            </div>
          </div>
        )}

        <div className="mt-6 space-y-3">
          {isLoading && <Skeleton className="h-20 w-full" />}
          {!isLoading && history.length === 0 && (
            <p className="text-sm text-muted-foreground">No history yet.</p>
          )}
          {history.map((h: any) => {
            const meta = ACTION_META[h.action] ?? ACTION_META.comment;
            const Icon = meta.icon;
            const actor = h.actor_employee_id ? empNames[h.actor_employee_id] : null;
            return (
              <div key={h.id} className="flex gap-3">
                <div className={`flex-shrink-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center ${meta.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{meta.label}</p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(h.created_at), "MMM d, HH:mm")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {actor ?? "System"}
                    {h.level_order != null && <> · Level {h.level_order}</>}
                  </p>
                  {h.comment && <p className="text-sm mt-1 text-foreground/80">{h.comment}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
