/**
 * UAE End-of-Service Benefits.
 * Direct port of `src/lib/eosb/uae.ts`. Reference: UAE Federal Decree Law 33/2021.
 */
import { divideMoney, multiplyMoney } from './money';
import type { EosbInput, EosbResult } from './index';

const DAYS_IN_MONTH = 30;

function yearsBetween(from: string, to: string): number {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  if (ms <= 0) return 0;
  return ms / (1000 * 60 * 60 * 24 * 365.25);
}

export function calculateUaeEosb(input: EosbInput): EosbResult {
  const years = yearsBetween(input.joiningDate, input.lastWorkingDate);
  const notes: string[] = [];

  if (years < 1) {
    notes.push('UAE: less than 1 year of service — no gratuity payable.');
    return {
      amount: BigInt(0),
      breakdown: { yearsOfService: Number(years.toFixed(4)), components: [], notes },
    };
  }

  const dailyBasic = divideMoney(input.lastBasic, DAYS_IN_MONTH);
  const firstSegYears = Math.min(years, 5);
  const secondSegYears = Math.max(years - 5, 0);

  const firstSegment = multiplyMoney(dailyBasic, 21 * firstSegYears);
  const secondSegment = multiplyMoney(dailyBasic, 30 * secondSegYears);
  let total = firstSegment + secondSegment;

  const cap = multiplyMoney(input.lastBasic, 24);
  if (total > cap) {
    notes.push('Capped at 2 years of basic salary per UAE Labor Law.');
    total = cap;
  }

  notes.push(`Reason: ${input.reason} — full entitlement under 2021 Labor Law.`);

  return {
    amount: total,
    breakdown: {
      yearsOfService: Number(years.toFixed(4)),
      components: [
        { label: 'First 5 yrs (21 days basic × years)', amount: firstSegment },
        { label: 'After 5 yrs (30 days basic × years)', amount: secondSegment },
      ],
      notes,
    },
  };
}
