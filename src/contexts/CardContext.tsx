import React, { createContext, useContext, useState, useCallback } from "react";

export interface CardHistoryEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  occasion: "birthday" | "anniversary";
  dateSent: string;
  designIndex: number;
  designName: string;
  status: "sent" | "scheduled";
}

interface CardSettings {
  globalEnabled: boolean;
  birthdayEnabled: boolean;
  anniversaryEnabled: boolean;
  senderName: string;
  birthdayMessage: string;
  anniversaryMessage: string;
  companyName: string;
}

interface CardContextType {
  settings: CardSettings;
  updateSettings: (s: Partial<CardSettings>) => void;
  enabledEmployees: Record<string, { birthday: boolean; anniversary: boolean }>;
  toggleEmployee: (id: string, type: "birthday" | "anniversary") => void;
  bulkToggle: (ids: string[], type: "birthday" | "anniversary", value: boolean) => void;
  history: CardHistoryEntry[];
  addHistory: (entry: Omit<CardHistoryEntry, "id">) => void;
}

const CardContext = createContext<CardContextType | null>(null);

export function CardProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<CardSettings>({
    globalEnabled: true,
    birthdayEnabled: true,
    anniversaryEnabled: true,
    senderName: "HR Team",
    birthdayMessage: "Wishing you a wonderful birthday filled with joy and success!",
    anniversaryMessage: "Thank you for your incredible dedication and contributions to our team!",
    companyName: "CG Group",
  });

  const [enabledEmployees, setEnabledEmployees] = useState<Record<string, { birthday: boolean; anniversary: boolean }>>({});

  const [history, setHistory] = useState<CardHistoryEntry[]>([
    { id: "h1", employeeId: "1", employeeName: "Aisha Rahman", occasion: "birthday", dateSent: "2025-07-12", designIndex: 0, designName: "Confetti Burst", status: "sent" },
    { id: "h2", employeeId: "4", employeeName: "Khalid Nasser", occasion: "anniversary", dateSent: "2025-09-20", designIndex: 6, designName: "Starlight", status: "sent" },
    { id: "h3", employeeId: "7", employeeName: "Layla Qasim", occasion: "anniversary", dateSent: "2025-04-01", designIndex: 7, designName: "Nature Garden", status: "sent" },
  ]);

  const updateSettings = useCallback((partial: Partial<CardSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  }, []);

  const toggleEmployee = useCallback((id: string, type: "birthday" | "anniversary") => {
    setEnabledEmployees(prev => {
      const current = prev[id] || { birthday: false, anniversary: false };
      return { ...prev, [id]: { ...current, [type]: !current[type] } };
    });
  }, []);

  const bulkToggle = useCallback((ids: string[], type: "birthday" | "anniversary", value: boolean) => {
    setEnabledEmployees(prev => {
      const next = { ...prev };
      ids.forEach(id => {
        const current = next[id] || { birthday: false, anniversary: false };
        next[id] = { ...current, [type]: value };
      });
      return next;
    });
  }, []);

  const addHistory = useCallback((entry: Omit<CardHistoryEntry, "id">) => {
    setHistory(prev => [{ ...entry, id: `h${Date.now()}` }, ...prev]);
  }, []);

  return (
    <CardContext.Provider value={{ settings, updateSettings, enabledEmployees, toggleEmployee, bulkToggle, history, addHistory }}>
      {children}
    </CardContext.Provider>
  );
}

export function useCards() {
  const ctx = useContext(CardContext);
  if (!ctx) throw new Error("useCards must be used within CardProvider");
  return ctx;
}
