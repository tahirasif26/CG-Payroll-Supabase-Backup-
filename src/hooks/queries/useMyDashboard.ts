/** Stub — dashboard aggregate not yet on NestJS. Pages fall back to direct
 * @/api hook usage for individual data. */
export function useMyDashboard() {
  return {
    data: {
      myExpenses: [],
      myAdvances: [],
      myLeaves: [],
      myAssets: [],
      pendingApprovals: 0,
    },
    isLoading: false,
  };
}
