/**
 * Monthly End-of-Service (EOS) accrual helper.
 *
 * Provision booked each payroll period = EOS earned through period-end
 *                                       − EOS earned through previous period-end.
 *
 * Uses the audited country EOS engine (src/lib/eosb) so the accrual matches
 * the eventual settlement to the halala. Returns 0n when inputs are missing.
 */
import { calculateEosb, type SupportedEosbCountry } from "@/lib/eosb";

export interface EosAccrualInput {
  country: SupportedEosbCountry | null | undefined;
  /** Last drawn basic / gratuity basis in MINOR units. */
  gratuityBasis: bigint;
  joiningDate: string | null | undefined;
  /** Inclusive end date of the payroll period (ISO yyyy-mm-dd). */
  periodEndDate: string;
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function calculateMonthlyEosAccrual(input: EosAccrualInput): bigint {
  if (!input.country || !input.joiningDate || input.gratuityBasis <= 0n) return 0n;

  const periodEnd = new Date(input.periodEndDate);
  const join = new Date(input.joiningDate);
  if (Number.isNaN(periodEnd.getTime()) || Number.isNaN(join.getTime())) return 0n;
  if (daysBetween(join, periodEnd) <= 0) return 0n;

  const prevEnd = new Date(periodEnd);
  prevEnd.setMonth(prevEnd.getMonth() - 1);
  const prevIso =
    daysBetween(join, prevEnd) > 0
      ? prevEnd.toISOString().slice(0, 10)
      : input.joiningDate;

  // Termination factor → full statutory entitlement (employer-side accrual).
  const current = calculateEosb(input.country, {
    lastBasic: input.gratuityBasis,
    joiningDate: input.joiningDate,
    lastWorkingDate: input.periodEndDate,
    reason: "termination",
  });
  const previous = calculateEosb(input.country, {
    lastBasic: input.gratuityBasis,
    joiningDate: input.joiningDate,
    lastWorkingDate: prevIso,
    reason: "termination",
  });

  const delta = current.amount - previous.amount;
  return delta > 0n ? delta : 0n;
}
