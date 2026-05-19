/** Phase 7 shim — delegates to @/api/separations. */
import { useSeparations as useSeparationsApi, useCreateSeparation } from "@/api";

export function useSeparations(filters?: { status?: string }) {
  return useSeparationsApi({ status: filters?.status as never });
}

export function useCreateSeparationRecord() { return useCreateSeparation(); }
