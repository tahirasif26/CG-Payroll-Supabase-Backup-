import React, { createContext, useContext, useState, ReactNode, useCallback } from "react";

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
  year: string; // e.g. "2025-2026"
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
  // Balance tracking
  balances: EmployeeLeaveBalance[];
  getBalanceForEmployee: (employeeId: string, leaveTypeId: string, year: string) => EmployeeLeaveBalance | undefined;
  getBalancesForYear: (employeeId: string, year: string) => EmployeeLeaveBalance[];
  initializeBalances: (employeeIds: string[], year: string) => void;
  recordLeaveUsage: (employeeId: string, leaveTypeId: string, year: string, days: number) => void;
  // Carryforward
  runYearEndCarryforward: (fromYear: string, toYear: string, employeeIds: string[], customCarryforward?: { employeeId: string; leaveTypeId: string; carryforward: number }[]) => { employeeId: string; leaveTypeId: string; leaveTypeName: string; remaining: number; carryforward: number }[];
  completedRollovers: string[];
}

const LeaveTypeContext = createContext<LeaveTypeContextType | undefined>(undefined);

const defaultLeaveTypes: LeaveType[] = [
  { id: "lt-1", name: "Annual Leave", defaultDays: 21, isActive: true, isPaid: true, maxCarryForwardDays: 5 },
  { id: "lt-2", name: "Sick Leave", defaultDays: 10, isActive: true, isPaid: true, maxCarryForwardDays: 0 },
  { id: "lt-3", name: "Maternity Leave", defaultDays: 70, isActive: true, isPaid: true, maxCarryForwardDays: 0 },
  { id: "lt-4", name: "Paternity Leave", defaultDays: 3, isActive: true, isPaid: true, maxCarryForwardDays: 0 },
  { id: "lt-5", name: "Compassionate Leave", defaultDays: 5, isActive: true, isPaid: true, maxCarryForwardDays: 0 },
  { id: "lt-6", name: "Unpaid Leave", defaultDays: 30, isActive: true, isPaid: false, maxCarryForwardDays: 0 },
];

export function LeaveTypeProvider({ children }: { children: ReactNode }) {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>(defaultLeaveTypes);
  const [allocations, setAllocations] = useState<EmployeeLeaveAllocation[]>([]);
  const [balances, setBalances] = useState<EmployeeLeaveBalance[]>([]);
  const [completedRollovers, setCompletedRollovers] = useState<string[]>([]);

  const addLeaveType = (lt: Omit<LeaveType, "id">) => {
    setLeaveTypes(prev => [...prev, { ...lt, id: `lt-${Date.now()}` }]);
  };

  const updateLeaveType = (id: string, updates: Partial<LeaveType>) => {
    setLeaveTypes(prev => prev.map(lt => lt.id === id ? { ...lt, ...updates } : lt));
  };

  const deleteLeaveType = (id: string) => {
    setLeaveTypes(prev => prev.filter(lt => lt.id !== id));
    setAllocations(prev => prev.filter(a => a.leaveTypeId !== id));
    setBalances(prev => prev.filter(b => b.leaveTypeId !== id));
  };

  const setAllocation = (employeeId: string, leaveTypeId: string, days: number) => {
    setAllocations(prev => {
      const existing = prev.findIndex(a => a.employeeId === employeeId && a.leaveTypeId === leaveTypeId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], allocatedDays: days };
        return updated;
      }
      return [...prev, { employeeId, leaveTypeId, allocatedDays: days }];
    });
  };

  const getAllocationsForEmployee = (employeeId: string) => {
    return allocations.filter(a => a.employeeId === employeeId);
  };

  const getEntitledDays = useCallback((employeeId: string, leaveTypeId: string) => {
    const alloc = allocations.find(a => a.employeeId === employeeId && a.leaveTypeId === leaveTypeId);
    if (alloc) return alloc.allocatedDays;
    const lt = leaveTypes.find(l => l.id === leaveTypeId);
    return lt?.defaultDays ?? 0;
  }, [allocations, leaveTypes]);

  const initializeBalances = useCallback((employeeIds: string[], year: string) => {
    setBalances(prev => {
      const newBalances = [...prev];
      for (const empId of employeeIds) {
        for (const lt of leaveTypes.filter(l => l.isActive)) {
          const exists = newBalances.find(b => b.employeeId === empId && b.leaveTypeId === lt.id && b.year === year);
          if (!exists) {
            const entitled = getEntitledDays(empId, lt.id);
            newBalances.push({
              employeeId: empId,
              leaveTypeId: lt.id,
              year,
              entitled,
              used: 0,
              carriedForward: 0,
              remaining: entitled,
            });
          }
        }
      }
      return newBalances;
    });
  }, [leaveTypes, getEntitledDays]);

  const getBalanceForEmployee = (employeeId: string, leaveTypeId: string, year: string) => {
    return balances.find(b => b.employeeId === employeeId && b.leaveTypeId === leaveTypeId && b.year === year);
  };

  const getBalancesForYear = (employeeId: string, year: string) => {
    return balances.filter(b => b.employeeId === employeeId && b.year === year);
  };

  const recordLeaveUsage = (employeeId: string, leaveTypeId: string, year: string, days: number) => {
    setBalances(prev => prev.map(b => {
      if (b.employeeId === employeeId && b.leaveTypeId === leaveTypeId && b.year === year) {
        const used = b.used + days;
        return { ...b, used, remaining: b.entitled + b.carriedForward - used };
      }
      return b;
    }));
  };

  const runYearEndCarryforward = (fromYear: string, toYear: string, employeeIds: string[], customCarryforward?: { employeeId: string; leaveTypeId: string; carryforward: number }[]) => {
    const preview: { employeeId: string; leaveTypeId: string; leaveTypeName: string; remaining: number; carryforward: number }[] = [];

    for (const empId of employeeIds) {
      for (const lt of leaveTypes.filter(l => l.isActive)) {
        const balance = balances.find(b => b.employeeId === empId && b.leaveTypeId === lt.id && b.year === fromYear);
        const remaining = balance ? balance.remaining : getEntitledDays(empId, lt.id);
        let carryforward = 0;
        // Check for custom override first
        const custom = customCarryforward?.find(c => c.employeeId === empId && c.leaveTypeId === lt.id);
        if (custom !== undefined) {
          carryforward = custom.carryforward;
        } else if (remaining > 0 && lt.maxCarryForwardDays > 0) {
          carryforward = Math.min(remaining, lt.maxCarryForwardDays);
        }
        preview.push({ employeeId: empId, leaveTypeId: lt.id, leaveTypeName: lt.name, remaining, carryforward });
      }
    }

    // Actually create next year balances
    setBalances(prev => {
      const newBalances = [...prev];
      for (const item of preview) {
        const exists = newBalances.find(b => b.employeeId === item.employeeId && b.leaveTypeId === item.leaveTypeId && b.year === toYear);
        if (!exists) {
          const entitled = getEntitledDays(item.employeeId, item.leaveTypeId);
          newBalances.push({
            employeeId: item.employeeId,
            leaveTypeId: item.leaveTypeId,
            year: toYear,
            entitled,
            used: 0,
            carriedForward: item.carryforward,
            remaining: entitled + item.carryforward,
          });
        }
      }
      return newBalances;
    });

    setCompletedRollovers(prev => [...prev, fromYear]);
    return preview;
  };

  return (
    <LeaveTypeContext.Provider value={{
      leaveTypes, addLeaveType, updateLeaveType, deleteLeaveType,
      allocations, setAllocation, getAllocationsForEmployee,
      balances, getBalanceForEmployee, getBalancesForYear,
      initializeBalances, recordLeaveUsage,
      runYearEndCarryforward, completedRollovers,
    }}>
      {children}
    </LeaveTypeContext.Provider>
  );
}

export function useLeaveTypes() {
  const ctx = useContext(LeaveTypeContext);
  if (!ctx) throw new Error("useLeaveTypes must be used within LeaveTypeProvider");
  return ctx;
}
