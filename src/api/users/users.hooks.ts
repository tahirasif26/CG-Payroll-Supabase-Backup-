import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "./users.api";
import { tokenStorage } from "../token-storage";
import type { UpdateProfileRequest } from "./users.types";

export const userKeys = {
  all: ["users"] as const,
  me: () => [...userKeys.all, "me"] as const,
  effectiveFeatures: () => [...userKeys.all, "me", "effective-features"] as const,
};

/**
 * Authenticated user profile. Disabled until a token is present so the query
 * doesn't fire pre-login.
 */
export function useMe() {
  return useQuery({
    queryKey: userKeys.me(),
    queryFn: () => usersApi.me(),
    enabled: !!tokenStorage.getAccessToken(),
    staleTime: 60_000,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateProfileRequest) => usersApi.updateProfile(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.me() });
    },
  });
}

/**
 * Effective feature keys for the current user in the active client scope.
 * Drives feature gating in ProtectedRoute, sidebar visibility, etc.
 */
export function useMyEffectiveFeatures() {
  return useQuery({
    queryKey: userKeys.effectiveFeatures(),
    queryFn: () => usersApi.effectiveFeatures(),
    enabled: !!tokenStorage.getAccessToken(),
    staleTime: 60_000,
  });
}
