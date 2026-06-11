import { apiDelete, apiGet, apiPatch, apiPost } from "../client";
import type {
  CreateDesignationRequest,
  CreateNamedLookupRequest,
  Department,
  Designation,
  Division,
  UpdateDesignationRequest,
  UpdateNamedLookupRequest,
} from "./org-structure.types";

export const orgStructureApi = {
  // Divisions
  listDivisions: (): Promise<Division[]> => apiGet<Division[]>("/divisions"),
  createDivision: (body: CreateNamedLookupRequest): Promise<Division> =>
    apiPost<Division>("/divisions", body),
  updateDivision: (id: string, body: UpdateNamedLookupRequest): Promise<Division> =>
    apiPatch<Division>(`/divisions/${id}`, body),
  deleteDivision: (id: string): Promise<Division> => apiDelete<Division>(`/divisions/${id}`),

  // Departments
  listDepartments: (): Promise<Department[]> => apiGet<Department[]>("/departments"),
  createDepartment: (body: CreateNamedLookupRequest): Promise<Department> =>
    apiPost<Department>("/departments", body),
  updateDepartment: (id: string, body: UpdateNamedLookupRequest): Promise<Department> =>
    apiPatch<Department>(`/departments/${id}`, body),
  deleteDepartment: (id: string): Promise<Department> => apiDelete<Department>(`/departments/${id}`),

  // Designations
  listDesignations: (): Promise<Designation[]> => apiGet<Designation[]>("/designations"),
  createDesignation: (body: CreateDesignationRequest): Promise<Designation> =>
    apiPost<Designation>("/designations", body),
  updateDesignation: (id: string, body: UpdateDesignationRequest): Promise<Designation> =>
    apiPatch<Designation>(`/designations/${id}`, body),
  deleteDesignation: (id: string): Promise<Designation> =>
    apiDelete<Designation>(`/designations/${id}`),
};
