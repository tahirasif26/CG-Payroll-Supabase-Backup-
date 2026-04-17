import { describe, it, expect } from "vitest";
import {
  calculateEmployeePayroll,
  calculateBasic,
  calculateTax,
  aggregateRunTotals,
} from "../calculator";
import type {
  CalculationContext,
  PayrollComponent,
  PayrollEmployee,
  PayrollSetupSnapshot,
  PayrollTaxRule,
} from "../types";
import { toMinorUnits, fromMinorUnits } from "../money";

const baseEmployee: PayrollEmployee = {
  id: "emp-1",
  emp_id: "CG-001",
  first_name: "Aisha",
  last_name: "Rahman",
  salary: 18000,
  pay_currency: "SAR",
};

const baseSetup: PayrollSetupSnapshot = {
  id: "setup-1",
  name: "Saudi Direct",
  currency: "SAR",
  options: { enable_tax_calculation: false },
};

function ctx(overrides: Partial<CalculationContext> = {}): CalculationContext {
  return {
    employee: baseEmployee,
    setup: baseSetup,
    components: [],
    taxRules: [],
    loans: [],
    approvedExpenses: 0n,
    approvedAdvances: 0n,
    oneOffAdjustments: [],
    ...overrides,
  };
}

describe("calculateBasic", () => {
  it("defaults to 60% of gross when no basic component is configured", () => {
    const gross = toMinorUnits(10000, "SAR");
    expect(calculateBasic([], gross, "SAR")).toBe(toMinorUnits(6000, "SAR"));
  });

  it("uses an explicit percentage component", () => {
    const comps: PayrollComponent[] = [
      {
        id: "c1",
        name: "Basic Salary",
        type: "earning",
        calculation_type: "percentage",
        value: 50,
        status: "active",
        order_index: 0,
      },
    ];
    const gross = toMinorUnits(10000, "SAR");
    expect(calculateBasic(comps, gross, "SAR")).toBe(toMinorUnits(5000, "SAR"));
  });

  it("uses an explicit fixed component", () => {
    const comps: PayrollComponent[] = [
      {
        id: "c1",
        name: "Basic Pay",
        type: "earning",
        calculation_type: "fixed",
        value: 7500,
        status: "active",
        order_index: 0,
      },
    ];
    expect(calculateBasic(comps, 0n, "SAR")).toBe(toMinorUnits(7500, "SAR"));
  });
});

describe("calculateTax", () => {
  const slabs: PayrollTaxRule[] = [
    {
      id: "t1",
      slab_name: "0-100k",
      income_from: toMinorUnits(0, "SAR"),
      income_to: toMinorUnits(100000, "SAR"),
      percentage: 0,
      order_index: 0,
    },
    {
      id: "t2",
      slab_name: "100-300k",
      income_from: toMinorUnits(100000, "SAR"),
      income_to: toMinorUnits(300000, "SAR"),
      percentage: 10,
      order_index: 1,
    },
    {
      id: "t3",
      slab_name: "300k+",
      income_from: toMinorUnits(300000, "SAR"),
      income_to: toMinorUnits(999_999_999, "SAR"),
      percentage: 20,
      order_index: 2,
    },
  ];

  it("returns 0 when disabled", () => {
    expect(calculateTax(slabs, toMinorUnits(20000, "SAR"), false)).toBe(0n);
  });

  it("returns 0 when no rules", () => {
    expect(calculateTax([], toMinorUnits(20000, "SAR"), true)).toBe(0n);
  });

  it("applies progressive slabs (annual 240k -> taxable 140k @ 10% = 14k/yr ~= 1166.67/mo)", () => {
    // monthly 20000 -> annual 240000; slab2 covers 100k..240k = 140k @ 10% = 14000/yr
    const monthly = calculateTax(slabs, toMinorUnits(20000, "SAR"), true);
    expect(fromMinorUnits(monthly, "SAR")).toBeCloseTo(14000 / 12, 2);
  });

  it("crosses multiple slabs (annual 360k)", () => {
    // 100k..300k @10% = 20000; 300k..360k @20% = 12000; total 32000/yr
    const monthly = calculateTax(slabs, toMinorUnits(30000, "SAR"), true);
    expect(fromMinorUnits(monthly, "SAR")).toBeCloseTo(32000 / 12, 2);
  });

  it("respects slab boundary exactly at lower bound (no tax owed in that slab)", () => {
    // annual exactly 100k -> only slab 1 applies, percentage 0
    const monthly = calculateTax(
      slabs,
      toMinorUnits(100000 / 12, "SAR"),
      true
    );
    expect(monthly).toBe(0n);
  });

  it("returns 0 for zero gross", () => {
    expect(calculateTax(slabs, 0n, true)).toBe(0n);
  });
});

describe("calculateEmployeePayroll", () => {
  it("computes a vanilla direct employee with default 60/40 split", () => {
    const result = calculateEmployeePayroll(ctx());
    expect(fromMinorUnits(result.gross, "SAR")).toBe(18000);
    expect(fromMinorUnits(result.basic, "SAR")).toBe(10800);
    expect(fromMinorUnits(result.allowances, "SAR")).toBe(7200);
    expect(result.totalDeductions).toBe(0n);
    expect(result.netPay).toBe(result.gross);
  });

  it("applies setup deductions (e.g. GOSI 9.75% of gross)", () => {
    const components: PayrollComponent[] = [
      {
        id: "g",
        name: "GOSI",
        type: "deduction",
        calculation_type: "percentage",
        value: 9.75,
        status: "active",
        order_index: 0,
      },
    ];
    const result = calculateEmployeePayroll(ctx({ components }));
    // 18000 * 0.0975 = 1755
    expect(fromMinorUnits(result.statutoryDeduction, "SAR")).toBeCloseTo(1755, 2);
    expect(fromMinorUnits(result.netPay, "SAR")).toBeCloseTo(18000 - 1755, 2);
  });

  it("ignores inactive components", () => {
    const components: PayrollComponent[] = [
      {
        id: "g",
        name: "GOSI",
        type: "deduction",
        calculation_type: "percentage",
        value: 9.75,
        status: "inactive",
        order_index: 0,
      },
    ];
    const result = calculateEmployeePayroll(ctx({ components }));
    expect(result.statutoryDeduction).toBe(0n);
  });

  it("contractor with no statutory deductions", () => {
    const result = calculateEmployeePayroll(
      ctx({
        employee: { ...baseEmployee, salary: 12000 },
        components: [],
      })
    );
    expect(result.totalDeductions).toBe(0n);
    expect(fromMinorUnits(result.netPay, "SAR")).toBe(12000);
  });

  it("intern with reduced salary", () => {
    const result = calculateEmployeePayroll(
      ctx({ employee: { ...baseEmployee, salary: 3000 } })
    );
    expect(fromMinorUnits(result.gross, "SAR")).toBe(3000);
    expect(fromMinorUnits(result.basic, "SAR")).toBe(1800);
  });

  it("subtracts active loan deductions", () => {
    const result = calculateEmployeePayroll(
      ctx({
        loans: [
          { id: "l1", monthly_deduction: toMinorUnits(500, "SAR") },
          { id: "l2", monthly_deduction: toMinorUnits(300, "SAR") },
        ],
      })
    );
    expect(fromMinorUnits(result.loanDeduction, "SAR")).toBe(800);
    expect(fromMinorUnits(result.netPay, "SAR")).toBe(18000 - 800);
  });

  it("adds approved expense reimbursements", () => {
    const result = calculateEmployeePayroll(
      ctx({ approvedExpenses: toMinorUnits(450, "SAR") })
    );
    expect(fromMinorUnits(result.netPay, "SAR")).toBe(18000 + 450);
  });

  it("adds approved advances", () => {
    const result = calculateEmployeePayroll(
      ctx({ approvedAdvances: toMinorUnits(2000, "SAR") })
    );
    expect(fromMinorUnits(result.netPay, "SAR")).toBe(18000 + 2000);
  });

  it("handles one-off bonuses and deductions", () => {
    const result = calculateEmployeePayroll(
      ctx({
        oneOffAdjustments: [
          { id: "1", name: "Eid Bonus", amount: toMinorUnits(1500, "SAR"), type: "benefit" },
          { id: "2", name: "Late Penalty", amount: toMinorUnits(200, "SAR"), type: "deduction" },
        ],
      })
    );
    expect(fromMinorUnits(result.oneOffBenefits, "SAR")).toBe(1500);
    expect(fromMinorUnits(result.oneOffDeductions, "SAR")).toBe(200);
    expect(fromMinorUnits(result.netPay, "SAR")).toBe(18000 + 1500 - 200);
  });

  it("includes separation settlement when present", () => {
    const result = calculateEmployeePayroll(
      ctx({ separation: { settlement: toMinorUnits(50000, "SAR") } })
    );
    expect(fromMinorUnits(result.separationSettlement, "SAR")).toBe(50000);
    expect(fromMinorUnits(result.netPay, "SAR")).toBe(18000 + 50000);
  });

  it("respects employee pay_currency for multi-currency staff", () => {
    const result = calculateEmployeePayroll(
      ctx({
        employee: { ...baseEmployee, salary: 5000, pay_currency: "USD" },
      })
    );
    expect(result.payCurrency).toBe("USD");
    expect(fromMinorUnits(result.gross, "USD")).toBe(5000);
  });

  it("handles 3-decimal currencies (BHD)", () => {
    const result = calculateEmployeePayroll(
      ctx({
        employee: { ...baseEmployee, salary: 1234.567, pay_currency: "BHD" },
      })
    );
    expect(result.gross).toBe(toMinorUnits(1234.567, "BHD"));
    expect(fromMinorUnits(result.gross, "BHD")).toBeCloseTo(1234.567, 3);
  });

  it("zero salary edge case", () => {
    const result = calculateEmployeePayroll(
      ctx({ employee: { ...baseEmployee, salary: 0 } })
    );
    expect(result.gross).toBe(0n);
    expect(result.basic).toBe(0n);
    expect(result.netPay).toBe(0n);
  });

  it("allows negative net pay when deductions exceed gross (flagged downstream)", () => {
    const result = calculateEmployeePayroll(
      ctx({
        loans: [{ id: "l", monthly_deduction: toMinorUnits(20000, "SAR") }],
      })
    );
    // 18000 - 20000 = -2000
    expect(fromMinorUnits(result.netPay, "SAR")).toBe(-2000);
  });

  it("applies tax when enabled (annual 216k -> slab2 116k @10% = 11600/yr)", () => {
    const result = calculateEmployeePayroll(
      ctx({
        setup: { ...baseSetup, options: { enable_tax_calculation: true } },
        taxRules: [
          {
            id: "t1",
            slab_name: "0-100k",
            income_from: 0n,
            income_to: toMinorUnits(100000, "SAR"),
            percentage: 0,
            order_index: 0,
          },
          {
            id: "t2",
            slab_name: "100k+",
            income_from: toMinorUnits(100000, "SAR"),
            income_to: toMinorUnits(999999999, "SAR"),
            percentage: 10,
            order_index: 1,
          },
        ],
      })
    );
    expect(fromMinorUnits(result.taxDeduction, "SAR")).toBeCloseTo(11600 / 12, 2);
  });

  it("snapshot includes audit metadata", () => {
    const result = calculateEmployeePayroll(ctx());
    expect(result.snapshot).toMatchObject({
      employeeId: "emp-1",
      empCode: "CG-001",
      salary: 18000,
      currency: "SAR",
    });
    expect(result.snapshot.calculatedAt).toBeTruthy();
  });
});

describe("aggregateRunTotals", () => {
  it("sums gross, deductions, net across lines", () => {
    const lines = [
      calculateEmployeePayroll(ctx()),
      calculateEmployeePayroll(
        ctx({ employee: { ...baseEmployee, id: "emp-2", salary: 12000 } })
      ),
      calculateEmployeePayroll(
        ctx({ employee: { ...baseEmployee, id: "emp-3", salary: 8000 } })
      ),
    ];
    const totals = aggregateRunTotals(lines);
    expect(fromMinorUnits(totals.total_gross, "SAR")).toBe(38000);
    expect(totals.employee_count).toBe(3);
    expect(totals.total_net).toBe(totals.total_gross);
  });

  it("returns zeros for empty input", () => {
    const totals = aggregateRunTotals([]);
    expect(totals.total_gross).toBe(0n);
    expect(totals.employee_count).toBe(0);
  });
});
