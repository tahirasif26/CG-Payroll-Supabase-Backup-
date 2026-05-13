import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from "react";
import { useEmployees } from "@/contexts/EmployeeContext";

interface ReportMapping {
  [empId: string]: string; // empId -> reportsToEmpId
}

interface ReportingContextType {
  reportMap: ReportMapping;
  setReportTo: (empId: string, managerId: string | null) => void;
  getManagerName: (empId: string) => string | null;
  getManagerId: (empId: string) => string | null;
}

const ReportingContext = createContext<ReportingContextType | undefined>(undefined);

export function ReportingProvider({ children }: { children: ReactNode }) {
  const { employees } = useEmployees();
  // Local overrides applied on top of the DB-derived map (used by mock UI flows).
  const [overrides, setOverrides] = useState<ReportMapping>({});

  // Derive base mapping from real employee rows (reports_to from the DB).
  const reportMap = useMemo<ReportMapping>(() => {
    const m: ReportMapping = {};
    employees.forEach((e) => {
      if (e.reportsTo) m[e.id] = e.reportsTo;
    });
    return { ...m, ...overrides };
  }, [employees, overrides]);

  const setReportTo = useCallback((empId: string, managerId: string | null) => {
    setOverrides((prev) => {
      const next = { ...prev };
      if (!managerId) delete next[empId];
      else next[empId] = managerId;
      return next;
    });
  }, []);

  const getManagerName = useCallback((empId: string): string | null => {
    const managerId = reportMap[empId];
    if (!managerId) return null;
    const mgr = employees.find((e) => e.id === managerId);
    return mgr ? `${mgr.firstName} ${mgr.lastName}` : null;
  }, [reportMap, employees]);

  const getManagerId = useCallback((empId: string): string | null => {
    return reportMap[empId] || null;
  }, [reportMap]);

  return (
    <ReportingContext.Provider value={{ reportMap, setReportTo, getManagerName, getManagerId }}>
      {children}
    </ReportingContext.Provider>
  );
}

export function useReporting() {
  const ctx = useContext(ReportingContext);
  if (!ctx) throw new Error("useReporting must be used within ReportingProvider");
  return ctx;
}
