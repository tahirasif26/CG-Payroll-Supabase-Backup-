/**
 * Saudi Arabia (KSA) End-of-Service Benefits.
 * Direct port of `src/lib/eosb/ksa.ts`. Reference: Saudi Labor Law Articles 84–87.
 */
import { divideMoney, multiplyMoney } from './money';
import type { EosbInput, EosbResult } from './index';

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

  const firstSegmentYears = Math.min(years, 5);
  const secondSegmentYears = Math.max(years - 5, 0);

  const firstSegment = multiplyMoney(halfMonth, firstSegmentYears);
  const secondSegment = multiplyMoney(input.lastBasic, secondSegmentYears);
  const fullEntitlement = firstSegment + secondSegment;

  let factor = 1;
  const notes: string[] = [];
  if (input.reason === 'resignation') {
    if (years < 2) {
      factor = 0;
      notes.push('Resignation under 2 years — no entitlement.');
    } else if (years < 5) {
      factor = 1 / 3;
      notes.push('Resignation 2–5 years — 1/3 of full entitlement.');
    } else if (years < 10) {
      factor = 2 / 3;
      notes.push('Resignation 5–10 years — 2/3 of full entitlement.');
    } else {
      factor = 1;
      notes.push('Resignation >= 10 years — full entitlement.');
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
        { label: 'First 5 yrs (1/2 month basic × years)', amount: firstSegment },
        { label: 'After 5 yrs (1 month basic × years)', amount: secondSegment },
        { label: 'Resignation factor adjustment', amount: amount - fullEntitlement },
      ],
      notes,
    },
  };
}
