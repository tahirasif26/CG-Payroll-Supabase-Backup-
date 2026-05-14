import type { LeaveType, EmployeeLeaveBalance } from "@/contexts/LeaveTypeContext";

/**
 * Default policy: encash positive remaining balance of paid "annual" / "vacation"
 * leave types, valued at daily basic salary (basic / 30).
 *
 * - Only `isPaid` leave types whose name matches /annual|vacation/i are encashable.
 * - Negative remaining balances are ignored (treated as 0).
 * - Uses the most recent year balance available for each leave type.
 */
export function calculateLeaveEncashment(params: {
  employeeId: string;
  basicSalary: number;
  leaveTypes: LeaveType[];
  balances: EmployeeLeaveBalance[];
  daysInMonth?: number;
}): { days: number; amount: number; perType: { leaveTypeId: string; name: string; days: number; amount: number }[] } {
  const { employeeId, basicSalary, leaveTypes, balances, daysInMonth = 30 } = params;
  const dailyBasic = (basicSalary || 0) / daysInMonth;

  const encashable = leaveTypes.filter(
    (lt) => lt.isActive && lt.isPaid && /annual|vacation/i.test(lt.name)
  );

  const perType: { leaveTypeId: string; name: string; days: number; amount: number }[] = [];
  let totalDays = 0;
  let totalAmount = 0;

  for (const lt of encashable) {
    const empBalances = balances.filter((b) => b.employeeId === employeeId && b.leaveTypeId === lt.id);
    if (!empBalances.length) continue;
    // Pick the most recent year (lex sort works for "2025" / "2025-2026")
    const latest = [...empBalances].sort((a, b) => (a.year > b.year ? -1 : 1))[0];
    const remaining = Math.max(0, latest.remaining || 0);
    if (remaining <= 0) continue;
    const amount = Math.round(remaining * dailyBasic);
    perType.push({ leaveTypeId: lt.id, name: lt.name, days: remaining, amount });
    totalDays += remaining;
    totalAmount += amount;
  }

  return { days: totalDays, amount: totalAmount, perType };
}
