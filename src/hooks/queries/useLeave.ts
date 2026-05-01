import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useRole } from "@/contexts/RoleContext";
import { notifyClientAdmins, notifyUser, getEmployeeUserId } from "@/lib/notify";
import { routeApprovalRequest } from "@/lib/approvalRouting";

export function useLeaveTypes() {
  return useQuery({
    queryKey: ["leave_types"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("leave_types").select("*").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await (supabase as any).from("leave_types").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave_types"] });
      toast.success("Leave type created");
    },
  });
}

export function useUpdateLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Record<string, any>) => {
      const { error } = await (supabase as any).from("leave_types").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leave_types"] }),
  });
}

export function useLeaveBalances(employee_id?: string, year?: number) {
  return useQuery({
    queryKey: ["leave_balances", employee_id, year],
    queryFn: async () => {
      let q = (supabase as any).from("leave_balances").select("*, leave_types(name, code)");
      if (employee_id) q = q.eq("employee_id", employee_id);
      if (year) q = q.eq("year", year);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useLeaveRequests(filters?: { status?: string; employee_id?: string }) {
  return useQuery({
    queryKey: ["leave_requests", filters],
    queryFn: async () => {
      let q = (supabase as any).from("leave_requests").select("*, leave_types(name), employees(first_name, last_name)").order("start_date", { ascending: false });
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.employee_id) q = q.eq("employee_id", filters.employee_id);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateLeaveRequest() {
  const qc = useQueryClient();
  const { clientId, profile } = useRole();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await (supabase as any).from("leave_requests").insert(payload).select("*, leave_types(name)").single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data: any) => {
      qc.invalidateQueries({ queryKey: ["leave_requests"] });
      toast.success("Leave request submitted");
      // Route to approvers via Approval Matrix; falls back to admins.
      await routeApprovalRequest({
        clientId,
        category: "leave",
        value: Number(data?.days ?? 0),
        notification: {
          title: "Leave request pending",
          body: `${profile?.full_name ?? "An employee"} requested ${data?.days ?? "?"} day(s) of ${data?.leave_types?.name ?? "leave"}.`,
          category: "leave",
          severity: "info",
          entityType: "leave_request",
          entityId: data?.id,
          actionUrl: "/leave",
        },
      });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to submit leave"),
  });
}

export function useUpdateLeaveRequest() {
  const qc = useQueryClient();
  const { clientId } = useRole();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Record<string, any>) => {
      const { data, error } = await (supabase as any)
        .from("leave_requests")
        .update(patch)
        .eq("id", id)
        .select("*, leave_types(name)")
        .single();
      if (error) throw error;
      return { data, patch };
    },
    onSuccess: async ({ data, patch }: any) => {
      qc.invalidateQueries({ queryKey: ["leave_requests"] });
      if (patch.status === "approved" || patch.status === "rejected") {
        const recipient = await getEmployeeUserId(data.employee_id);
        if (recipient) {
          await notifyUser(recipient, {
            title: patch.status === "approved" ? "Leave approved" : "Leave rejected",
            body:
              patch.status === "approved"
                ? `Your ${data?.leave_types?.name ?? "leave"} request for ${data?.days ?? "?"} day(s) has been approved.`
                : `Your ${data?.leave_types?.name ?? "leave"} request was rejected${
                    patch.rejection_reason ? `: ${patch.rejection_reason}` : "."
                  }`,
            category: "leave",
            severity: patch.status === "approved" ? "success" : "warning",
            entityType: "leave_request",
            entityId: data.id,
            actionUrl: "/leave",
            clientId,
          });
        }
      }
    },
  });
}

export function useHolidays() {
  return useQuery({
    queryKey: ["holidays"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("holidays").select("*").order("date");
      if (error) throw error;
      return data;
    },
  });
}
