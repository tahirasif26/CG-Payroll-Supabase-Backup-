import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Truck, History } from "lucide-react";
import { useCanActOnRequest } from "@/hooks/useCanActOnRequest";
import { useActOnRequest } from "@/hooks/queries/useRequestWorkflow";
import { ApprovalTimelineDrawer } from "@/components/requests/ApprovalTimelineDrawer";
import type { RequestModule, WorkflowAction } from "@/lib/workflow";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  module: RequestModule;
  entityId: string | undefined;
  /** When true, also show a "Delivered" action (for assets after approval). */
  supportsDelivered?: boolean;
  /** Callback after a successful action — pages may want to update their own row. */
  onActed?: (action: WorkflowAction) => void;
}

export function RequestRowActions({ module, entityId, supportsDelivered, onActed }: Props) {
  const { canAct, request } = useCanActOnRequest(module, entityId);
  const act = useActOnRequest();
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<WorkflowAction | null>(null);
  const [comment, setComment] = useState("");

  const handleSubmit = async () => {
    if (!request?.id || !confirmAction) return;
    await act.mutateAsync({ id: request.id, action: confirmAction, comment: comment.trim() || undefined });
    setConfirmAction(null);
    setComment("");
    onActed?.(confirmAction);
  };

  // Delivered button shows only after approved (asset module)
  const showDelivered = supportsDelivered
    && request?.status === "approved"
    && (request as any)?.client_id === (request as any)?.client_id; // placeholder

  return (
    <div className="flex items-center justify-end gap-1">
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setTimelineOpen(true)} title="View timeline">
        <History className="h-3.5 w-3.5" />
      </Button>
      {canAct && (
        <>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={() => setConfirmAction("approved")} title="Approve">
            <CheckCircle2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setConfirmAction("rejected")} title="Reject">
            <XCircle className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
      {showDelivered && canAct && (
        <Button variant="ghost" size="icon" className="h-7 w-7 text-info" onClick={() => setConfirmAction("delivered")} title="Mark delivered">
          <Truck className="h-3.5 w-3.5" />
        </Button>
      )}

      <ApprovalTimelineDrawer open={timelineOpen} onOpenChange={setTimelineOpen} module={module} entityId={entityId} />

      <Dialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">{confirmAction} request</DialogTitle>
            <DialogDescription>
              {confirmAction === "rejected"
                ? "Please add a reason that will be shared with the requester."
                : "Add an optional note for the audit timeline."}
            </DialogDescription>
          </DialogHeader>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comment (optional)" rows={4} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={act.isPending}>
              {act.isPending ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
