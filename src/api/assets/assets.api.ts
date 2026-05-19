import { apiClient, apiGet, apiGetWithMeta, apiPatch, apiPost } from "../client";
import { ApiClientError } from "../errors";
import type { ApiResponse } from "../types";
import type {
  AssignAssetRequest,
  Asset,
  CreateAssetRequest,
  ListAssetsQuery,
  UnassignAssetRequest,
  UpdateAssetRequest,
} from "./assets.types";

export const assetsApi = {
  list: (query: ListAssetsQuery = {}): Promise<ApiResponse<Asset[]>> =>
    apiGetWithMeta<Asset[]>("/assets", query as Record<string, unknown>),
  findById: (id: string): Promise<Asset> => apiGet<Asset>(`/assets/${id}`),
  create: (b: CreateAssetRequest): Promise<Asset> => apiPost<Asset>("/assets", b),
  update: (id: string, b: UpdateAssetRequest): Promise<Asset> =>
    apiPatch<Asset>(`/assets/${id}`, b),
  assign: (id: string, b: AssignAssetRequest): Promise<Asset> =>
    apiPost<Asset>(`/assets/${id}/assign`, b),
  unassign: (id: string, b: UnassignAssetRequest = {}): Promise<Asset> =>
    apiPost<Asset>(`/assets/${id}/unassign`, b),
  async delete(id: string): Promise<Asset> {
    const res = await apiClient.delete<ApiResponse<Asset>>(`/assets/${id}`);
    if (!res.data?.success || !res.data.data) {
      throw new ApiClientError(res.status, res.data?.error ?? {
        code: "UNEXPECTED_RESPONSE",
        message: "Delete asset did not return data",
      });
    }
    return res.data.data;
  },
};
