import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { useToast } from "@/hooks/use-toast";

export interface EmployeeFilters {
  status?: string;
  department?: string;
  search?: string;
}

export interface EmployeeRow {
  id: string;
  client_id: string;
  user_id: string | null;
  emp_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  department: string | null;
  designation: string | null;
  category: string | null;
  joining_date: string | null;
  status: string;
  avatar_url: string | null;
  reports_to: string | null;
  pay_currency: string | null;
  payroll_setup_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch employees for the current tenant. Super admins can pass an explicit
 * client_id filter; otherwise we rely on RLS + the user's own client_id.
 */
export function useEmployees(filters?: EmployeeFilters) {
  const { clientId, isSuperAdmin } = useRole();
  return useQuery({
    queryKey: ["employees", clientId ?? "super", filters],
    queryFn: async () => {
      let query = supabase
        .from("employees")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.department) query = query.eq("department", filters.department);
      if (filters?.search) {
        const q = filters.search.replace(/[%,]/g, "");
        query = query.or(
          `first_name.ilike.%${q}%,last_name.ilike.%${q}%,emp_id.ilike.%${q}%,email.ilike.%${q}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as EmployeeRow[];
    },
    enabled: !!clientId || isSuperAdmin,
    staleTime: 30_000,
  });
}

export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: ["employee", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as EmployeeRow | null;
    },
    enabled: !!id,
  });
}

export interface CreateEmployeeInput {
  emp_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department?: string;
  designation?: string;
  category?: string;
  division?: string;
  joining_date?: string;
  date_of_birth?: string;
  gender?: string;
  marital_status?: string;
  nationality?: string;
  religion?: string;
  work_location_country?: string;
  work_location_city?: string;
  pay_currency?: string;
  payroll_setup_id?: string;
  reports_to?: string;
  // Sub-records
  address?: {
    address_line1?: string; address_line2?: string;
    city?: string; state?: string; country?: string; postal_code?: string;
  };
  bank?: {
    bank_name?: string; bank_country?: string; swift_code?: string;
    iban?: string; bank_currency?: string; beneficiary_name?: string; bank_address?: string;
  };
  emergency_contact?: {
    name?: string; relation?: string; phone?: string; email?: string;
  };
  education?: { institution?: string; degree?: string; field_of_study?: string; start_year?: number; end_year?: number }[];
  // Optional: send invite email
  send_invite?: boolean;
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  const { clientId } = useRole();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateEmployeeInput) => {
      if (!clientId) throw new Error("No client context — cannot create employee.");

      // 1. Insert employee row
      const { data: emp, error: empErr } = await supabase
        .from("employees")
        .insert({
          client_id: clientId,
          emp_id: input.emp_id,
          first_name: input.first_name,
          last_name: input.last_name,
          email: input.email,
          phone: input.phone || null,
          department: input.department || null,
          designation: input.designation || null,
          category: input.category || null,
          division: input.division || null,
          joining_date: input.joining_date || null,
          date_of_birth: input.date_of_birth || null,
          gender: input.gender || null,
          marital_status: input.marital_status || null,
          nationality: input.nationality || null,
          religion: input.religion || null,
          work_location_country: input.work_location_country || null,
          work_location_city: input.work_location_city || null,
          pay_currency: input.pay_currency || null,
          payroll_setup_id: input.payroll_setup_id || null,
          reports_to: input.reports_to || null,
          status: "active",
        })
        .select()
        .single();
      if (empErr) throw empErr;

      // 2. Insert sub-records (best-effort, won't fail the whole op)
      const subInserts: Promise<unknown>[] = [];
      if (input.address && Object.values(input.address).some(Boolean)) {
        subInserts.push(
          Promise.resolve(
            supabase.from("employee_addresses").insert({
              employee_id: emp.id, client_id: clientId, type: "current", ...input.address,
            })
          )
        );
      }
      if (input.bank && Object.values(input.bank).some(Boolean)) {
        subInserts.push(
          Promise.resolve(
            supabase.from("employee_bank_details").insert({
              employee_id: emp.id, client_id: clientId, ...input.bank,
            })
          )
        );
      }
      if (input.emergency_contact && Object.values(input.emergency_contact).some(Boolean)) {
        subInserts.push(
          Promise.resolve(
            supabase.from("employee_emergency_contacts").insert({
              employee_id: emp.id, client_id: clientId, ...input.emergency_contact,
            })
          )
        );
      }
      if (input.education?.length) {
        subInserts.push(
          Promise.resolve(
            supabase.from("employee_education").insert(
              input.education.map((e) => ({ employee_id: emp.id, client_id: clientId, ...e }))
            )
          )
        );
      }
      await Promise.allSettled(subInserts);

      // 3. Send invite via edge function (best-effort)
      let inviteResult: { ok: boolean; error?: string } = { ok: false };
      if (input.send_invite) {
        try {
          const { error: inviteErr } = await supabase.functions.invoke("invite-employee", {
            body: {
              email: input.email,
              full_name: `${input.first_name} ${input.last_name}`.trim(),
              employee_id: input.emp_id,
              phone: input.phone,
              role: "employee",
              client_id: clientId,
            },
          });
          inviteResult = inviteErr ? { ok: false, error: inviteErr.message } : { ok: true };
        } catch (err) {
          inviteResult = { ok: false, error: err instanceof Error ? err.message : "Invite failed" };
        }
      }

      return { employee: emp as EmployeeRow, invite: inviteResult };
    },
    onSuccess: ({ employee, invite }) => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      if (invite.ok) {
        toast({
          title: "Employee added — invite sent",
          description: `${employee.first_name} ${employee.last_name} must click the link in the email sent to ${employee.email} to set a password before they can sign in.`,
        });
      } else {
        toast({
          title: "Employee added",
          description: invite.error
            ? `Created, but invite email failed: ${invite.error}. They won't be able to sign in until re-invited.`
            : `${employee.first_name} ${employee.last_name} has been onboarded. No login invite was sent.`,
        });
      }
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to add employee",
        description: err.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<EmployeeRow> }) => {
      const { data, error } = await supabase
        .from("employees")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as EmployeeRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast({ title: "Employee updated" });
    },
    onError: (err: Error) =>
      toast({ title: "Update failed", description: err.message, variant: "destructive" }),
  });
}

export function useDeactivateEmployee() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("employees")
        .update({ status: "inactive" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast({ title: "Employee deactivated" });
    },
    onError: (err: Error) =>
      toast({ title: "Action failed", description: err.message, variant: "destructive" }),
  });
}
