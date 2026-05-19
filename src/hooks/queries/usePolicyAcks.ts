/** Stub — policy acknowledgements not on NestJS yet. */
export interface PolicyAckRow {
  id: string;
  policy_id: string;
  employee_id: string;
  acknowledged_at: string;
}
export function usePolicyAcks(_policyId?: string) { return { data: [] as PolicyAckRow[], isLoading: false }; }
export function useAckPolicy() {
  return { mutate: () => {}, mutateAsync: async () => undefined, isPending: false };
}
