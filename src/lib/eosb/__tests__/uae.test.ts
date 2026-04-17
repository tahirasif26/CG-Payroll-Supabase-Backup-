import { describe, it, expect } from "vitest";
import { calculateUaeEosb } from "../uae";
import { toMinorUnits } from "../../money";

describe("UAE EOSB", () => {
  const basic = toMinorUnits(10000, "AED"); // AED 10,000

  it("returns 0 for less than 1 year", () => {
    const r = calculateUaeEosb({
      lastBasic: basic,
      joiningDate: "2024-01-01",
      lastWorkingDate: "2024-06-01",
      reason: "resignation",
    });
    expect(r.amount).toBe(0n);
  });

  it("calculates 21 days/year for first 5 years", () => {
    const r = calculateUaeEosb({
      lastBasic: basic,
      joiningDate: "2021-01-01",
      lastWorkingDate: "2024-01-01", // ~3 years
      reason: "resignation",
    });
    // 3 years * 21 days * (basic/30) = 63/30 * 10000 = 21,000 AED
    expect(r.amount).toBeGreaterThan(toMinorUnits(20800, "AED"));
    expect(r.amount).toBeLessThan(toMinorUnits(21200, "AED"));
  });

  it("caps at 2 years of basic salary", () => {
    const r = calculateUaeEosb({
      lastBasic: basic,
      joiningDate: "1990-01-01",
      lastWorkingDate: "2030-01-01",
      reason: "termination",
    });
    expect(r.amount).toBe(toMinorUnits(240000, "AED")); // 24 months
  });
});
