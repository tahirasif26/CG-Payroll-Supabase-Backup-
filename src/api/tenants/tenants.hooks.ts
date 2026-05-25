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

export function useDeleteTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tenantsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantKeys.all });
    },
  });
}

export const tabAccessKeys = {
  forClient: (id: string) => ["tenants", "tab-access", id] as const,
  mine: ["tenants", "me", "tabs"] as const,
};

export function useTenantTabAccess(id: string | null | undefined) {
  return useQuery({
    queryKey: tabAccessKeys.forClient(id ?? ""),
    queryFn: () => tenantsApi.getTabAccess(id!),
    enabled: !!id,
  });
}

export function useSetTenantTabAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabledTabKeys }: { id: string; enabledTabKeys: string[] }) =>
      tenantsApi.setTabAccess(id, enabledTabKeys),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: tabAccessKeys.forClient(vars.id) });
      qc.invalidateQueries({ queryKey: tabAccessKeys.mine });
      qc.invalidateQueries({ queryKey: tenantKeys.detail(vars.id) });
    },
  });
}

export function useMyTabs() {
  return useQuery({
    queryKey: tabAccessKeys.mine,
    queryFn: () => tenantsApi.myTabs(),
    staleTime: 60_000,
  });
}

export const setupProgressKeys = {
  mine: ["tenants", "me", "setup-progress"] as const,
};

export function useSetupProgress(enabled = true) {
  return useQuery({
    queryKey: setupProgressKeys.mine,
    queryFn: () => tenantsApi.mySetupProgress(),
    enabled,
    staleTime: 30_000,
  });
}

export function useDismissSetupWizard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => tenantsApi.dismissSetupWizard(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: setupProgressKeys.mine });
    },
  });
}
