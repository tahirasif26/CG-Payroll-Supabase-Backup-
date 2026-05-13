import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { actOnRequest, markRequestPaid, type RequestModule, type WorkflowAction } from "@/lib/workflow";
import { toast } from "sonner";

export interface RequestApprovalRow {
  id: string;
  client_id: string;
  module: RequestModule;
  entity_id: string;
  requester_employee_id: string;
  policy_id: string | null;
  value_amount: number;
  value_unit: string;
  current_level: number;
  current_group_id: string | null;
  status: string;
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Fetches the workflow row + current pending assignees for a given module entity. */
export function useRequestApproval(module: RequestModule, entityId: string | undefined) {
  return useQuery({
    queryKey: ["request_approval", module, entityId],
    enabled: !!entityId,
    queryFn: async () => {
      const { data: row, error } = await (supabase as any)
        .from("request_approvals")
        .select("*")
        .eq("module", module)
        .eq("entity_id", entityId)
        .maybeSingle();
      if (error) throw error;
      if (!row) return null;
      const { data: assignments } = await (supabase as any)
        .from("request_assignments")
        .select("id, level_order, employee_id, group_id, status, via_delegation")
        .eq("request_approval_id", row.id)
        .order("level_order");
      return { ...row, assignments: assignments ?? [] } as RequestApprovalRow & { assignments: any[] };
    },
  });
}

/** Bulk lookup keyed by entity_id — used to render "Requested To" in list views. */
export function useRequestApprovalsByEntities(module: RequestModule, entityIds: string[]) {
  return useQuery({
    queryKey: ["request_approvals_bulk", module, entityIds.sort().join(",")],
    enabled: entityIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("request_approvals")
        .select("*, request_assignments(id, employee_id, status, level_order, group_id)")
        .eq("module", module)
        .in("entity_id", entityIds);
      if (error) throw error;
      const map = new Map<string, any>();
      (data ?? []).forEach((r: any) => map.set(r.entity_id, r));
      return map;
    },
  });
}

export function useApprovalHistory(requestApprovalId: string | undefined) {
  return useQuery({
    queryKey: ["request_approval_history", requestApprovalId],
    enabled: !!requestApprovalId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("request_approval_history")
        .select("*")
        .eq("request_approval_id", requestApprovalId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useActOnRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; action: WorkflowAction; comment?: string }) =>
      actOnRequest(vars.id, vars.action, vars.comment),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["request_approval"] });
      qc.invalidateQueries({ queryKey: ["request_approvals_bulk"] });
      qc.invalidateQueries({ queryKey: ["request_approval_history", vars.id] });
      toast.success(
        vars.action === "approved" ? "Approved" :
        vars.action === "rejected" ? "Rejected" : "Marked delivered"
      );
    },
    onError: (e: any) => toast.error(e.message ?? "Action failed"),
  });
}

export function useMarkRequestPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; payrollRunId?: string | null; paid?: boolean }) =>
      markRequestPaid(vars.id, vars.payrollRunId, vars.paid ?? true),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["request_approval"] });
      qc.invalidateQueries({ queryKey: ["request_approvals_bulk"] });
      qc.invalidateQueries({ queryKey: ["payroll_payment_status"] });
    },
  });
}

/** Subscribes to realtime updates and invalidates relevant queries. */
export function useRequestsRealtime(clientId: string | null | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!clientId) return;
    const channel = supabase
      .channel(`requests-realtime-${clientId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "request_approvals" }, () => {
        qc.invalidateQueries({ queryKey: ["request_approval"] });
        qc.invalidateQueries({ queryKey: ["request_approvals_bulk"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "request_assignments" }, () => {
        qc.invalidateQueries({ queryKey: ["request_approval"] });
        qc.invalidateQueries({ queryKey: ["request_approvals_bulk"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "request_approval_history" }, () => {
        qc.invalidateQueries({ queryKey: ["request_approval_history"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clientId, qc]);
}
