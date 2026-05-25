import { useSetupProgress, type SetupProgressResponse, type SetupStepKey } from "@/api";
import { useRole } from "@/contexts/RoleContext";

export type OnboardingStepKey = SetupStepKey;

export interface OnboardingStatus extends SetupProgressResponse {
  /** Convenience alias kept for old callers. */
  steps: SetupProgressResponse["steps"];
}

/**
 * First-login setup wizard state, derived live from real tenant data. Only
 * fetched for tenant admins/HR who own setup; everyone else gets a no-op
 * "complete" stub so banners and redirects stay hidden.
 */
export function useOnboardingStatus() {
  const { appRole, isSuperAdmin, clientId } = useRole();
  const ownsSetup = !isSuperAdmin && !!clientId && (appRole === "admin" || appRole === "hr");

  const query = useSetupProgress(ownsSetup);

  if (!ownsSetup) {
    return {
      status: null as OnboardingStatus | null,
      isComplete: true,
      pendingSteps: [] as string[],
      isLoading: false,
      refetch: query.refetch,
    };
  }

  return {
    status: (query.data ?? null) as OnboardingStatus | null,
    isComplete: query.data?.isComplete ?? false,
    pendingSteps:
      query.data?.steps.filter((s) => !s.done).map((s) => s.key) ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
