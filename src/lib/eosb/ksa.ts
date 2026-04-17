/**
 * Saudi Arabia (KSA) End-of-Service Benefits.
 * Reference: Saudi Labor Law, Articles 84–87.
 *
 * Rule of thumb (private sector, indefinite contract):
 *  - First 5 years: 1/2 month basic salary per year of service
 *  - After 5 years: 1 month basic salary per year of service
 *  - On RESIGNATION: entitlement is reduced based on tenure
 *      < 2 years    -> 0
 *      2 – < 5 years -> 1/3 of full
 *      5 – < 10 yrs  -> 2/3 of full
 *      >= 10 years   -> full
 *  - On TERMINATION / END_OF_CONTRACT / RETIREMENT: full entitlement
 */
import { divideMoney, multiplyMoney } from "../money";
import type { EosbInput, EosbResult } from "./types";

function yearsBetween(from: string, to: string): number {
  const a = new Date(from);
  const b = new Date(to);
  const ms = b.getTime() - a.getTime();
  if (ms <= 0) return 0;
  return ms / (1000 * 60 * 60 * 24 * 365.25);
}

export function calculateKsaEosb(input: EosbInput): EosbResult {
  const years = yearsBetween(input.joiningDate, input.lastWorkingDate);
  const halfMonth = divideMoney(input.lastBasic, 2);

  // Full gratuity: 1/2 month for first 5 years + 1 month for years above 5.
  const firstSegmentYears = Math.min(years, 5);
  const secondSegmentYears = Math.max(years - 5, 0);

  const firstSegment = multiplyMoney(halfMonth, firstSegmentYears);
  const secondSegment = multiplyMoney(input.lastBasic, secondSegmentYears);
  const fullEntitlement = firstSegment + secondSegment;

  let factor = 1;
  const notes: string[] = [];
  if (input.reason === "resignation") {
    if (years < 2) {
      factor = 0;
      notes.push("Resignation under 2 years — no entitlement.");
    } else if (years < 5) {
      factor = 1 / 3;
      notes.push("Resignation 2–5 years — 1/3 of full entitlement.");
    } else if (years < 10) {
      factor = 2 / 3;
      notes.push("Resignation 5–10 years — 2/3 of full entitlement.");
    } else {
      factor = 1;
      notes.push("Resignation >= 10 years — full entitlement.");
    }
  } else {
    notes.push(`${input.reason} — full entitlement.`);
  }

  const amount = multiplyMoney(fullEntitlement, factor);

  return {
    amount,
    breakdown: {
      yearsOfService: Number(years.toFixed(4)),
      components: [
        { label: "First 5 yrs (1/2 month basic × years)", amount: firstSegment },
        { label: "After 5 yrs (1 month basic × years)", amount: secondSegment },
        { label: "Resignation factor adjustment", amount: amount - fullEntitlement },
      ],
      notes,
    },
  };
}
