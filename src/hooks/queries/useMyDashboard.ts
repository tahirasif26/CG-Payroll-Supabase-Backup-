import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";

/**
 * Aggregated React Query hook powering the Employee Self-Service dashboard.
 * Returns the current employee's record + dashboard-relevant slices, all scoped
 * to the signed-in user via RLS.
 */
export function useMyDashboard() {
  const { user, clientId } = useRole();
  const userId = user?.id;
  const today = new Date();
  const year = today.getFullYear();

  // 1. Current employee record
  const employeeQ = useQuery({
    queryKey: ["me", "employee", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const empId: string | undefined = employeeQ.data?.id;

  // 2. Latest payslip (payroll_lines for this employee, newest first)
  const latestPayslipQ = useQuery({
    queryKey: ["me", "latest-payslip", empId],
    enabled: !!empId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_lines")
        .select("*, payroll_runs(month, year, status)")
        .eq("employee_id", empId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // 3. Recent payslips (last 3)
  const recentPayslipsQ = useQuery({
    queryKey: ["me", "recent-payslips", empId],
    enabled: !!empId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_lines")
        .select("id, net_pay, pay_currency, created_at, payroll_runs(month, year, status)")
        .eq("employee_id", empId!)
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data ?? [];
    },
  });

  // 4. Leave balances for current year
  const leaveBalancesQ = useQuery({
    queryKey: ["me", "leave-balances", empId, year],
    enabled: !!empId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("leave_balances")
        .select("*, leave_types(name, code)")
        .eq("employee_id", empId!)
        .eq("year", year);
      if (error) throw error;
      return (data ?? []) as Array<{
        allocated: number;
        used: number;
        carried_forward: number;
        leave_types: { name: string; code: string } | null;
      }>;
    },
  });

  // 5. My leave requests (upcoming + pending)
  const leaveRequestsQ = useQuery({
    queryKey: ["me", "leave-requests", empId],
    enabled: !!empId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("leave_requests")
        .select("*, leave_types(name)")
        .eq("employee_id", empId!)
        .gte("end_date", today.toISOString().slice(0, 10))
        .order("start_date", { ascending: true })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  // 6. My recent expenses
  const expensesQ = useQuery({
    queryKey: ["me", "expenses", empId],
    enabled: !!empId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("id, amount, currency, status, expense_date, description, expense_categories(name)")
        .eq("employee_id", empId!)
        .order("expense_date", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  // 7. Assets assigned to me
  const assetsQ = useQuery({
    queryKey: ["me", "assets", empId],
    enabled: !!empId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assets")
        .select("id, name, asset_tag, status, asset_categories(name)")
        .eq("employee_id", empId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  // 8. My documents (for expiry warnings)
  const documentsQ = useQuery({
    queryKey: ["me", "documents", empId],
    enabled: !!empId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_documents")
        .select("id, doc_type, doc_number, expiry_date, status")
        .eq("employee_id", empId!)
        .not("expiry_date", "is", null)
        .order("expiry_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // 9. Upcoming holidays (next 90 days)
  const holidaysQ = useQuery({
    queryKey: ["me", "holidays", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const todayStr = today.toISOString().slice(0, 10);
      const horizon = new Date(today);
      horizon.setDate(horizon.getDate() + 90);
      const horizonStr = horizon.toISOString().slice(0, 10);
      const { data, error } = await (supabase as any)
        .from("holidays")
        .select("id, name, date")
        .gte("date", todayStr)
        .lte("date", horizonStr)
        .order("date", { ascending: true })
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });

  // 10. Team birthdays (next 30 days, same client)
  const birthdaysQ = useQuery({
    queryKey: ["me", "birthdays", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name, department, date_of_birth, avatar_url")
        .eq("status", "active")
        .not("date_of_birth", "is", null);
      if (error) throw error;
      return (data ?? [])
        .map((e) => {
          const dob = e.date_of_birth ? new Date(e.date_of_birth) : null;
          if (!dob) return null;
          const next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
          if (next < today) next.setFullYear(today.getFullYear() + 1);
          const daysUntil = Math.ceil((next.getTime() - today.getTime()) / 86400000);
          return { ...e, daysUntil };
        })
        .filter((e): e is NonNullable<typeof e> => !!e && e.daysUntil <= 30)
        .sort((a, b) => a.daysUntil - b.daysUntil)
        .slice(0, 5);
    },
  });

  // Derived
  const annualLeaveBalance = (() => {
    const rows = leaveBalancesQ.data ?? [];
    const annual = rows.find((r) => /annual|vacation/i.test(r.leave_types?.name ?? ""));
    if (!annual) return null;
    return {
      remaining: Number(annual.allocated) + Number(annual.carried_forward) - Number(annual.used),
      allocated: Number(annual.allocated),
    };
  })();

  const sickLeaveBalance = (() => {
    const rows = leaveBalancesQ.data ?? [];
    const sick = rows.find((r) => /sick/i.test(r.leave_types?.name ?? ""));
    if (!sick) return null;
    return Number(sick.allocated) - Number(sick.used);
  })();

  const pendingExpenseCount =
    expensesQ.data?.filter((e: any) => e.status === "pending" || e.status === "submitted").length ?? 0;

  // Profile completion (basic heuristic)
  const profileCompletion = (() => {
    const e = employeeQ.data;
    if (!e) return 0;
    const fields = [
      e.first_name, e.last_name, e.email, e.phone,
      e.date_of_birth, e.department, e.designation, e.joining_date,
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  })();

  return {
    employee: employeeQ.data,
    latestPayslip: latestPayslipQ.data,
    recentPayslips: recentPayslipsQ.data ?? [],
    leaveBalances: leaveBalancesQ.data ?? [],
    annualLeaveBalance,
    sickLeaveBalance,
    upcomingLeaves: leaveRequestsQ.data ?? [],
    expenses: expensesQ.data ?? [],
    pendingExpenseCount,
    assets: assetsQ.data ?? [],
    documents: documentsQ.data ?? [],
    holidays: holidaysQ.data ?? [],
    birthdays: birthdaysQ.data ?? [],
    profileCompletion,
    loading: employeeQ.isLoading,
  };
}
