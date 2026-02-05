import { createContext, useContext, useState, ReactNode } from "react";

type Role = "employer" | "employee";

interface RoleContextType {
  role: Role;
  setRole: (role: Role) => void;
  currentEmployeeId: string; // simulated logged-in employee
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("employer");
  const currentEmployeeId = "1"; // Aisha Rahman as the logged-in employee

  return (
    <RoleContext.Provider value={{ role, setRole, currentEmployeeId }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
