import { describe, it, expect } from "vitest";
import { calculateKsaEosb } from "../ksa";
import { toMinorUnits } from "../../money";

describe("KSA EOSB", () => {
  const basic = toMinorUnits(10000, "SAR"); // SAR 10,000 basic = 1,000,000 halalas

  it("returns 0 for resignation under 2 years", () => {
    const r = calculateKsaEosb({
      lastBasic: basic,
      joiningDate: "2023-01-01",
      lastWorkingDate: "2024-06-01",
      reason: "resignation",
    });
    expect(r.amount).toBe(0n);
  });

  it("applies 1/3 factor for resignation between 2 and 5 years", () => {
    const r = calculateKsaEosb({
      lastBasic: basic,
      joiningDate: "2020-01-01",
      lastWorkingDate: "2024-01-01", // 4 years
      reason: "resignation",
    });
    // Full = 4 * 0.5 * basic = 2 * basic = 20,000 SAR. * 1/3 ≈ 6666.67
    expect(r.amount).toBeGreaterThan(toMinorUnits(6500, "SAR"));
    expect(r.amount).toBeLessThan(toMinorUnits(6800, "SAR"));
  });

  it("returns full entitlement on termination", () => {
    const r = calculateKsaEosb({
      lastBasic: basic,
      joiningDate: "2020-01-01",
      lastWorkingDate: "2024-01-01",
      reason: "termination",
    });
    // 4 years * 0.5 month basic = 20,000 SAR
    expect(r.amount).toBe(toMinorUnits(20000, "SAR"));
  });

  it("applies 1 month per year after 5 years", () => {
    const r = calculateKsaEosb({
      lastBasic: basic,
      joiningDate: "2014-01-01",
      lastWorkingDate: "2024-01-01", // 10 years
      reason: "termination",
    });
    // 5 yrs * 0.5 + 5 yrs * 1 = 2.5 + 5 = 7.5 months basic = 75,000 SAR
    expect(r.amount).toBe(toMinorUnits(75000, "SAR"));
  });
});
