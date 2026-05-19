import { apiGet, apiGetWithMeta, apiPost } from "../client";
import type { ApiResponse } from "../types";
import type {
  CreateSeparationRequest,
  EosbPreview,
  EosbPreviewRequest,
  ListSeparationsQuery,
  Separation,
} from "./separations.types";

export const separationsApi = {
  list: (q: ListSeparationsQuery = {}): Promise<ApiResponse<Separation[]>> =>
    apiGetWithMeta<Separation[]>("/separations", q as Record<string, unknown>),
  findById: (id: string): Promise<Separation> => apiGet<Separation>(`/separations/${id}`),
  preview: (b: EosbPreviewRequest): Promise<EosbPreview> =>
    apiPost<EosbPreview>("/separations/eosb-preview", b),
  create: (b: CreateSeparationRequest): Promise<Separation> =>
    apiPost<Separation>("/separations", b),
  approve: (id: string): Promise<Separation> =>
    apiPost<Separation>(`/separations/${id}/approve`),
  process: (id: string, body: { payrollRunId?: string } = {}): Promise<Separation> =>
    apiPost<Separation>(`/separations/${id}/process`, body),
};
