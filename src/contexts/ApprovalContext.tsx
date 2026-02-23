import { createContext, useContext, useState, ReactNode } from "react";
import { employees } from "@/data/mockData";

export interface ApprovalRole {
  id: string;
  name: string;
  expenseApprovalLimit: number; // 0 = no expense approval
  canApproveHR: boolean;
  canApprovePayroll: boolean;
}

export interface UserApprovalAssignment {
  id: string;
  userId: string;
  userName: string;
  roleIds: string[];
}

const DEFAULT_ROLES: ApprovalRole[] = [
  { id: "r1", name: "Department Manager", expenseApprovalLimit: 5000, canApproveHR: false, canApprovePayroll: false },
  { id: "r2", name: "Finance Head", expenseApprovalLimit: 50000, canApproveHR: false, canApprovePayroll: false },
  { id: "r3", name: "HR Manager", expenseApprovalLimit: 0, canApproveHR: true, canApprovePayroll: false },
  { id: "r4", name: "Payroll Manager", expenseApprovalLimit: 0, canApproveHR: false, canApprovePayroll: true },
  { id: "r5", name: "Admin", expenseApprovalLimit: 999999999, canApproveHR: true, canApprovePayroll: true },
];

const DEFAULT_ASSIGNMENTS: UserApprovalAssignment[] = [
  { id: "a1", userId: "7", userName: "Layla Qasim", roleIds: ["r5"] },
  { id: "a2", userId: "2", userName: "Omar Al-Faisal", roleIds: ["r1"] },
  { id: "a3", userId: "4", userName: "Khalid Nasser", roleIds: ["r1", "r2"] },
];

function loadState<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

interface ApprovalContextType {
  roles: ApprovalRole[];
  assignments: UserApprovalAssignment[];
  addRole: (role: ApprovalRole) => void;
  updateRole: (role: ApprovalRole) => void;
  deleteRole: (id: string) => void;
  addAssignment: (assignment: UserApprovalAssignment) => void;
  updateAssignment: (assignment: UserApprovalAssignment) => void;
  deleteAssignment: (id: string) => void;
  canUserApproveExpense: (userId: string, amount: number) => { allowed: boolean; limit: number };
  canUserApproveHR: (userId: string) => boolean;
  canUserApprovePayroll: (userId: string) => boolean;
  getUserApprovalRoles: (userId: string) => ApprovalRole[];
}

const ApprovalContext = createContext<ApprovalContextType | undefined>(undefined);

export function ApprovalProvider({ children }: { children: ReactNode }) {
  const [roles, setRoles] = useState<ApprovalRole[]>(() => loadState("approval_roles", DEFAULT_ROLES));
  const [assignments, setAssignments] = useState<UserApprovalAssignment[]>(() => loadState("approval_assignments", DEFAULT_ASSIGNMENTS));

  const persist = (r: ApprovalRole[], a: UserApprovalAssignment[]) => {
    localStorage.setItem("approval_roles", JSON.stringify(r));
    localStorage.setItem("approval_assignments", JSON.stringify(a));
  };

  const addRole = (role: ApprovalRole) => {
    const next = [...roles, role];
    setRoles(next);
    persist(next, assignments);
  };
  const updateRole = (role: ApprovalRole) => {
    const next = roles.map(r => r.id === role.id ? role : r);
    setRoles(next);
    persist(next, assignments);
  };
  const deleteRole = (id: string) => {
    const next = roles.filter(r => r.id !== id);
    setRoles(next);
    persist(next, assignments);
  };
  const addAssignment = (a: UserApprovalAssignment) => {
    const next = [...assignments, a];
    setAssignments(next);
    persist(roles, next);
  };
  const updateAssignment = (a: UserApprovalAssignment) => {
    const next = assignments.map(x => x.id === a.id ? a : x);
    setAssignments(next);
    persist(roles, next);
  };
  const deleteAssignment = (id: string) => {
    const next = assignments.filter(x => x.id !== id);
    setAssignments(next);
    persist(roles, next);
  };

  const getUserApprovalRoles = (userId: string): ApprovalRole[] => {
    const userAssignment = assignments.find(a => a.userId === userId);
    if (!userAssignment) return [];
    return roles.filter(r => userAssignment.roleIds.includes(r.id));
  };

  const canUserApproveExpense = (userId: string, amount: number): { allowed: boolean; limit: number } => {
    const userRoles = getUserApprovalRoles(userId);
    if (userRoles.length === 0) return { allowed: false, limit: 0 };
    const maxLimit = Math.max(...userRoles.map(r => r.expenseApprovalLimit));
    if (maxLimit === 0) return { allowed: false, limit: 0 };
    return { allowed: amount <= maxLimit, limit: maxLimit };
  };

  const canUserApproveHR = (userId: string): boolean => {
    return getUserApprovalRoles(userId).some(r => r.canApproveHR);
  };

  const canUserApprovePayroll = (userId: string): boolean => {
    return getUserApprovalRoles(userId).some(r => r.canApprovePayroll);
  };

  return (
    <ApprovalContext.Provider value={{
      roles, assignments,
      addRole, updateRole, deleteRole,
      addAssignment, updateAssignment, deleteAssignment,
      canUserApproveExpense, canUserApproveHR, canUserApprovePayroll, getUserApprovalRoles,
    }}>
      {children}
    </ApprovalContext.Provider>
  );
}

export function useApprovals() {
  const ctx = useContext(ApprovalContext);
  if (!ctx) throw new Error("useApprovals must be used within ApprovalProvider");
  return ctx;
}
