import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { separationsApi } from "./separations.api";
import { tokenStorage } from "../token-storage";
import type {
  CreateSeparationRequest,
  EosbPreviewRequest,
  ListSeparationsQuery,
} from "./separations.types";

const enabled = () => !!tokenStorage.getAccessToken();
export const separationKeys = {
  all: ["separations"] as const,
  list: (q: ListSeparationsQuery) => [...separationKeys.all, "list", q] as const,
  detail: (id: string) => [...separationKeys.all, "detail", id] as const,
};

export function useSeparations(q: ListSeparationsQuery = {}) {
  return useQuery({
    queryKey: separationKeys.list(q),
    queryFn: () => separationsApi.list(q),
    enabled: enabled(),
  });
}
export function useSeparation(id: string | null | undefined) {
  return useQuery({
    queryKey: separationKeys.detail(id ?? ""),
    queryFn: () => separationsApi.findById(id!),
    enabled: !!id && enabled(),
  });
}
export function usePreviewEosb() {
  return useMutation({
    mutationFn: (b: EosbPreviewRequest) => separationsApi.preview(b),
  });
}
export function useCreateSeparation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: CreateSeparationRequest) => separationsApi.create(b),
    onSuccess: () => qc.invalidateQueries({ queryKey: separationKeys.all }),
  });
}
export function useApproveSeparation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => separationsApi.approve(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: separationKeys.all }),
  });
}
export function useProcessSeparation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body?: { payrollRunId?: string } }) =>
      separationsApi.process(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: separationKeys.all }),
  });
}
