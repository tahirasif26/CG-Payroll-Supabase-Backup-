/** Stub — projects + cost allocations not on NestJS yet. */
const noopMut = {
  mutate: () => console.warn("[useProjects] not yet on NestJS"),
  mutateAsync: async () => undefined,
  isPending: false,
};
export interface ProjectRow {
  id: string;
  client_id: string;
  code: string;
  name: string;
  client_name: string | null;
  budget: number;
  start_date: string;
  status: string;
}
export interface CostAllocationRow {
  id: string;
  client_id: string;
  employee_id: string;
  project_id: string;
  month: number;
  year: number;
  allocation: number;
}
export function useProjects() { return { data: [] as ProjectRow[], isLoading: false }; }
export function useCreateProject() { return noopMut; }
export function useUpdateProject() { return noopMut; }
export function useDeleteProject() { return noopMut; }
export function useCostAllocations(_filters?: { month?: number; year?: number }) {
  return { data: [] as CostAllocationRow[], isLoading: false };
}
export function useUpsertCostAllocation() { return noopMut; }
export function useDeleteCostAllocation() { return noopMut; }
