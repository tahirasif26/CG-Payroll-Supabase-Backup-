import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useRole } from "@/contexts/RoleContext";
import { notifyUser, getEmployeeUserId } from "@/lib/notify";

type ExpenseRow = any;

export function useExpenses(filters?: { status?: string; employee_id?: string }) {
  return useQuery({
    queryKey: ["expenses", filters],
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    queryFn: async () => {
      let q = (supabase as any).from("expenses").select("*, expense_categories(name)").order("expense_date", { ascending: false });
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.employee_id) q = q.eq("employee_id", filters.employee_id);
      const { data, error } = await q;
      if (error) throw error;
      return data as ExpenseRow[];
    },
  });
}

export function useExpense(id: string | undefined) {
  return useQuery({
    queryKey: ["expense", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("expenses").select("*, expense_categories(name)").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ExpenseRow>) => {
      const { data, error } = await (supabase as any).from("expenses").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense submitted");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to submit"),
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  const { clientId } = useRole();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<ExpenseRow>) => {
      const { data, error } = await (supabase as any).from("expenses").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return { data, patch };
    },
    onSuccess: async ({ data, patch }: any) => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["expense"] });
      if (patch.status === "approved" || patch.status === "rejected") {
        const recipient = await getEmployeeUserId(data.employee_id);
        if (recipient) {
          await notifyUser(recipient, {
            title: patch.status === "approved" ? "Expense approved" : "Expense rejected",
            body: patch.status === "approved"
              ? "Your expense has been approved."
              : `Your expense was rejected${data.rejection_reason ? `: ${data.rejection_reason}` : "."}`,
            category: "expense",
            severity: patch.status === "approved" ? "success" : "warning",
            entityType: "expense",
            entityId: data.id,
            actionUrl: "/expenses",
            clientId,
          });
        }
      }
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense deleted");
    },
  });
}

export function useExpenseCategories() {
  return useQuery({
    queryKey: ["expense_categories"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("expense_categories").select("*").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useMileageEntries(employee_id?: string) {
  return useQuery({
    queryKey: ["mileage_entries", employee_id],
    queryFn: async () => {
      let q = (supabase as any).from("mileage_entries").select("*").order("date", { ascending: false });
      if (employee_id) q = q.eq("employee_id", employee_id);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateMileageEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await (supabase as any).from("mileage_entries").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mileage_entries"] });
      toast.success("Mileage entry recorded");
    },
  });
}
