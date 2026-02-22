import React, { createContext, useContext, useState, ReactNode } from "react";

export interface LeaveType {
  id: string;
  name: string;
  defaultDays: number;
  isActive: boolean;
  isPaid: boolean;
}

export interface EmployeeLeaveAllocation {
  employeeId: string;
  leaveTypeId: string;
  allocatedDays: number;
}

interface LeaveTypeContextType {
  leaveTypes: LeaveType[];
  addLeaveType: (lt: Omit<LeaveType, "id">) => void;
  updateLeaveType: (id: string, updates: Partial<LeaveType>) => void;
  deleteLeaveType: (id: string) => void;
  allocations: EmployeeLeaveAllocation[];
  setAllocation: (employeeId: string, leaveTypeId: string, days: number) => void;
  getAllocationsForEmployee: (employeeId: string) => EmployeeLeaveAllocation[];
}

const LeaveTypeContext = createContext<LeaveTypeContextType | undefined>(undefined);

const defaultLeaveTypes: LeaveType[] = [
  { id: "lt-1", name: "Annual Leave", defaultDays: 21, isActive: true, isPaid: true },
  { id: "lt-2", name: "Sick Leave", defaultDays: 10, isActive: true, isPaid: true },
  { id: "lt-3", name: "Maternity Leave", defaultDays: 70, isActive: true, isPaid: true },
  { id: "lt-4", name: "Paternity Leave", defaultDays: 3, isActive: true, isPaid: true },
  { id: "lt-5", name: "Compassionate Leave", defaultDays: 5, isActive: true, isPaid: true },
  { id: "lt-6", name: "Unpaid Leave", defaultDays: 30, isActive: true, isPaid: false },
];

export function LeaveTypeProvider({ children }: { children: ReactNode }) {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>(defaultLeaveTypes);
  const [allocations, setAllocations] = useState<EmployeeLeaveAllocation[]>([]);

  const addLeaveType = (lt: Omit<LeaveType, "id">) => {
    setLeaveTypes(prev => [...prev, { ...lt, id: `lt-${Date.now()}` }]);
  };

  const updateLeaveType = (id: string, updates: Partial<LeaveType>) => {
    setLeaveTypes(prev => prev.map(lt => lt.id === id ? { ...lt, ...updates } : lt));
  };

  const deleteLeaveType = (id: string) => {
    setLeaveTypes(prev => prev.filter(lt => lt.id !== id));
    setAllocations(prev => prev.filter(a => a.leaveTypeId !== id));
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

  return (
    <LeaveTypeContext.Provider value={{ leaveTypes, addLeaveType, updateLeaveType, deleteLeaveType, allocations, setAllocation, getAllocationsForEmployee }}>
      {children}
    </LeaveTypeContext.Provider>
  );
}

export function useLeaveTypes() {
  const ctx = useContext(LeaveTypeContext);
  if (!ctx) throw new Error("useLeaveTypes must be used within LeaveTypeProvider");
  return ctx;
}
