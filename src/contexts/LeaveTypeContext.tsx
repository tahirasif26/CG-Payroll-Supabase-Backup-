import { createContext, useContext, ReactNode, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useLeaveTypes as useLeaveTypesApi,
  useCreateLeaveType,
  useUpdateLeaveType,
  useDeleteLeaveType,
  useLeaveBalances,
  useUpsertLeaveBalance,
  leaveKeys,
  type LeaveType as ApiLeaveType,
  type LeaveBalance as ApiLeaveBalance,
} from "@/api";
import { PayrollSetup } from "@/types/payrollSetup";

/**
 * Migrated to NestJS via @/api/leave. Core leave types + balances flow
 * through the new backend; legacy helpers (initializeBalances,
 * runYearEndCarryforward, allocations) operate on the React Query cache
 * client-side until equivalent server endpoints land.
 */

export interface LeaveType {
  id: string;
  name: string;
  defaultDays: number;
  isActive: boolean;
  isPaid: boolean;
  maxCarryForwardDays: number;
}

export interface EmployeeLeaveAllocation {
  employeeId: string;
  leaveTypeId: string;
  allocatedDays: number;
}

export interface EmployeeLeaveBalance {
  employeeId: string;
  leaveTypeId: string;
  year: string;
  entitled: number;
  used: number;
  carriedForward: number;
  remaining: number;
}

interface LeaveTypeContextType {
  leaveTypes: LeaveType[];
  addLeaveType: (lt: Omit<LeaveType, "id">) => void;
  updateLeaveType: (id: string, updates: Partial<LeaveType>) => void;
  deleteLeaveType: (id: string) => void;
  allocations: EmployeeLeaveAllocation[];
  setAllocation: (employeeId: string, leaveTypeId: string, days: number) => void;
  getAllocationsForEmployee: (employeeId: string) => EmployeeLeaveAllocation[];
  balances: EmployeeLeaveBalance[];
  getBalanceForEmployee: (
    employeeId: string,
    leaveTypeId: string,
    year: string,
  ) => EmployeeLeaveBalance | undefined;
  getBalancesForYear: (employeeId: string, year: string) => EmployeeLeaveBalance[];
  initializeBalances: (
    employeeIds: string[],
    year: string,
    getSetupForEmployee?: (empId: string) => PayrollSetup | undefined,
  ) => void;
  recordLeaveUsage: (
    employeeId: string,
    leaveTypeId: string,
    year: string,
    days: number,
  ) => void;
  runYearEndCarryforward: (
    fromYear: string,
    toYear: string,
    employeeIds: string[],
    customCarryforward?: { employeeId: string; leaveTypeId: string; carryforward: number }[],
  ) => {
    employeeId: string;
    leaveTypeId: string;
    leaveTypeName: string;
    remaining: number;
    carryforward: number;
  }[];
  completedRollovers: string[];
  isLoading: boolean;
}

const LeaveTypeContext = createContext<LeaveTypeContextType | undefined>(undefined);

function yearToInt(year: string): number {
  const first = year.split("-")[0];
  const n = parseInt(first, 10);
  return Number.isNaN(n) ? new Date().getFullYear() : n;
}

function adaptType(t: ApiLeaveType): LeaveType {
  return {
    id: t.id,
    name: t.name,
    defaultDays: Number(t.daysPerYear) || 0,
    isActive: t.isActive,
    isPaid: t.isPaid,
    maxCarryForwardDays: Number(t.maxCarryforward) || 0,
  };
}

function adaptBalance(b: ApiLeaveBalance, fallbackYear: number): EmployeeLeaveBalance {
  const allocated = Number(b.allocated) || 0;
  const used = Number(b.used) || 0;
  const carriedForward = Number(b.carriedForward) || 0;
  return {
    employeeId: b.employeeId,
    leaveTypeId: b.leaveTypeId,
    year: String(b.year ?? fallbackYear),
    entitled: allocated,
    used,
    carriedForward,
    remaining: allocated + carriedForward - used,
  };
}

export function LeaveTypeProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const typesQ = useLeaveTypesApi();
  const balancesQ = useLeaveBalances();
  const createMut = useCreateLeaveType();
  const updateMut = useUpdateLeaveType();
  const deleteMut = useDeleteLeaveType();
  const upsertBalanceMut = useUpsertLeaveBalance();

  const leaveTypes = useMemo<LeaveType[]>(
    () => (typesQ.data ?? []).map(adaptType),
    [typesQ.data],
  );
  const balances = useMemo<EmployeeLeaveBalance[]>(() => {
    const currentYear = new Date().getFullYear();
    return (balancesQ.data ?? []).map((b) => adaptBalance(b, currentYear));
  }, [balancesQ.data]);

  const value: LeaveTypeContextType = {
    leaveTypes,
    addLeaveType: (lt) => {
      createMut.mutate({
        name: lt.name,
        code: lt.name.toUpperCase().replace(/\s+/g, "_").slice(0, 40),
        daysPerYear: lt.defaultDays,
        maxCarryforward: lt.maxCarryForwardDays,
        isPaid: lt.isPaid,
        isActive: lt.isActive,
      });
    },
    updateLeaveType: (id, updates) => {
      updateMut.mutate({
        id,
        body: {
          ...(updates.name !== undefined ? { name: updates.name } : {}),
          ...(updates.defaultDays !== undefined ? { daysPerYear: updates.defaultDays } : {}),
          ...(updates.maxCarryForwardDays !== undefined
            ? { maxCarryforward: updates.maxCarryForwardDays }
            : {}),
          ...(updates.isPaid !== undefined ? { isPaid: updates.isPaid } : {}),
          ...(updates.isActive !== undefined ? { isActive: updates.isActive } : {}),
        },
      });
    },
    deleteLeaveType: (id) => deleteMut.mutate(id),

    // Allocations are folded into balances on the new backend — keep an
    // empty array for shape compat and route setAllocation to balance.allocated.
    allocations: [],
    setAllocation: (employeeId, leaveTypeId, days) => {
      upsertBalanceMut.mutate({
        employeeId,
        leaveTypeId,
        year: new Date().getFullYear(),
        allocated: days,
      });
    },
    getAllocationsForEmployee: () => [],

    balances,
    getBalanceForEmployee: (employeeId, leaveTypeId, year) =>
      balances.find(
        (b) =>
          b.employeeId === employeeId &&
          b.leaveTypeId === leaveTypeId &&
          b.year === year,
      ),
    getBalancesForYear: (employeeId, year) =>
      balances.filter((b) => b.employeeId === employeeId && b.year === year),

    initializeBalances: (employeeIds, year) => {
      const yearInt = yearToInt(year);
      for (const empId of employeeIds) {
        for (const t of leaveTypes) {
          upsertBalanceMut.mutate({
            employeeId: empId,
            leaveTypeId: t.id,
            year: yearInt,
            allocated: t.defaultDays,
          });
        }
      }
    },
    recordLeaveUsage: (employeeId, leaveTypeId, year, days) => {
      const yearInt = yearToInt(year);
      upsertBalanceMut.mutate({
        employeeId,
        leaveTypeId,
        year: yearInt,
        used: days,
      });
    },
    runYearEndCarryforward: (fromYear, toYear, employeeIds, customCarryforward) => {
      const toInt = yearToInt(toYear);
      const map = new Map(
        (customCarryforward ?? []).map((c) => [`${c.employeeId}:${c.leaveTypeId}`, c.carryforward]),
      );
      const result: ReturnType<LeaveTypeContextType["runYearEndCarryforward"]> = [];
      for (const empId of employeeIds) {
        const yearBalances = balances.filter(
          (b) => b.employeeId === empId && b.year === fromYear,
        );
        for (const b of yearBalances) {
          const t = leaveTypes.find((lt) => lt.id === b.leaveTypeId);
          if (!t) continue;
          const remaining = b.remaining;
          const cap = t.maxCarryForwardDays;
          const customKey = `${empId}:${b.leaveTypeId}`;
          const carryforward = map.has(customKey)
            ? (map.get(customKey) ?? 0)
            : Math.min(remaining, cap);
          upsertBalanceMut.mutate({
            employeeId: empId,
            leaveTypeId: b.leaveTypeId,
            year: toInt,
            allocated: t.defaultDays,
            carriedForward: carryforward,
          });
          result.push({
            employeeId: empId,
            leaveTypeId: b.leaveTypeId,
            leaveTypeName: t.name,
            remaining,
            carryforward,
          });
        }
      }
      qc.invalidateQueries({ queryKey: leaveKeys.all });
      return result;
    },
    completedRollovers: [],
    isLoading: typesQ.isLoading || balancesQ.isLoading,
  };

  return <LeaveTypeContext.Provider value={value}>{children}</LeaveTypeContext.Provider>;
}

export function useLeaveTypes() {
  const ctx = useContext(LeaveTypeContext);
  if (!ctx) throw new Error("useLeaveTypes must be used within LeaveTypeProvider");
  return ctx;
}
