import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orgStructureApi } from "./org-structure.api";
import type {
  CreateDesignationRequest,
  CreateNamedLookupRequest,
  UpdateDesignationRequest,
  UpdateNamedLookupRequest,
} from "./org-structure.types";

export const orgStructureKeys = {
  divisions: ["org-structure", "divisions"] as const,
  departments: ["org-structure", "departments"] as const,
  designations: ["org-structure", "designations"] as const,
};

// ─── Divisions ───────────────────────────────────────────────────────────────

export function useDivisions() {
  return useQuery({
    queryKey: orgStructureKeys.divisions,
    queryFn: () => orgStructureApi.listDivisions(),
  });
}

export function useCreateDivision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateNamedLookupRequest) => orgStructureApi.createDivision(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: orgStructureKeys.divisions }),
  });
}

export function useUpdateDivision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateNamedLookupRequest }) =>
      orgStructureApi.updateDivision(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: orgStructureKeys.divisions }),
  });
}

export function useDeleteDivision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => orgStructureApi.deleteDivision(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: orgStructureKeys.divisions }),
  });
}

// ─── Departments ─────────────────────────────────────────────────────────────

export function useDepartments() {
  return useQuery({
    queryKey: orgStructureKeys.departments,
    queryFn: () => orgStructureApi.listDepartments(),
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateNamedLookupRequest) => orgStructureApi.createDepartment(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: orgStructureKeys.departments }),
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateNamedLookupRequest }) =>
      orgStructureApi.updateDepartment(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: orgStructureKeys.departments }),
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => orgStructureApi.deleteDepartment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: orgStructureKeys.departments }),
  });
}

// ─── Designations ────────────────────────────────────────────────────────────

export function useDesignations() {
  return useQuery({
    queryKey: orgStructureKeys.designations,
    queryFn: () => orgStructureApi.listDesignations(),
  });
}

export function useCreateDesignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateDesignationRequest) => orgStructureApi.createDesignation(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: orgStructureKeys.designations }),
  });
}

export function useUpdateDesignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateDesignationRequest }) =>
      orgStructureApi.updateDesignation(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: orgStructureKeys.designations }),
  });
}

export function useDeleteDesignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => orgStructureApi.deleteDesignation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: orgStructureKeys.designations }),
  });
}
