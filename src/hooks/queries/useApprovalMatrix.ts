import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ApprovalType = "any_one" | "all_must" | "majority";
export type PolicyCategory =
  | "expenses_travel"
  | "expenses_meals"
  | "expenses_other"
  | "leave"
  | "loans"
  | "advances"
  | "assets";

export interface ApprovalGroup {
  id: string;
  client_id: string;
  name: string;
  max_limit_halalas: number | null;
  approval_type: ApprovalType;
  escalate_after_days: number | null;
  escalate_to_group_id: string | null;
  member_ids: string[];
}

export interface ApprovalPolicy {
  id: string;
  client_id: string;
  category: PolicyCategory;
  min_value: number;
  max_value: number | null;
  group_id: string | null;
  approval_type_override: ApprovalType | null;
  sort_order: number;
}

export interface ApprovalDelegation {
  id: string;
  client_id: string;
  from_employee_id: string;
  to_employee_id: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

// ─────────────────────────────────────────────────────────────────────
// Approvers — employees whose role grants people-level access
// ─────────────────────────────────────────────────────────────────────
export interface ApproverRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  department: string | null;
  avatar_url: string | null;
  role_id: string | null;
  role_name: string | null;
  capabilities: string[]; // feature_keys with people_enabled = true
}

// Any feature_key that grants approval rights → makes the holder an approver.
const APPROVE_FEATURE_KEYS = [
  "expenses.approve",
  "loans.approve",
  "leave.approve",
  "advances.approve",
  "assets.approve_requests",
  "payroll.approve_run",
  "performance.calibration",
  "timesheets.approve",
];

export function useApprovers(clientId: string | null) {
  return useQuery({
    enabled: !!clientId,
    queryKey: ["approvers", clientId],
    queryFn: async (): Promise<ApproverRow[]> => {
      // 1) All active employees in the client (we filter later).
      const { data: emps, error: e1 } = await (supabase as any)
        .from("employees")
        .select(
          "id, first_name, last_name, department, avatar_url, role_id, user_id, enabled_features, roles(name)"
        )
        .eq("client_id", clientId)
        .eq("status", "active");
      if (e1) throw e1;

      // 2) Role-based capabilities — collect ALL approve features for any role
      // present in this client, regardless of `people_enabled` flag (that flag
      // is for menu visibility, not approval authority).
      const roleIds = Array.from(
        new Set((emps ?? []).map((e: any) => e.role_id).filter(Boolean))
      );
      const roleCapMap = new Map<string, string[]>();
      if (roleIds.length > 0) {
        const { data: rfs, error: e2 } = await (supabase as any)
          .from("role_features")
          .select("role_id, feature_key")
          .in("role_id", roleIds)
          .in("feature_key", APPROVE_FEATURE_KEYS);
        if (e2) throw e2;
        (rfs ?? []).forEach((r: any) => {
          const arr = roleCapMap.get(r.role_id) ?? [];
          arr.push(r.feature_key);
          roleCapMap.set(r.role_id, arr);
        });
      }

      // 3) Admins (and HR) — auto-approvers with full approval capability.
      const userIds = Array.from(
        new Set((emps ?? []).map((e: any) => e.user_id).filter(Boolean))
      );
      const adminUsers = new Set<string>();
      if (userIds.length > 0) {
        const { data: urs } = await (supabase as any)
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", userIds)
          .in("role", ["admin", "hr"]);
        (urs ?? []).forEach((r: any) => adminUsers.add(r.user_id));
      }

      const result: ApproverRow[] = [];
      for (const e of emps ?? []) {
        const caps = new Set<string>();

        // Role capabilities
        (roleCapMap.get(e.role_id) ?? []).forEach((k) => caps.add(k));

        // Per-employee feature overrides (only count approve-keys)
        (Array.isArray(e.enabled_features) ? e.enabled_features : []).forEach(
          (k: string) => {
            if (APPROVE_FEATURE_KEYS.includes(k)) caps.add(k);
          }
        );

        // Admin / HR → all approve capabilities by default
        const isAdmin = e.user_id && adminUsers.has(e.user_id);
        if (isAdmin) {
          APPROVE_FEATURE_KEYS.forEach((k) => caps.add(k));
        }

        if (caps.size === 0) continue;

        result.push({
          id: e.id,
          first_name: e.first_name,
          last_name: e.last_name,
          department: e.department,
          avatar_url: e.avatar_url,
          role_id: e.role_id,
          role_name: isAdmin ? (e.roles?.name ?? "Admin") : (e.roles?.name ?? null),
          capabilities: Array.from(caps),
        });
      }
      return result;
    },
  });
}

// ─────────────────────────────────────────────────────────────────────
// Approval Groups
// ─────────────────────────────────────────────────────────────────────
export function useApprovalGroups(clientId: string | null) {
  return useQuery({
    enabled: !!clientId,
    queryKey: ["approval_groups", clientId],
    queryFn: async (): Promise<ApprovalGroup[]> => {
      const { data: groups, error } = await (supabase as any)
        .from("approval_groups")
        .select("*")
        .eq("client_id", clientId)
        .order("name");
      if (error) throw error;

      const ids = (groups ?? []).map((g: any) => g.id);
      let memberMap = new Map<string, string[]>();
      if (ids.length > 0) {
        const { data: mem } = await (supabase as any)
          .from("approval_group_members")
          .select("group_id, employee_id")
          .in("group_id", ids);
        (mem ?? []).forEach((m: any) => {
          const arr = memberMap.get(m.group_id) ?? [];
          arr.push(m.employee_id);
          memberMap.set(m.group_id, arr);
        });
      }

      return (groups ?? []).map((g: any) => ({
        ...g,
        member_ids: memberMap.get(g.id) ?? [],
      }));
    },
  });
}

export function useCreateApprovalGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      client_id: string;
      name: string;
      max_limit_halalas: number | null;
      approval_type: ApprovalType;
      escalate_after_days: number | null;
      escalate_to_group_id: string | null;
      member_ids: string[];
    }) => {
      const { member_ids, ...row } = input;
      const { data: g, error } = await (supabase as any)
        .from("approval_groups")
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      if (member_ids.length > 0) {
        const { error: e2 } = await (supabase as any)
          .from("approval_group_members")
          .insert(member_ids.map((employee_id) => ({ group_id: g.id, employee_id })));
        if (e2) throw e2;
      }
      return g;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approval_groups"] });
      toast.success("Approval group created");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to create group"),
  });
}

export function useUpdateApprovalGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      name: string;
      max_limit_halalas: number | null;
      approval_type: ApprovalType;
      escalate_after_days: number | null;
      escalate_to_group_id: string | null;
      member_ids: string[];
    }) => {
      const { id, member_ids, ...patch } = input;
      const { error } = await (supabase as any).from("approval_groups").update(patch).eq("id", id);
      if (error) throw error;
      // Replace members
      const { error: eDel } = await (supabase as any)
        .from("approval_group_members")
        .delete()
        .eq("group_id", id);
      if (eDel) throw eDel;
      if (member_ids.length > 0) {
        const { error: eIns } = await (supabase as any)
          .from("approval_group_members")
          .insert(member_ids.map((employee_id) => ({ group_id: id, employee_id })));
        if (eIns) throw eIns;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approval_groups"] });
      toast.success("Approval group updated");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to update group"),
  });
}

export function useDeleteApprovalGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("approval_groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approval_groups"] });
      qc.invalidateQueries({ queryKey: ["approval_policies"] });
      toast.success("Approval group deleted");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to delete group"),
  });
}

// ─────────────────────────────────────────────────────────────────────
// Approval Policies
// ─────────────────────────────────────────────────────────────────────
export function useApprovalPolicies(clientId: string | null) {
  return useQuery({
    enabled: !!clientId,
    queryKey: ["approval_policies", clientId],
    queryFn: async (): Promise<ApprovalPolicy[]> => {
      const { data, error } = await (supabase as any)
        .from("approval_policies")
        .select("*")
        .eq("client_id", clientId)
        .order("category")
        .order("sort_order")
        .order("min_value");
      if (error) throw error;
      return (data ?? []) as ApprovalPolicy[];
    },
  });
}

export function useUpsertApprovalPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ApprovalPolicy> & { client_id: string; category: PolicyCategory }) => {
      if (input.id) {
        const { id, ...patch } = input;
        const { error } = await (supabase as any).from("approval_policies").update(patch).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("approval_policies").insert(input);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approval_policies"] });
      toast.success("Policy saved");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save policy"),
  });
}

export function useDeleteApprovalPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("approval_policies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approval_policies"] });
      toast.success("Policy deleted");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to delete policy"),
  });
}

// ─────────────────────────────────────────────────────────────────────
// Delegations
// ─────────────────────────────────────────────────────────────────────
export function useApprovalDelegations(clientId: string | null) {
  return useQuery({
    enabled: !!clientId,
    queryKey: ["approval_delegations", clientId],
    queryFn: async (): Promise<ApprovalDelegation[]> => {
      const { data, error } = await (supabase as any)
        .from("approval_delegations")
        .select("*")
        .eq("client_id", clientId)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ApprovalDelegation[];
    },
  });
}

export function useCreateDelegation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<ApprovalDelegation, "id">) => {
      const { error } = await (supabase as any).from("approval_delegations").insert(input);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approval_delegations"] });
      toast.success("Delegation created");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to create delegation"),
  });
}

export function useDeleteDelegation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("approval_delegations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approval_delegations"] });
      toast.success("Delegation removed");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to remove delegation"),
  });
}
