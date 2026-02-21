import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { employees } from "@/data/mockData";

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

// Initialize default mappings from extendedData conventions
const defaultMap: ReportMapping = {};
// Default: employees 1-6 report to emp 7 (Layla Qasim, Partner)
["1", "2", "3", "4", "5", "6", "8"].forEach(id => {
  if (id !== "7") defaultMap[id] = "7";
});

export function ReportingProvider({ children }: { children: ReactNode }) {
  const [reportMap, setReportMap] = useState<ReportMapping>(defaultMap);

  const setReportTo = useCallback((empId: string, managerId: string | null) => {
    setReportMap(prev => {
      const next = { ...prev };
      if (!managerId) {
        delete next[empId];
      } else {
        next[empId] = managerId;
      }
      return next;
    });
  }, []);

  const getManagerName = useCallback((empId: string): string | null => {
    const managerId = reportMap[empId];
    if (!managerId) return null;
    const mgr = employees.find(e => e.id === managerId);
    return mgr ? `${mgr.firstName} ${mgr.lastName}` : null;
  }, [reportMap]);

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
