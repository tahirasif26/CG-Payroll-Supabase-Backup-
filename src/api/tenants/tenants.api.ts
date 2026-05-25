import { apiDelete, apiGet, apiGetWithMeta, apiPatch, apiPost, apiPut } from "../client";
import type { PaginationQuery, ApiResponse } from "../types";
import type {
  CreateTenantRequest,
  CreateTenantResponse,
  MyTabsResponse,
  SetupProgressResponse,
  Tenant,
  TenantTabAccess,
  UpdateTenantRequest,
} from "./tenants.types";

export const tenantsApi = {
  create(body: CreateTenantRequest): Promise<CreateTenantResponse> {
    return apiPost<CreateTenantResponse>("/tenants", body);
  },

  list(query: PaginationQuery = {}): Promise<ApiResponse<Tenant[]>> {
    return apiGetWithMeta<Tenant[]>("/tenants", query as Record<string, unknown>);
  },

  findById(id: string): Promise<Tenant> {
    return apiGet<Tenant>(`/tenants/${id}`);
  },

  update(id: string, body: UpdateTenantRequest): Promise<Tenant> {
    return apiPatch<Tenant>(`/tenants/${id}`, body);
  },

  /** Hard delete — cascades all related rows. Super-admin only on the backend. */
  delete(id: string): Promise<Tenant> {
    return apiDelete<Tenant>(`/tenants/${id}`);
  },

  /** Super-admin: read a tenant's enabled tab keys. */
  getTabAccess(id: string): Promise<TenantTabAccess> {
    return apiGet<TenantTabAccess>(`/tenants/${id}/tab-access`);
  },

  /** Super-admin: replace a tenant's enabled tab keys. */
  setTabAccess(id: string, enabledTabKeys: string[]): Promise<TenantTabAccess> {
    return apiPut<TenantTabAccess>(`/tenants/${id}/tab-access`, { enabledTabKeys });
  },

  /** Caller's accessible tab keys. `null` = super_admin (unrestricted). */
  myTabs(): Promise<MyTabsResponse> {
    return apiGet<MyTabsResponse>("/tenants/me/tabs");
  },

  /** First-login setup wizard progress for the caller's tenant. */
  mySetupProgress(): Promise<SetupProgressResponse> {
    return apiGet<SetupProgressResponse>("/tenants/me/setup-progress");
  },

  /** Dismiss the wizard banner (the wizard itself remains accessible). */
  dismissSetupWizard(): Promise<{ dismissedAt: string | null }> {
    return apiPost<{ dismissedAt: string | null }>("/tenants/me/setup-wizard/dismiss", {});
  },
};
