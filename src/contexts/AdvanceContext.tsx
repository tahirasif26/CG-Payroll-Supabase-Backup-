// Advance management context — Supabase-backed.
// Preserves the legacy in-memory API (advances/addAdvance/approveAdvance/...) so
// existing consumers (AdvancesPage, OutstandingAdvancesPage, PayrollPage, PayslipsPage,
// ExpensesPage) keep working unchanged.
import React, { createContext, useContext, useCallback, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { useEmployees } from "@/contexts/EmployeeContext";
import { useModuleEnabled } from "@/hooks/useModuleEnabled";
import { notifyClientAdmins, notifyUser, getEmployeeUserId } from "@/lib/notify";
import { routeApprovalRequest } from "@/lib/approvalRouting";

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

type DbAdvance = {
  id: string;
  client_id: string;
  employee_id: string;
  advance_name: string | null;
  purpose: string | null;
  amount: number;
  amount_used: number;
  currency: string;
  status: string;
  request_date: string;
  expected_spend_date: string | null;
  settlement_due_date: string | null;
  attachments: unknown;
  notes: string | null;
  payroll_run_id: string | null;
  last_reminder_sent: string | null;
  reminder_history: unknown;
};

function mapRow(row: DbAdvance, employeeName: string): Advance {
  const attachments = Array.isArray(row.attachments) ? (row.attachments as string[]) : [];
  const reminderHistory = Array.isArray(row.reminder_history) ? (row.reminder_history as ReminderEntry[]) : [];
  return {
    id: row.id,
    advanceName: row.advance_name ?? "",
    employeeId: row.employee_id,
    employeeName,
    purpose: row.purpose ?? "",
    amount: Number(row.amount ?? 0),
    amountUsed: Number(row.amount_used ?? 0),
    currency: row.currency ?? "SAR",
    status: (row.status as Advance["status"]) ?? "pending",
    requestDate: row.request_date,
    expectedSpendDate: row.expected_spend_date ?? "",
    settlementDueDate: row.settlement_due_date ?? "",
    attachments,
    notes: row.notes ?? "",
    payrollRunId: row.payroll_run_id ?? undefined,
    lastReminderSent: row.last_reminder_sent ?? undefined,
    reminderHistory,
  };
}

export function AdvanceProvider({ children }: { children: React.ReactNode }) {
  const { clientId, isSuperAdmin } = useRole();
  const { employees } = useEmployees();
  const expensesEnabled = useModuleEnabled("expenses");
  const qc = useQueryClient();
  const [autoReminderInterval, setAutoReminderInterval] = useState<AutoReminderInterval>("off");

  const { data: rows = [] } = useQuery({
    queryKey: ["advances_ctx", clientId ?? "super"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("advances")
        .select("*")
        .order("request_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DbAdvance[];
    },
    enabled: (!!clientId || isSuperAdmin) && expensesEnabled,
    staleTime: 5 * 60 * 1000,
  });

  const advances = useMemo<Advance[]>(() => {
    return rows.map((r) => {
      const emp = employees.find((e) => e.id === r.employee_id);
      const name = emp ? `${emp.firstName} ${emp.lastName}` : "Unknown Employee";
      return mapRow(r, name);
    });
  }, [rows, employees]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["advances_ctx"] });

  const insertMut = useMutation({
    mutationFn: async (adv: Advance) => {
      if (!clientId) throw new Error("No client context");
      const payload = {
        client_id: clientId,
        employee_id: adv.employeeId,
        advance_name: adv.advanceName,
        purpose: adv.purpose,
        amount: Math.round(adv.amount),
        amount_used: Math.round(adv.amountUsed ?? 0),
        currency: adv.currency,
        status: adv.status,
        request_date: adv.requestDate,
        expected_spend_date: adv.expectedSpendDate || null,
        settlement_due_date: adv.settlementDueDate || null,
        attachments: adv.attachments ?? [],
        notes: adv.notes ?? "",
        reminder_history: adv.reminderHistory ?? [],
      };
      const { data, error } = await (supabase as any).from("advances").insert(payload).select().single();
      if (error) throw error;
      return { row: data, adv };
    },
    onSuccess: async ({ row, adv }) => {
      invalidate();
      await routeApprovalRequest({
        clientId,
        category: "advances",
        value: Number(adv.amount ?? 0),
        notification: {
          title: "New advance request",
          body: `${adv.employeeName} requested ${adv.currency} ${adv.amount.toLocaleString()}${adv.purpose ? ` — ${adv.purpose}` : ""}`,
          category: "advance",
          severity: "info",
          entityType: "advance",
          entityId: row?.id,
          actionUrl: "/advances",
        },
      });
    },
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await (supabase as any).from("advances").update(patch).eq("id", id);
      if (error) throw error;
      return { id, patch };
    },
    onSuccess: async ({ id, patch }) => {
      invalidate();
      const status = patch?.status as string | undefined;
      if (status === "approved" || status === "rejected") {
        const current = rows.find((r) => r.id === id);
        if (current) {
          const recipient = await getEmployeeUserId(current.employee_id);
          if (recipient) {
            await notifyUser(recipient, {
              title: status === "approved" ? "Advance approved" : "Advance rejected",
              body: status === "approved"
                ? `Your advance of ${current.currency} ${(Number(current.amount) / 1).toLocaleString()} has been approved.`
                : `Your advance request was rejected.`,
              category: "advance",
              severity: status === "approved" ? "success" : "warning",
              entityType: "advance",
              entityId: id,
              actionUrl: "/advances",
              clientId,
            });
          }
        }
      }
    },
  });

  const addAdvance = useCallback((adv: Advance) => {
    insertMut.mutate(adv);
  }, [insertMut]);

  const approveAdvance = useCallback((id: string, payrollRunId?: string) => {
    updateMut.mutate({ id, patch: { status: "approved", payroll_run_id: payrollRunId ?? null } });
  }, [updateMut]);

  const rejectAdvance = useCallback((id: string) => {
    updateMut.mutate({ id, patch: { status: "rejected" } });
  }, [updateMut]);

  const useAdvanceAmount = useCallback((id: string, amount: number) => {
    const current = rows.find((r) => r.id === id);
    if (!current) return;
    const newUsed = Math.round(Number(current.amount_used ?? 0) + amount);
    updateMut.mutate({ id, patch: { amount_used: newUsed } });
  }, [rows, updateMut]);

  const getEmployeeAdvances = useCallback((employeeId: string) => {
    return advances.filter(
      (a) => a.employeeId === employeeId && a.status === "approved" && a.amount - a.amountUsed > 0
    );
  }, [advances]);

  const sendReminder = useCallback((ids: string[]) => {
    const now = new Date().toISOString();
    const entry: ReminderEntry = { sentAt: now, sentBy: "Admin", type: "manual" };
    ids.forEach((id) => {
      const current = rows.find((r) => r.id === id);
      if (!current) return;
      const history = Array.isArray(current.reminder_history)
        ? (current.reminder_history as ReminderEntry[])
        : [];
      updateMut.mutate({
        id,
        patch: {
          last_reminder_sent: now,
          reminder_history: [...history, entry],
        },
      });
    });
  }, [rows, updateMut]);

  return (
    <AdvanceContext.Provider value={{
      advances,
      addAdvance,
      approveAdvance,
      rejectAdvance,
      useAdvanceAmount,
      getEmployeeAdvances,
      sendReminder,
      autoReminderInterval,
      setAutoReminderInterval,
    }}>
      {children}
    </AdvanceContext.Provider>
  );
}

export function useAdvances() {
  const ctx = useContext(AdvanceContext);
  if (ctx === undefined) {
    throw new Error("useAdvances must be used within AdvanceProvider");
  }
  return ctx;
}
