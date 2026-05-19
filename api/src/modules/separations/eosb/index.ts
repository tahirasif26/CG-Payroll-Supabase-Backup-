/**
 * EOSB (End of Service Benefits) calculator — port of `src/lib/eosb/`. Pure
 * logic, no Nest, no Prisma. Country-specific rules live in `ksa.ts` / `uae.ts`;
 * this file is the dispatcher.
 */
import { calculateKsaEosb } from './ksa';
import { calculateUaeEosb } from './uae';

export type SupportedEosbCountry = 'SA' | 'AE';
export type SeparationReason =
  | 'resignation'
  | 'termination'
  | 'end_of_contract'
  | 'retirement';

export interface EosbInput {
  lastBasic: bigint;
  joiningDate: string;
  lastWorkingDate: string;
  reason: SeparationReason;
}

export interface EosbResult {
  amount: bigint;
  breakdown: {
    yearsOfService: number;
    components: Array<{ label: string; amount: bigint }>;
    notes: string[];
  };
}

export function calculateEosb(country: SupportedEosbCountry, input: EosbInput): EosbResult {
  switch (country) {
    case 'SA':
      return calculateKsaEosb(input);
    case 'AE':
      return calculateUaeEosb(input);
    default: {
      const _exhaustive: never = country;
      throw new Error(`Unsupported EOSB country: ${_exhaustive}`);
    }
  }
}

export { calculateKsaEosb, calculateUaeEosb };
