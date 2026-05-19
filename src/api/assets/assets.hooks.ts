import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assetsApi } from "./assets.api";
import { tokenStorage } from "../token-storage";
import type {
  AssignAssetRequest,
  CreateAssetRequest,
  ListAssetsQuery,
  UnassignAssetRequest,
  UpdateAssetRequest,
} from "./assets.types";

const enabled = () => !!tokenStorage.getAccessToken();

export const assetKeys = {
  all: ["assets"] as const,
  list: (q: ListAssetsQuery) => [...assetKeys.all, "list", q] as const,
  detail: (id: string) => [...assetKeys.all, "detail", id] as const,
};

export function useAssets(query: ListAssetsQuery = {}) {
  return useQuery({
    queryKey: assetKeys.list(query),
    queryFn: () => assetsApi.list(query),
    enabled: enabled(),
  });
}

export function useAsset(id: string | null | undefined) {
  return useQuery({
    queryKey: assetKeys.detail(id ?? ""),
    queryFn: () => assetsApi.findById(id!),
    enabled: !!id && enabled(),
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: CreateAssetRequest) => assetsApi.create(b),
    onSuccess: () => qc.invalidateQueries({ queryKey: assetKeys.all }),
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateAssetRequest }) =>
      assetsApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: assetKeys.all }),
  });
}

export function useAssignAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AssignAssetRequest }) =>
      assetsApi.assign(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: assetKeys.all }),
  });
}

export function useUnassignAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body?: UnassignAssetRequest }) =>
      assetsApi.unassign(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: assetKeys.all }),
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => assetsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: assetKeys.all }),
  });
}
