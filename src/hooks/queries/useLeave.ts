import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useLeaveTypes() {
  return useQuery({
    queryKey: ["leave_types"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("leave_types").select("*").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await (supabase as any).from("leave_types").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave_types"] });
      toast.success("Leave type created");
    },
  });
}

export function useUpdateLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Record<string, any>) => {
      const { error } = await (supabase as any).from("leave_types").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leave_types"] }),
  });
}

export function useLeaveBalances(employee_id?: string, year?: number) {
  return useQuery({
    queryKey: ["leave_balances", employee_id, year],
    queryFn: async () => {
      let q = (supabase as any).from("leave_balances").select("*, leave_types(name, code)");
      if (employee_id) q = q.eq("employee_id", employee_id);
      if (year) q = q.eq("year", year);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useLeaveRequests(filters?: { status?: string; employee_id?: string }) {
  return useQuery({
    queryKey: ["leave_requests", filters],
    queryFn: async () => {
      let q = (supabase as any).from("leave_requests").select("*, leave_types(name), employees(first_name, last_name)").order("start_date", { ascending: false });
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.employee_id) q = q.eq("employee_id", filters.employee_id);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await (supabase as any).from("leave_requests").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave_requests"] });
      toast.success("Leave request submitted");
    },
  });
}

export function useUpdateLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Record<string, any>) => {
      const { error } = await (supabase as any).from("leave_requests").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leave_requests"] }),
  });
}

export function useHolidays() {
  return useQuery({
    queryKey: ["holidays"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("holidays").select("*").order("date");
      if (error) throw error;
      return data;
    },
  });
}
