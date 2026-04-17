import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { useToast } from "@/hooks/use-toast";

export interface ApprovalRoleRow {
  id: string;
  client_id: string;
  name: string;
  expense_approval_limit: number; // bigint comes back as number from PostgREST when small enough
  can_approve_hr: boolean;
  can_approve_payroll: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApprovalAssignmentRow {
  id: string;
  client_id: string;
  user_id: string;
  role_id: string;
  assigned_by: string | null;
  assigned_at: string;
}

/* ---------------- ROLES ---------------- */

export function useApprovalRoles() {
  const { clientId, isSuperAdmin } = useRole();
  return useQuery({
    queryKey: ["approval_roles", clientId ?? "super"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_roles")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []) as ApprovalRoleRow[];
    },
    enabled: !!clientId || isSuperAdmin,
    staleTime: 30_000,
  });
}

export function useUpsertApprovalRole() {
  const qc = useQueryClient();
  const { clientId } = useRole();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      name: string;
      expense_approval_limit: number;
      can_approve_hr: boolean;
      can_approve_payroll: boolean;
    }) => {
      if (!clientId) throw new Error("No client context");
      const payload = {
        client_id: clientId,
        name: input.name,
        expense_approval_limit: input.expense_approval_limit,
        can_approve_hr: input.can_approve_hr,
        can_approve_payroll: input.can_approve_payroll,
      };
      if (input.id) {
        const { data, error } = await supabase
          .from("approval_roles")
          .update(payload)
          .eq("id", input.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("approval_roles")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approval_roles"] });
      toast({ title: "Approval role saved" });
    },
    onError: (err: Error) =>
      toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });
}

export function useDeleteApprovalRole() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("approval_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approval_roles"] });
      qc.invalidateQueries({ queryKey: ["approval_assignments"] });
      toast({ title: "Approval role deleted" });
    },
    onError: (err: Error) =>
      toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
  });
}

/* ---------------- ASSIGNMENTS ---------------- */

export function useApprovalAssignments() {
  const { clientId, isSuperAdmin } = useRole();
  return useQuery({
    queryKey: ["approval_assignments", clientId ?? "super"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_approval_role_assignments")
        .select("*");
      if (error) throw error;
      return (data ?? []) as ApprovalAssignmentRow[];
    },
    enabled: !!clientId || isSuperAdmin,
    staleTime: 30_000,
  });
}

export function useAssignApprovalRole() {
  const qc = useQueryClient();
  const { clientId } = useRole();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { user_id: string; role_id: string }) => {
      if (!clientId) throw new Error("No client context");
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("user_approval_role_assignments")
        .insert({
          client_id: clientId,
          user_id: input.user_id,
          role_id: input.role_id,
          assigned_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approval_assignments"] });
      toast({ title: "Role assigned" });
    },
    onError: (err: Error) =>
      toast({ title: "Assign failed", description: err.message, variant: "destructive" }),
  });
}

export function useUnassignApprovalRole() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from("user_approval_role_assignments")
        .delete()
        .eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approval_assignments"] });
      toast({ title: "Assignment removed" });
    },
    onError: (err: Error) =>
      toast({ title: "Remove failed", description: err.message, variant: "destructive" }),
  });
}

/* ---------------- DERIVED PERMISSION CHECKS ---------------- */

/**
 * Build a permission lookup for a given user. Designed to be called from
 * components that already have the roles + assignments lists loaded.
 */
export function buildPermissionChecker(
  roles: ApprovalRoleRow[],
  assignments: ApprovalAssignmentRow[]
) {
  const rolesByUser = new Map<string, ApprovalRoleRow[]>();
  for (const a of assignments) {
    const role = roles.find((r) => r.id === a.role_id);
    if (!role) continue;
    const arr = rolesByUser.get(a.user_id) ?? [];
    arr.push(role);
    rolesByUser.set(a.user_id, arr);
  }

  return {
    getUserRoles: (userId: string) => rolesByUser.get(userId) ?? [],
    canApproveHR: (userId: string) =>
      (rolesByUser.get(userId) ?? []).some((r) => r.can_approve_hr),
    canApprovePayroll: (userId: string) =>
      (rolesByUser.get(userId) ?? []).some((r) => r.can_approve_payroll),
    /**
     * @param amount Amount in MINOR units (bigint). Compared against the role's
     *   expense_approval_limit (also in minor units, but stored as number).
     */
    canApproveExpense: (userId: string, amountMinor: bigint) => {
      const userRoles = rolesByUser.get(userId) ?? [];
      if (userRoles.length === 0) return { allowed: false, limit: 0n };
      const maxLimit = userRoles.reduce(
        (max, r) => (BigInt(r.expense_approval_limit) > max ? BigInt(r.expense_approval_limit) : max),
        0n
      );
      if (maxLimit === 0n) return { allowed: false, limit: 0n };
      return { allowed: amountMinor <= maxLimit, limit: maxLimit };
    },
  };
}
