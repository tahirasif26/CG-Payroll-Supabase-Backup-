import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { advancesApi } from "./advances.api";
import { tokenStorage } from "../token-storage";
import type {
  CreateAdvanceRequest,
  DecideAdvanceRequest,
  ListAdvancesQuery,
  SettleAdvanceRequest,
  UpdateAdvanceRequest,
} from "./advances.types";

const enabled = () => !!tokenStorage.getAccessToken();

export const advanceKeys = {
  all: ["advances"] as const,
  list: (q: ListAdvancesQuery) => [...advanceKeys.all, "list", q] as const,
  detail: (id: string) => [...advanceKeys.all, "detail", id] as const,
};

export function useAdvances(query: ListAdvancesQuery = {}) {
  return useQuery({
    queryKey: advanceKeys.list(query),
    queryFn: () => advancesApi.list(query),
    enabled: enabled(),
  });
}

export function useAdvance(id: string | null | undefined) {
  return useQuery({
    queryKey: advanceKeys.detail(id ?? ""),
    queryFn: () => advancesApi.findById(id!),
    enabled: !!id && enabled(),
  });
}

export function useCreateAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: CreateAdvanceRequest) => advancesApi.create(b),
    onSuccess: () => qc.invalidateQueries({ queryKey: advanceKeys.all }),
  });
}

export function useUpdateAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateAdvanceRequest }) =>
      advancesApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: advanceKeys.all }),
  });
}

export function useSubmitAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => advancesApi.submit(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: advanceKeys.all }),
  });
}

export function useDecideAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: DecideAdvanceRequest }) =>
      advancesApi.decide(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: advanceKeys.all }),
  });
}

export function useSettleAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body?: SettleAdvanceRequest }) =>
      advancesApi.settle(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: advanceKeys.all }),
  });
}

export function useCancelAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => advancesApi.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: advanceKeys.all }),
  });
}
