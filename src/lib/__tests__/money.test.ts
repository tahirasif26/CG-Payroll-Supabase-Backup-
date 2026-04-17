import { describe, it, expect } from "vitest";
import {
  getCurrencyDecimals,
  toMinorUnits,
  fromMinorUnits,
  formatMoney,
  addMoney,
  subtractMoney,
  multiplyMoney,
  percentOf,
  divideMoney,
  compareMoney,
} from "../money";

describe("money — currency decimals", () => {
  it("returns 2 decimals for SAR/USD/EUR", () => {
    expect(getCurrencyDecimals("SAR")).toBe(2);
    expect(getCurrencyDecimals("usd")).toBe(2);
    expect(getCurrencyDecimals("EUR")).toBe(2);
  });
  it("returns 3 decimals for BHD/KWD/OMR", () => {
    expect(getCurrencyDecimals("BHD")).toBe(3);
    expect(getCurrencyDecimals("KWD")).toBe(3);
    expect(getCurrencyDecimals("OMR")).toBe(3);
  });
  it("returns 0 for JPY", () => {
    expect(getCurrencyDecimals("JPY")).toBe(0);
  });
  it("defaults to 2 for unknown currency", () => {
    expect(getCurrencyDecimals("XYZ")).toBe(2);
  });
});

describe("money — round-trip conversion", () => {
  it("converts 18,000 SAR to 1_800_000n halalas", () => {
    const minor = toMinorUnits(18000, "SAR");
    expect(minor).toBe(1_800_000n);
    expect(fromMinorUnits(minor, "SAR")).toBe(18000);
  });
  it("preserves precision through round-trip with BHD (3 decimals)", () => {
    const minor = toMinorUnits(1234.567, "BHD");
    expect(minor).toBe(1_234_567n);
    expect(fromMinorUnits(minor, "BHD")).toBe(1234.567);
  });
  it("handles 0 correctly", () => {
    expect(toMinorUnits(0, "SAR")).toBe(0n);
    expect(fromMinorUnits(0n, "SAR")).toBe(0);
  });
  it("handles negative amounts", () => {
    expect(toMinorUnits(-50.25, "USD")).toBe(-5025n);
    expect(fromMinorUnits(-5025n, "USD")).toBe(-50.25);
  });
  it("rounds to nearest minor unit on input", () => {
    expect(toMinorUnits(10.005, "USD")).toBe(1001n); // banker's-style? Math.round → 1001
    expect(toMinorUnits(10.004, "USD")).toBe(1000n);
  });
  it("throws on non-finite amount", () => {
    expect(() => toMinorUnits(NaN, "USD")).toThrow();
    expect(() => toMinorUnits(Infinity, "USD")).toThrow();
  });
});

describe("money — addition / subtraction", () => {
  it("adds an arbitrary number of bigints", () => {
    expect(addMoney(100n, 200n, 300n)).toBe(600n);
    expect(addMoney()).toBe(0n);
    expect(addMoney(1_000_000n)).toBe(1_000_000n);
  });
  it("subtracts correctly including negatives", () => {
    expect(subtractMoney(1000n, 250n)).toBe(750n);
    expect(subtractMoney(100n, 200n)).toBe(-100n);
  });
});

describe("money — multiply / percentage / divide", () => {
  it("multiplies by a factor", () => {
    expect(multiplyMoney(1000n, 1.5)).toBe(1500n);
    expect(multiplyMoney(1000n, 0)).toBe(0n);
  });
  it("computes 11.5% of 18,000 SAR (in halalas)", () => {
    // 18000 SAR = 1,800,000 halalas. 11.5% = 207,000 halalas = 2,070 SAR.
    const salary = toMinorUnits(18000, "SAR");
    const tax = percentOf(salary, 11.5);
    expect(tax).toBe(207_000n);
    expect(fromMinorUnits(tax, "SAR")).toBe(2070);
  });
  it("computes 0% and 100% correctly", () => {
    expect(percentOf(5000n, 0)).toBe(0n);
    expect(percentOf(5000n, 100)).toBe(5000n);
  });
  it("divides for pro-rata", () => {
    // 30,000 SAR / 30 days = 1000 SAR/day
    const salary = toMinorUnits(30000, "SAR");
    const perDay = divideMoney(salary, 30);
    expect(perDay).toBe(100_000n);
  });
  it("rounds division to nearest minor unit", () => {
    // 100 halalas / 3 = 33.33… → 33
    expect(divideMoney(100n, 3)).toBe(33n);
  });
  it("throws on division by zero", () => {
    expect(() => divideMoney(100n, 0)).toThrow();
  });
  it("throws on non-finite factor", () => {
    expect(() => multiplyMoney(100n, NaN)).toThrow();
    expect(() => divideMoney(100n, Infinity)).toThrow();
  });
});

describe("money — formatting", () => {
  it("formats SAR with 2 decimals", () => {
    const formatted = formatMoney(1_800_000n, "SAR", "en-US");
    // Different locales render the symbol differently; just check the digits.
    expect(formatted).toMatch(/18,000\.00/);
  });
  it("formats BHD with 3 decimals", () => {
    const formatted = formatMoney(1_234_567n, "BHD", "en-US");
    expect(formatted).toMatch(/1,234\.567/);
  });
  it("formats JPY with 0 decimals", () => {
    const formatted = formatMoney(50000n, "JPY", "en-US");
    expect(formatted).toMatch(/50,000/);
    expect(formatted).not.toMatch(/\./);
  });
});

describe("money — comparison", () => {
  it("returns 0 when equal", () => {
    expect(compareMoney(100n, 100n)).toBe(0);
  });
  it("returns -1 when smaller", () => {
    expect(compareMoney(50n, 100n)).toBe(-1);
  });
  it("returns 1 when larger", () => {
    expect(compareMoney(200n, 100n)).toBe(1);
  });
});

describe("money — very large numbers (>2^53)", () => {
  it("handles amounts beyond safe integer range", () => {
    // 100 trillion SAR = 10^16 halalas — well beyond Number.MAX_SAFE_INTEGER (9.007e15)
    const huge = 100_000_000_000_000_00n; // 10^16
    expect(addMoney(huge, huge)).toBe(2n * huge);
  });
});
