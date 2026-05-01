import React, { createContext, useContext, ReactNode, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useModuleEnabled } from "@/hooks/useModuleEnabled";
import { PayrollSetup } from "@/types/payrollSetup";

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
  year: string; // kept as string for backward compat (e.g. "2025-2026" or "2025")
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
  getBalanceForEmployee: (employeeId: string, leaveTypeId: string, year: string) => EmployeeLeaveBalance | undefined;
  getBalancesForYear: (employeeId: string, year: string) => EmployeeLeaveBalance[];
  initializeBalances: (employeeIds: string[], year: string, getSetupForEmployee?: (empId: string) => PayrollSetup | undefined) => void;
  recordLeaveUsage: (employeeId: string, leaveTypeId: string, year: string, days: number) => void;
  runYearEndCarryforward: (
    fromYear: string,
    toYear: string,
    employeeIds: string[],
    customCarryforward?: { employeeId: string; leaveTypeId: string; carryforward: number }[]
  ) => { employeeId: string; leaveTypeId: string; leaveTypeName: string; remaining: number; carryforward: number }[];
  completedRollovers: string[];
  isLoading: boolean;
}

const LeaveTypeContext = createContext<LeaveTypeContextType | undefined>(undefined);

// Convert "2025-2026" or "2025" → 2025 (use start year as DB integer)
function yearToInt(year: string): number {
  const first = year.split("-")[0];
  const n = parseInt(first, 10);
  return isNaN(n) ? new Date().getFullYear() : n;
}

export function LeaveTypeProvider({ children }: { children: ReactNode }) {
  const { clientId } = useAuth();
  const employeesEnabled = useModuleEnabled("employees");
  const qEnabled = !!clientId && employeesEnabled;
  const STALE = 5 * 60 * 1000;
  const qc = useQueryClient();

  // ---------------- Leave Types ----------------
  const { data: rawTypes = [], isLoading: typesLoading } = useQuery({
    queryKey: ["leave_types", clientId],
    enabled: qEnabled,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_types")
        .select("*")
        .eq("client_id", clientId!)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const leaveTypes: LeaveType[] = useMemo(
    () =>
      rawTypes.map((r: any) => ({
        id: r.id,
        name: r.name,
        defaultDays: Number(r.days_per_year ?? 0),
        isActive: !!r.is_active,
        isPaid: !!r.is_paid,
        maxCarryForwardDays: Number(r.max_carryforward ?? 0),
      })),
    [rawTypes]
  );

  const addTypeMut = useMutation({
    mutationFn: async (lt: Omit<LeaveType, "id">) => {
      if (!clientId) throw new Error("No client");
      const { error } = await supabase.from("leave_types").insert({
        client_id: clientId,
        name: lt.name,
        days_per_year: lt.defaultDays,
        is_active: lt.isActive,
        is_paid: lt.isPaid,
        max_carryforward: lt.maxCarryForwardDays,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leave_types"] }),
  });

  const updateTypeMut = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<LeaveType> }) => {
      const patch: any = {};
      if (updates.name !== undefined) patch.name = updates.name;
      if (updates.defaultDays !== undefined) patch.days_per_year = updates.defaultDays;
      if (updates.isActive !== undefined) patch.is_active = updates.isActive;
      if (updates.isPaid !== undefined) patch.is_paid = updates.isPaid;
      if (updates.maxCarryForwardDays !== undefined) patch.max_carryforward = updates.maxCarryForwardDays;
      const { error } = await supabase.from("leave_types").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leave_types"] }),
  });

  const deleteTypeMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leave_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave_types"] });
      qc.invalidateQueries({ queryKey: ["leave_allocations"] });
      qc.invalidateQueries({ queryKey: ["leave_balances"] });
    },
  });

  // ---------------- Allocations ----------------
  const { data: rawAllocations = [] } = useQuery({
    queryKey: ["leave_allocations", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("leave_allocations")
        .select("*")
        .eq("client_id", clientId!);
      if (error) throw error;
      return data || [];
    },
  });

  const allocations: EmployeeLeaveAllocation[] = useMemo(
    () =>
      (rawAllocations as any[]).map((a) => ({
        employeeId: a.employee_id,
        leaveTypeId: a.leave_type_id,
        allocatedDays: Number(a.allocated_days ?? 0),
      })),
    [rawAllocations]
  );

  const setAllocationMut = useMutation({
    mutationFn: async ({ employeeId, leaveTypeId, days }: { employeeId: string; leaveTypeId: string; days: number }) => {
      if (!clientId) throw new Error("No client");
      const { error } = await (supabase as any).from("leave_allocations").upsert(
        {
          client_id: clientId,
          employee_id: employeeId,
          leave_type_id: leaveTypeId,
          allocated_days: days,
        },
        { onConflict: "employee_id,leave_type_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leave_allocations"] }),
  });

  // ---------------- Balances ----------------
  const { data: rawBalances = [] } = useQuery({
    queryKey: ["leave_balances", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_balances")
        .select("*")
        .eq("client_id", clientId!);
      if (error) throw error;
      return data || [];
    },
  });

  const balances: EmployeeLeaveBalance[] = useMemo(
    () =>
      (rawBalances as any[]).map((b) => {
        const entitled = Number(b.allocated ?? 0);
        const used = Number(b.used ?? 0);
        const carriedForward = Number(b.carried_forward ?? 0);
        return {
          employeeId: b.employee_id,
          leaveTypeId: b.leave_type_id,
          year: String(b.year),
          entitled,
          used,
          carriedForward,
          remaining: entitled + carriedForward - used,
        };
      }),
    [rawBalances]
  );

  const getEntitledDays = useCallback(
    (employeeId: string, leaveTypeId: string, setup?: PayrollSetup) => {
      // 1. Setup-level allocation
      if (setup?.leaveEncashment?.leaveAllocations?.length) {
        const setupAlloc = setup.leaveEncashment.leaveAllocations.find(
          (a) => a.leaveTypeId === leaveTypeId && a.isActive
        );
        if (setupAlloc) return setupAlloc.daysEntitled;
        return 0;
      }
      // 2. Employee override
      const alloc = allocations.find((a) => a.employeeId === employeeId && a.leaveTypeId === leaveTypeId);
      if (alloc) return alloc.allocatedDays;
      // 3. Global default
      const lt = leaveTypes.find((l) => l.id === leaveTypeId);
      return lt?.defaultDays ?? 0;
    },
    [allocations, leaveTypes]
  );

  const initializeBalancesMut = useMutation({
    mutationFn: async ({
      employeeIds,
      year,
      getSetupForEmployee,
    }: {
      employeeIds: string[];
      year: string;
      getSetupForEmployee?: (id: string) => PayrollSetup | undefined;
    }) => {
      if (!clientId) return;
      const yearInt = yearToInt(year);
      const rows: any[] = [];
      for (const empId of employeeIds) {
        const setup = getSetupForEmployee?.(empId);
        const applicable = setup?.leaveEncashment?.leaveAllocations?.length
          ? leaveTypes.filter(
              (lt) =>
                lt.isActive &&
                setup.leaveEncashment.leaveAllocations.some((a) => a.leaveTypeId === lt.id && a.isActive)
            )
          : leaveTypes.filter((l) => l.isActive);
        for (const lt of applicable) {
          const exists = balances.find(
            (b) => b.employeeId === empId && b.leaveTypeId === lt.id && b.year === String(yearInt)
          );
          if (!exists) {
            rows.push({
              client_id: clientId,
              employee_id: empId,
              leave_type_id: lt.id,
              year: yearInt,
              allocated: getEntitledDays(empId, lt.id, setup),
              used: 0,
              carried_forward: 0,
            });
          }
        }
      }
      if (rows.length) {
        const { error } = await supabase.from("leave_balances").upsert(rows, {
          onConflict: "employee_id,leave_type_id,year",
          ignoreDuplicates: true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leave_balances"] }),
  });

  const initializeBalances = useCallback(
    (employeeIds: string[], year: string, getSetupForEmployee?: (id: string) => PayrollSetup | undefined) => {
      initializeBalancesMut.mutate({ employeeIds, year, getSetupForEmployee });
    },
    [initializeBalancesMut]
  );

  const recordUsageMut = useMutation({
    mutationFn: async ({
      employeeId,
      leaveTypeId,
      year,
      days,
    }: {
      employeeId: string;
      leaveTypeId: string;
      year: string;
      days: number;
    }) => {
      const yearInt = yearToInt(year);
      const existing = (rawBalances as any[]).find(
        (b) => b.employee_id === employeeId && b.leave_type_id === leaveTypeId && b.year === yearInt
      );
      if (!existing) return;
      const { error } = await supabase
        .from("leave_balances")
        .update({ used: Number(existing.used ?? 0) + days })
        .eq("id", existing.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leave_balances"] }),
  });

  const carryforwardMut = useMutation({
    mutationFn: async ({
      preview,
      toYear,
    }: {
      preview: { employeeId: string; leaveTypeId: string; carryforward: number }[];
      toYear: string;
    }) => {
      if (!clientId) return;
      const yearInt = yearToInt(toYear);
      const rows = preview.map((p) => ({
        client_id: clientId,
        employee_id: p.employeeId,
        leave_type_id: p.leaveTypeId,
        year: yearInt,
        allocated: getEntitledDays(p.employeeId, p.leaveTypeId),
        used: 0,
        carried_forward: p.carryforward,
      }));
      if (rows.length) {
        const { error } = await supabase.from("leave_balances").upsert(rows, {
          onConflict: "employee_id,leave_type_id,year",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leave_balances"] }),
  });

  return (
    <LeaveTypeContext.Provider
      value={{
        leaveTypes,
        addLeaveType: (lt) => addTypeMut.mutate(lt),
        updateLeaveType: (id, updates) => updateTypeMut.mutate({ id, updates }),
        deleteLeaveType: (id) => deleteTypeMut.mutate(id),
        allocations,
        setAllocation: (employeeId, leaveTypeId, days) =>
          setAllocationMut.mutate({ employeeId, leaveTypeId, days }),
        getAllocationsForEmployee: (employeeId) =>
          allocations.filter((a) => a.employeeId === employeeId),
        balances,
        getBalanceForEmployee: (employeeId, leaveTypeId, year) =>
          balances.find(
            (b) =>
              b.employeeId === employeeId &&
              b.leaveTypeId === leaveTypeId &&
              b.year === String(yearToInt(year))
          ),
        getBalancesForYear: (employeeId, year) =>
          balances.filter((b) => b.employeeId === employeeId && b.year === String(yearToInt(year))),
        initializeBalances,
        recordLeaveUsage: (employeeId, leaveTypeId, year, days) =>
          recordUsageMut.mutate({ employeeId, leaveTypeId, year, days }),
        runYearEndCarryforward: (fromYear, toYear, employeeIds, customCarryforward) => {
          const fromYearStr = String(yearToInt(fromYear));
          const preview: {
            employeeId: string;
            leaveTypeId: string;
            leaveTypeName: string;
            remaining: number;
            carryforward: number;
          }[] = [];
          for (const empId of employeeIds) {
            for (const lt of leaveTypes.filter((l) => l.isActive)) {
              const balance = balances.find(
                (b) => b.employeeId === empId && b.leaveTypeId === lt.id && b.year === fromYearStr
              );
              const remaining = balance ? balance.remaining : getEntitledDays(empId, lt.id);
              let carryforward = 0;
              const custom = customCarryforward?.find(
                (c) => c.employeeId === empId && c.leaveTypeId === lt.id
              );
              if (custom !== undefined) {
                carryforward = custom.carryforward;
              } else if (remaining > 0 && lt.maxCarryForwardDays > 0) {
                carryforward = Math.min(remaining, lt.maxCarryForwardDays);
              }
              preview.push({
                employeeId: empId,
                leaveTypeId: lt.id,
                leaveTypeName: lt.name,
                remaining,
                carryforward,
              });
            }
          }
          carryforwardMut.mutate({
            preview: preview.map((p) => ({
              employeeId: p.employeeId,
              leaveTypeId: p.leaveTypeId,
              carryforward: p.carryforward,
            })),
            toYear,
          });
          return preview;
        },
        completedRollovers: [],
        isLoading: typesLoading,
      }}
    >
      {children}
    </LeaveTypeContext.Provider>
  );
}

export function useLeaveTypes() {
  const ctx = useContext(LeaveTypeContext);
  if (!ctx) throw new Error("useLeaveTypes must be used within LeaveTypeProvider");
  return ctx;
}
