/**
 * Backend mirror of `src/lib/money.ts` — minimal subset used by the EOSB
 * calculators. Kept in-module so EOSB stays self-contained.
 */

export function multiplyMoney(amount: bigint, factor: number): bigint {
  if (!Number.isFinite(factor)) throw new Error('Factor must be a finite number');
  return BigInt(Math.round(Number(amount) * factor));
}

export function divideMoney(amount: bigint, divisor: number): bigint {
  if (!Number.isFinite(divisor)) throw new Error('Divisor must be a finite number');
  if (divisor === 0) throw new Error('Division by zero');
  return BigInt(Math.round(Number(amount) / divisor));
}
