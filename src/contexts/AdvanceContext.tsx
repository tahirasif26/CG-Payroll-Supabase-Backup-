import { createContext, useContext, useMemo, ReactNode, useState } from "react";
import {
  useAdvances as useAdvancesApi,
  useCreateAdvance,
  useDecideAdvance,
  useSettleAdvance,
  type Advance as ApiAdvance,
} from "@/api";

/**
 * Migrated to NestJS via @/api/advances. Mappings:
 *  - status: backend has more states (draft/submitted/approved/rejected/settled/cancelled);
 *    UI legacy shape only has pending/approved/rejected → fold draft+submitted into "pending".
 *  - amounts: backend returns BigInt strings of minor units; convert to number for display
 *    (safe for typical advance amounts).
 *  - reminders: per-advance reminder history isn't ported (Phase 8 reminders module handles
 *    notifications globally). Stub `reminderHistory: []` and no-op `sendReminder`.
 */

export interface ReminderEntry {
  sentAt: string;
  sentBy: string;
  type: "manual" | "auto";
}

export interface Advance {
  id: string;
  advanceName: string;
  employeeId: string;
  employeeName: string;
  purpose: string;
  amount: number;
  amountUsed: number;
  currency: string;
  status: "pending" | "approved" | "rejected";
  requestDate: string;
  expectedSpendDate: string;
  settlementDueDate: string;
  attachments: string[];
  notes: string;
  payrollRunId?: string;
  lastReminderSent?: string;
  reminderHistory: ReminderEntry[];
}

export type AutoReminderInterval = "off" | "7" | "15" | "30";

interface AdvanceContextType {
  advances: Advance[];
  addAdvance: (adv: Advance) => void;
  approveAdvance: (id: string, payrollRunId?: string) => void;
  rejectAdvance: (id: string) => void;
  useAdvanceAmount: (id: string, amount: number) => void;
  getEmployeeAdvances: (employeeId: string) => Advance[];
  sendReminder: (ids: string[]) => void;
  autoReminderInterval: AutoReminderInterval;
  setAutoReminderInterval: (interval: AutoReminderInterval) => void;
}

const AdvanceContext = createContext<AdvanceContextType | undefined>(undefined);

function adapt(a: ApiAdvance): Advance {
  const legacyStatus: Advance["status"] =
    a.status === "approved" || a.status === "settled"
      ? "approved"
      : a.status === "rejected" || a.status === "cancelled"
        ? "rejected"
        : "pending";
  return {
    id: a.id,
    advanceName: a.name,
    employeeId: a.employeeId,
    employeeName: a.employee
      ? `${a.employee.firstName} ${a.employee.lastName}`.trim()
      : "",
    purpose: a.purpose ?? "",
    amount: Number(a.amount) || 0,
    amountUsed: Number(a.amountUsed) || 0,
    currency: a.currency,
    status: legacyStatus,
    requestDate: a.createdAt,
    expectedSpendDate: a.expectedSpendDate ?? "",
    settlementDueDate: a.settlementDueDate ?? "",
    attachments: [],
    notes: a.notes ?? "",
    reminderHistory: [],
  };
}

export function AdvanceProvider({ children }: { children: ReactNode }) {
  const listQ = useAdvancesApi({ pageSize: 500 });
  const createMut = useCreateAdvance();
  const decideMut = useDecideAdvance();
  const settleMut = useSettleAdvance();
  const [autoReminderInterval, setAutoReminderInterval] = useState<AutoReminderInterval>("off");

  const advances = useMemo<Advance[]>(
    () => (listQ.data?.data ?? []).map(adapt),
    [listQ.data],
  );

  const value: AdvanceContextType = {
    advances,
    addAdvance: (adv) => {
      createMut.mutate({
        employeeId: adv.employeeId,
        name: adv.advanceName || `Advance ${new Date().toISOString().slice(0, 10)}`,
        purpose: adv.purpose || null,
        amount: adv.amount,
        currency: adv.currency,
        expectedSpendDate: adv.expectedSpendDate || null,
        settlementDueDate: adv.settlementDueDate || null,
        notes: adv.notes || null,
        status: "submitted",
      });
    },
    approveAdvance: (id) => {
      decideMut.mutate({ id, body: { decision: "approve" } });
    },
    rejectAdvance: (id) => {
      decideMut.mutate({ id, body: { decision: "reject", rejectionReason: "Rejected" } });
    },
    useAdvanceAmount: (id, amount) => {
      settleMut.mutate({ id, body: { amountUsed: amount } });
    },
    getEmployeeAdvances: (employeeId) => advances.filter((a) => a.employeeId === employeeId),
    sendReminder: () => {
      // eslint-disable-next-line no-console
      console.warn(
        "[AdvanceContext] sendReminder is not yet wired — use the Phase 8 Reminders module.",
      );
    },
    autoReminderInterval,
    setAutoReminderInterval,
  };

  return <AdvanceContext.Provider value={value}>{children}</AdvanceContext.Provider>;
}

export function useAdvances() {
  const ctx = useContext(AdvanceContext);
  if (!ctx) throw new Error("useAdvances must be used within AdvanceProvider");
  return ctx;
}
