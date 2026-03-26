import React, { createContext, useContext, useState } from "react";

interface ReminderSettingsState {
  reminderDays: number;
  setReminderDays: (v: number) => void;
  autoRemind: boolean;
  setAutoRemind: (v: boolean) => void;
  reminderFrequency: string;
  setReminderFrequency: (v: string) => void;
}

const ReminderSettingsContext = createContext<ReminderSettingsState | undefined>(undefined);

export function ReminderSettingsProvider({ children }: { children: React.ReactNode }) {
  const [reminderDays, setReminderDays] = useState(30);
  const [autoRemind, setAutoRemind] = useState(true);
  const [reminderFrequency, setReminderFrequency] = useState("7");

  return (
    <ReminderSettingsContext.Provider value={{ reminderDays, setReminderDays, autoRemind, setAutoRemind, reminderFrequency, setReminderFrequency }}>
      {children}
    </ReminderSettingsContext.Provider>
  );
}

export function useReminderSettings() {
  const ctx = useContext(ReminderSettingsContext);
  if (!ctx) throw new Error("useReminderSettings must be used within ReminderSettingsProvider");
  return ctx;
}
