/** Stub — company_policies table not on NestJS yet. */
export interface PolicyRow {
  id: string;
  client_id: string;
  title: string;
  category: string;
  file_url: string | null;
  status: string;
}
const noopMut = { mutate: () => {}, mutateAsync: async () => undefined, isPending: false };
export function usePolicies() { return { data: [] as PolicyRow[], isLoading: false }; }
export function useCreatePolicy() { return noopMut; }
export function useUpdatePolicy() { return noopMut; }
export function useDeletePolicy() { return noopMut; }
