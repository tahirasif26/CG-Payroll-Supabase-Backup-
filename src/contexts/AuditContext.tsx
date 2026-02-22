import { createContext, useContext, useState, ReactNode } from "react";

export interface AuditLogEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  section: string; // e.g. "Personal > Basic Information", "Work Info", "Compensation", "Documents"
  field: string;
  oldValue: string;
  newValue: string;
  changedAt: string; // ISO datetime
  changedBy: string; // For now, "System User"
}

interface AuditContextType {
  logs: AuditLogEntry[];
  addLog: (entry: Omit<AuditLogEntry, "id" | "changedAt" | "changedBy">) => void;
  addLogs: (entries: Omit<AuditLogEntry, "id" | "changedAt" | "changedBy">[]) => void;
  getLogsForEmployee: (employeeId: string) => AuditLogEntry[];
}

const AuditContext = createContext<AuditContextType | undefined>(undefined);

let counter = 0;

export function AuditProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);

  const now = () => new Date().toISOString();

  const addLog = (entry: Omit<AuditLogEntry, "id" | "changedAt" | "changedBy">) => {
    setLogs(prev => [
      { ...entry, id: String(++counter), changedAt: now(), changedBy: "System User" },
      ...prev,
    ]);
  };

  const addLogs = (entries: Omit<AuditLogEntry, "id" | "changedAt" | "changedBy">[]) => {
    const ts = now();
    const newEntries = entries.map(e => ({
      ...e,
      id: String(++counter),
      changedAt: ts,
      changedBy: "System User",
    }));
    setLogs(prev => [...newEntries, ...prev]);
  };

  const getLogsForEmployee = (employeeId: string) =>
    logs.filter(l => l.employeeId === employeeId);

  return (
    <AuditContext.Provider value={{ logs, addLog, addLogs, getLogsForEmployee }}>
      {children}
    </AuditContext.Provider>
  );
}

export function useAudit() {
  const ctx = useContext(AuditContext);
  if (!ctx) throw new Error("useAudit must be used within AuditProvider");
  return ctx;
}
