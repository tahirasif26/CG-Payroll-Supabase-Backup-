/** Stub — onboarding completion tracking not yet on NestJS. Returns
 * "complete" so OnboardingBanner stays hidden. */
export function useOnboardingStatus() {
  return {
    isComplete: true,
    pendingSteps: [] as string[],
    isLoading: false,
  };
}
