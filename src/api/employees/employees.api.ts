import { apiClient, apiGet, apiGetWithMeta, apiPatch, apiPost } from "../client";
import { ApiClientError } from "../errors";
import type { ApiResponse } from "../types";
import type {
  ArchiveEmployeeRequest,
  CreateEmployeeRequest,
  Employee,
  EmployeeDirectoryItem,
  EmployeeProfile,
  EmployeeWithRelations,
  ListEmployeesQuery,
  UpdateEmployeeProfileRequest,
  UpdateEmployeeRequest,
} from "./employees.types";

export const employeesApi = {
  /** Returns the envelope with pagination meta so paginated UIs can read it. */
  list(query: ListEmployeesQuery = {}): Promise<ApiResponse<EmployeeDirectoryItem[]>> {
    return apiGetWithMeta<EmployeeDirectoryItem[]>(
      "/employees",
      query as Record<string, unknown>,
    );
  },

  findById(id: string): Promise<EmployeeWithRelations> {
    return apiGet<EmployeeWithRelations>(`/employees/${id}`);
  },

  /** Get the full profile including every sub-record (Phase 3b). */
  profile(id: string): Promise<EmployeeProfile> {
    return apiGet<EmployeeProfile>(`/employees/${id}/profile`);
  },

  /** Bulk-save profile sub-records (transactional on the backend). */
  updateProfile(id: string, body: UpdateEmployeeProfileRequest): Promise<EmployeeProfile> {
    return apiPatch<EmployeeProfile>(`/employees/${id}/profile`, body);
  },

  /** Resolves the Employee record linked to the current user. */
  me(): Promise<EmployeeWithRelations> {
    return apiGet<EmployeeWithRelations>("/employees/me");
  },

  create(body: CreateEmployeeRequest): Promise<Employee> {
    return apiPost<Employee>("/employees", body);
  },

  update(id: string, body: UpdateEmployeeRequest): Promise<Employee> {
    return apiPatch<Employee>(`/employees/${id}`, body);
  },

  /**
   * Soft archive — backend accepts an optional separationDate in the body. We
   * call axios directly because the typed apiDelete helper does not forward
   * a request body.
   */
  async archive(id: string, body: ArchiveEmployeeRequest = {}): Promise<Employee> {
    const res = await apiClient.delete<ApiResponse<Employee>>(`/employees/${id}`, { data: body });
    if (!res.data?.success || !res.data.data) {
      throw new ApiClientError(res.status, res.data?.error ?? {
        code: "UNEXPECTED_RESPONSE",
        message: "Archive request did not return employee data",
      });
    }
    return res.data.data;
  },
};
