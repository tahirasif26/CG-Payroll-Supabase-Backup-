/** Stub — EOS benefit configs aren't yet a relational table on NestJS. The
 * EOSB calculator (KSA/UAE) lives in the backend Separations module. */
export interface EOSTier { years: number; rate: number; }
export interface EOSBenefitConfig {
  id: string;
  client_id: string;
  country: string;
  is_active: boolean;
  tiers: EOSTier[];
}
export const eosBenefitConfigs: EOSBenefitConfig[] = [];
export function useEosBenefitConfigs() { return { data: eosBenefitConfigs, isLoading: false }; }
export function useUpsertEosBenefitConfig() {
  return { mutate: () => {}, mutateAsync: async () => undefined, isPending: false };
}
export function useDeleteEosBenefitConfig() {
  return { mutate: () => {}, mutateAsync: async () => undefined, isPending: false };
}
export function calculateEOSBenefit(_country: string, _years: number, _salary: number) {
  return 0;
}
