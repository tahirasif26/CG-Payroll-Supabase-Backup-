export interface OrgStructureRow {
  id: string;
  clientId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Division has no extra fields beyond the generic name-only lookup. */
export type Division = OrgStructureRow;

/** Department has no extra fields beyond the generic name-only lookup. */
export type Department = OrgStructureRow;

/** Designations carry a numeric seniority level (1=Entry … 4=Leadership). */
export interface Designation extends OrgStructureRow {
  level: number | null;
}

export interface CreateNamedLookupRequest {
  name: string;
  isActive?: boolean;
}
export type UpdateNamedLookupRequest = Partial<CreateNamedLookupRequest>;

export interface CreateDesignationRequest extends CreateNamedLookupRequest {
  level?: number | null;
}
export type UpdateDesignationRequest = Partial<CreateDesignationRequest>;
