/**
 * Phase 5-cutover shim. Most legacy approval-matrix queries map onto the new
 * @/api/approvals engine; the rest (workflow logs, legacy upsert helpers)
 * are kept as no-ops until proper page cutovers happen.
 */
import {
  useApprovalGroups as useApprovalGroupsApi,
  useApprovalPolicies as useApprovalPoliciesApi,
  useApprovalDelegations as useApprovalDelegationsApi,
  useCreateApprovalGroup as useCreateApprovalGroupApi,
  useUpdateApprovalGroup as useUpdateApprovalGroupApi,
  useDeleteApprovalGroup as useDeleteApprovalGroupApi,
  useCreateApprovalPolicy as useCreateApprovalPolicyApi,
  useUpdateApprovalPolicy as useUpdateApprovalPolicyApi,
  useCreateApprovalDelegation as useCreateApprovalDelegationApi,
  useRevokeApprovalDelegation as useRevokeApprovalDelegationApi,
} from "@/api";

export type ApprovalType = "any_one" | "all_must" | "majority";
export type PolicyCategory = "expense" | "advance" | "loan" | "leave" | "asset" | "payroll";

export interface ApprovalGroup {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  approval_type: ApprovalType;
  max_limit_halalas: number | null;
  is_active: boolean;
}
export interface ApprovalPolicy {
  id: string;
  client_id: string;
  category: PolicyCategory;
  min_value: number;
  max_value: number | null;
  group_id: string | null;
  sort_order: number;
  is_active: boolean;
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
export interface WorkflowLog {
  id: string;
  client_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  created_at: string;
}
export interface ApproverRow {
  employee_id: string;
  group_id: string;
  via_delegation: boolean;
}

const noopMut = {
  mutate: () => console.warn("[useApprovalMatrix] legacy path — use @/api/approvals"),
  mutateAsync: async () => undefined,
  isPending: false,
};

export function useApprovers(_clientId: string | null) {
  return { data: [] as ApproverRow[], isLoading: false };
}

export function useApprovalGroups(_clientId: string | null) {
  return useApprovalGroupsApi();
}
export function useCreateApprovalGroup() { return useCreateApprovalGroupApi(); }
export function useUpdateApprovalGroup() { return useUpdateApprovalGroupApi(); }
export function useDeleteApprovalGroup() { return useDeleteApprovalGroupApi(); }

export function useApprovalPolicies(_clientId: string | null) {
  return useApprovalPoliciesApi();
}
export function useCreateApprovalPolicy() { return useCreateApprovalPolicyApi(); }
export function useUpdateApprovalPolicy() { return useUpdateApprovalPolicyApi(); }

/**
 * Legacy upsert helper. The new engine has separate create/update endpoints —
 * we expose this as a generic "save" that picks based on presence of `id`.
 */
export function useUpsertApprovalPolicy() {
  const create = useCreateApprovalPolicyApi();
  const update = useUpdateApprovalPolicyApi();
  return {
    mutate: (p: Partial<ApprovalPolicy> & { id?: string }) => {
      if (p.id) {
        update.mutate({ id: p.id, body: {} });
      } else {
        create.mutate({
          module: (p.category ?? "expense") as never,
          minValueMinor: p.min_value ?? 0,
          maxValueMinor: p.max_value ?? null,
          groupId: p.group_id,
          sortOrder: p.sort_order,
          isActive: p.is_active,
        });
      }
    },
    mutateAsync: async () => undefined,
    isPending: create.isPending || update.isPending,
  };
}

export function useDeleteApprovalPolicy() { return noopMut; }

export function useApprovalDelegations(_clientId: string | null) {
  return useApprovalDelegationsApi();
}
export function useCreateApprovalDelegation() { return useCreateApprovalDelegationApi(); }
export function useRevokeApprovalDelegation() { return useRevokeApprovalDelegationApi(); }
export function useCreateDelegation() { return useCreateApprovalDelegationApi(); }
export function useDeleteDelegation() { return useRevokeApprovalDelegationApi(); }

export function useWorkflowLogs(_clientId: string | null) {
  return { data: [] as WorkflowLog[], isLoading: false };
}

/** No-op — workflow events are written server-side by the audit interceptor. */
export async function logWorkflowEvent(
  _entityType: string,
  _entityId: string,
  _action: string,
  _metadata?: Record<string, unknown>,
): Promise<void> {}
