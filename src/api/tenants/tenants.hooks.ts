import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tenantsApi } from "./tenants.api";
import type { PaginationQuery } from "../types";
import type {
  CreateTenantRequest,
  UpdateTenantRequest,
} from "./tenants.types";

export const tenantKeys = {
  all: ["tenants"] as const,
  list: (q: PaginationQuery) => [...tenantKeys.all, "list", q] as const,
  detail: (id: string) => [...tenantKeys.all, "detail", id] as const,
};

export function useTenants(query: PaginationQuery = {}) {
  return useQuery({
    queryKey: tenantKeys.list(query),
    queryFn: () => tenantsApi.list(query),
  });
}

export function useTenant(id: string | null | undefined) {
  return useQuery({
    queryKey: tenantKeys.detail(id ?? ""),
    queryFn: () => tenantsApi.findById(id!),
    enabled: !!id,
  });
}

export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTenantRequest) => tenantsApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantKeys.all });
    },
  });
}

export function useUpdateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateTenantRequest }) =>
      tenantsApi.update(id, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: tenantKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: tenantKeys.all });
    },
  });
}
