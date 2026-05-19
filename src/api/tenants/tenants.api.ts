import { apiGet, apiGetWithMeta, apiPatch, apiPost } from "../client";
import type { PaginationQuery, ApiResponse } from "../types";
import type {
  CreateTenantRequest,
  CreateTenantResponse,
  Tenant,
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
};
