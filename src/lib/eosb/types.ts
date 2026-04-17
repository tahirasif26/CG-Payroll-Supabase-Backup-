/**
 * End-of-Service Benefits (EOSB) — common types.
 * All money values are bigint in the currency's minor units (see src/lib/money.ts).
 */
export type SeparationReason = "resignation" | "termination" | "end_of_contract" | "retirement";

export interface EosbInput {
  /** Last drawn basic salary in minor units (bigint). */
  lastBasic: bigint;
  /** ISO date strings. */
  joiningDate: string;
  lastWorkingDate: string;
  reason: SeparationReason;
}

export interface EosbResult {
  /** Computed gratuity in minor units. */
  amount: bigint;
  /** Detailed audit-friendly breakdown. */
  breakdown: {
    yearsOfService: number;
    /** Components added together to produce the final amount, each in minor units. */
    components: Array<{ label: string; amount: bigint }>;
    notes: string[];
  };
}
