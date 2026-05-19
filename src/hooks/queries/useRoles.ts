/** Stub — custom roles + role_features admin table not on NestJS yet. */
export interface RoleRow {
  id: string;
  client_id: string | null;
  name: string;
  is_system: boolean;
  description: string | null;
  color: string | null;
}
const noopMut = {
  mutate: () => console.warn("[useRoles] not yet on NestJS"),
  mutateAsync: async () => undefined,
  isPending: false,
};
export function useRoles() { return { data: [] as RoleRow[], isLoading: false }; }
export function useCreateRole() { return noopMut; }
export function useUpdateRole() { return noopMut; }
export function useDeleteRole() { return noopMut; }
export function useRoleFeatures(_roleId?: string) { return { data: [], isLoading: false }; }
export function useUpdateRoleFeatures() { return noopMut; }
export function useAssignEmployeeRole() { return noopMut; }
export function useUnassignEmployeeRole() { return noopMut; }
