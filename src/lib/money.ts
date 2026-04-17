/**
 * Money utilities — all amounts are stored as bigint in MINOR units of the
 * given currency (e.g. halalas for SAR, fils for AED, cents for USD).
 *
 * Why bigint? JavaScript numbers are IEEE-754 doubles which lose precision
 * around 2^53. Payroll math accumulates rounding errors fast; bigint
 * eliminates an entire class of bugs.
 */

const CURRENCY_DECIMALS: Record<string, number> = {
  SAR: 2, AED: 2, USD: 2, EUR: 2, GBP: 2,
  BHD: 3, KWD: 3, OMR: 3,
  QAR: 2, INR: 2, EGP: 2, JOD: 3, LYD: 3, TND: 3,
  JPY: 0, KRW: 0,
};

export function getCurrencyDecimals(currency: string): number {
  return CURRENCY_DECIMALS[currency.toUpperCase()] ?? 2;
}

/** Convert a human-readable number to bigint minor units. */
export function toMinorUnits(amount: number, currency: string): bigint {
  if (!Number.isFinite(amount)) throw new Error("Amount must be a finite number");
  const decimals = getCurrencyDecimals(currency);
  const factor = 10 ** decimals;
  return BigInt(Math.round(amount * factor));
}

/** Convert bigint minor units back to a number (for display ONLY). */
export function fromMinorUnits(amount: bigint, currency: string): number {
  const decimals = getCurrencyDecimals(currency);
  const factor = 10 ** decimals;
  return Number(amount) / factor;
}

/** Format minor-unit bigint as a localized currency string. */
export function formatMoney(amount: bigint, currency: string, locale: string = "en-US"): string {
  const value = fromMinorUnits(amount, currency);
  const decimals = getCurrencyDecimals(currency);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function addMoney(...amounts: bigint[]): bigint {
  return amounts.reduce((sum, a) => sum + a, 0n);
}

export function subtractMoney(a: bigint, b: bigint): bigint {
  return a - b;
}

/** Multiply a money amount by a real-number factor. Result is rounded to nearest minor unit. */
export function multiplyMoney(amount: bigint, factor: number): bigint {
  if (!Number.isFinite(factor)) throw new Error("Factor must be a finite number");
  return BigInt(Math.round(Number(amount) * factor));
}

/** Get a percentage of an amount. `percentage` is a number like 11.5 for 11.5%. */
export function percentOf(amount: bigint, percentage: number): bigint {
  return multiplyMoney(amount, percentage / 100);
}

/** Divide for pro-rata calculations. Result rounded to nearest minor unit. */
export function divideMoney(amount: bigint, divisor: number): bigint {
  if (!Number.isFinite(divisor)) throw new Error("Divisor must be a finite number");
  if (divisor === 0) throw new Error("Division by zero");
  return BigInt(Math.round(Number(amount) / divisor));
}

/** Compare two money amounts (returns -1, 0, 1). */
export function compareMoney(a: bigint, b: bigint): -1 | 0 | 1 {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
