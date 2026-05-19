/** Stub — legacy request workflow superseded by @/api/approvals. */
const noopMut = {
  mutate: () => console.warn("[useRequestWorkflow] use @/api/approvals instead"),
  mutateAsync: async () => undefined,
  isPending: false,
};

export interface RequestApprovalRow {
  id: string;
  module: string;
  entity_id: string;
  status: string;
  current_level: number;
  current_group_id: string | null;
}
export interface RequestApprovalHistoryRow {
  id: string;
  request_approval_id: string;
  level_order: number;
  action: string;
  actor_user_id: string | null;
  comment: string | null;
  created_at: string;
}

export function useRequestWorkflow() { return { data: null, isLoading: false }; }
export function useActOnRequest() { return noopMut; }

export function useRequestApproval(_module?: string, _entityId?: string) {
  return { data: null as RequestApprovalRow | null, isLoading: false };
}

export function useApprovalHistory(_requestApprovalId?: string) {
  return { data: [] as RequestApprovalHistoryRow[], isLoading: false };
}

/**
 * Realtime invalidation hook. The legacy version subscribed to
 * Supabase postgres_changes; the new flow uses the NestJS WebSocket gateway
 * (Phase 8). For now this is a no-op effect — pages still refetch on
 * mount/focus.
 */
export function useRequestsRealtime(_module?: string) {
  // intentionally empty — Phase 8 WebSocket gateway integration pending
}
