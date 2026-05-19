import { apiGet, apiGetWithMeta, apiPatch, apiPost } from "../client";
import type { ApiResponse } from "../types";
import type {
  Advance,
  CreateAdvanceRequest,
  DecideAdvanceRequest,
  ListAdvancesQuery,
  SettleAdvanceRequest,
  UpdateAdvanceRequest,
} from "./advances.types";

export const advancesApi = {
  list: (query: ListAdvancesQuery = {}): Promise<ApiResponse<Advance[]>> =>
    apiGetWithMeta<Advance[]>("/advances", query as Record<string, unknown>),
  findById: (id: string): Promise<Advance> => apiGet<Advance>(`/advances/${id}`),
  create: (b: CreateAdvanceRequest): Promise<Advance> => apiPost<Advance>("/advances", b),
  update: (id: string, b: UpdateAdvanceRequest): Promise<Advance> =>
    apiPatch<Advance>(`/advances/${id}`, b),
  submit: (id: string): Promise<Advance> => apiPost<Advance>(`/advances/${id}/submit`),
  decide: (id: string, b: DecideAdvanceRequest): Promise<Advance> =>
    apiPost<Advance>(`/advances/${id}/decision`, b),
  settle: (id: string, b: SettleAdvanceRequest = {}): Promise<Advance> =>
    apiPost<Advance>(`/advances/${id}/settle`, b),
  cancel: (id: string): Promise<Advance> => apiPost<Advance>(`/advances/${id}/cancel`),
};
