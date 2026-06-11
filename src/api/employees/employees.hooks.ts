import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { employeesApi } from "./employees.api";
import { tokenStorage } from "../token-storage";
import type {
  ArchiveEmployeeRequest,
  CreateEmployeeRequest,
  ListEmployeesQuery,
  UpdateEmployeeProfileRequest,
  UpdateEmployeeRequest,
} from "./employees.types";

export const employeeKeys = {
  all: ["employees"] as const,
  list: (q: ListEmployeesQuery) => [...employeeKeys.all, "list", q] as const,
  detail: (id: string) => [...employeeKeys.all, "detail", id] as const,
  profile: (id: string) => [...employeeKeys.all, "profile", id] as const,
  me: () => [...employeeKeys.all, "me"] as const,
};

export function useEmployees(
  query: ListEmployeesQuery = {},
  opts: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: employeeKeys.list(query),
    queryFn: () => employeesApi.list(query),
    // `opts.enabled ?? true` keeps the existing call sites (which never pass
    // an enabled flag) firing on mount. Providers that want lazy fetching
    // can pass `enabled: false` (or a counter-derived boolean).
    enabled: !!tokenStorage.getAccessToken() && (opts.enabled ?? true),
  });
}

export function useEmployee(id: string | null | undefined) {
  return useQuery({
    queryKey: employeeKeys.detail(id ?? ""),
    queryFn: () => employeesApi.findById(id!),
    enabled: !!id && !!tokenStorage.getAccessToken(),
  });
}

/** The Employee record for the current authenticated user (self-service pages). */
export function useMyEmployee() {
  return useQuery({
    queryKey: employeeKeys.me(),
    queryFn: () => employeesApi.me(),
    enabled: !!tokenStorage.getAccessToken(),
    // The backend 404s when the user has no employee row (e.g. super_admin) —
    // surface that as a clean undefined rather than a thrown error in consumers.
    retry: false,
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateEmployeeRequest) => employeesApi.create(body),
    onSuccess: async () => {
      // `refetchType: 'all'` (and the explicit await) is the difference
      // between "list invalidated but waiting for the next observer remount"
      // and "list actually visibly updates the moment the wizard closes".
      // The app's QueryClient default is `refetchOnMount: false` with a 5-min
      // `staleTime`, so the default 'active' refetch behavior alone isn't
      // enough to guarantee an immediate re-render of every observer.
      await qc.invalidateQueries({ queryKey: employeeKeys.all, refetchType: 'all' });
    },
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateEmployeeRequest }) =>
      employeesApi.update(id, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: employeeKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: employeeKeys.all });
    },
  });
}

/**
 * Full profile with all sub-records. Use this on MyProfilePage / admin profile
 * editors that need addresses, bank, emergency, education, documents, comp.
 */
export function useEmployeeProfile(id: string | null | undefined) {
  return useQuery({
    queryKey: employeeKeys.profile(id ?? ""),
    queryFn: () => employeesApi.profile(id!),
    enabled: !!id && !!tokenStorage.getAccessToken(),
  });
}

export function useUpdateEmployeeProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateEmployeeProfileRequest }) =>
      employeesApi.updateProfile(id, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: employeeKeys.profile(vars.id) });
      qc.invalidateQueries({ queryKey: employeeKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: employeeKeys.me() });
    },
  });
}

export function useArchiveEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body?: ArchiveEmployeeRequest }) =>
      employeesApi.archive(id, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: employeeKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: employeeKeys.all });
    },
  });
}
