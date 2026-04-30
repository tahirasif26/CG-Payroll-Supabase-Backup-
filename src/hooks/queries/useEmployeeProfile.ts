import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { useToast } from "@/hooks/use-toast";

/**
 * Loads the full employee profile: the employees row plus sub-records
 * (address, bank, emergency contact, education) — same shape the
 * Add Employee wizard collects, so the profile view/edit form can
 * round-trip the same data.
 */
export function useEmployeeProfile(employeeId: string | undefined) {
  return useQuery({
    queryKey: ["employee-profile", employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const empId = employeeId!;
      const [empRes, addrRes, bankRes, emergRes, eduRes] = await Promise.all([
        supabase.from("employees").select("*").eq("id", empId).maybeSingle(),
        supabase.from("employee_addresses").select("*").eq("employee_id", empId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("employee_bank_details").select("*").eq("employee_id", empId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("employee_emergency_contacts").select("*").eq("employee_id", empId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("employee_education").select("*").eq("employee_id", empId).order("created_at", { ascending: true }),
      ]);
      if (empRes.error) throw empRes.error;
      return {
        employee: empRes.data,
        address: addrRes.data ?? null,
        bank: bankRes.data ?? null,
        emergency: emergRes.data ?? null,
        education: eduRes.data ?? [],
      };
    },
    staleTime: 15_000,
  });
}

interface UpdateProfileInput {
  employeeId: string;
  bio?: {
    first_name?: string; last_name?: string; date_of_birth?: string | null;
    gender?: string | null; marital_status?: string | null; religion?: string | null; nationality?: string | null;
  };
  contact?: {
    personal_phone?: string | null; personal_email?: string | null;
  };
  emergency?: {
    name?: string; relation?: string; phone?: string; email?: string;
  };
  address?: {
    address_line1?: string; address_line2?: string;
    city?: string; state?: string; country?: string; postal_code?: string;
  };
  bank?: {
    bank_name?: string; bank_country?: string; swift_code?: string;
    bank_address?: string; iban?: string; bank_currency?: string; beneficiary_name?: string;
  };
  education?: { id?: string; institution?: string; degree?: string; field_of_study?: string; start_year?: number | null }[];
}

export function useUpdateEmployeeProfile() {
  const qc = useQueryClient();
  const { clientId } = useRole();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      if (!clientId) throw new Error("No client context");
      const { employeeId } = input;

      // 1. Bio + contact go on employees row
      const empUpdates: Record<string, unknown> = {};
      if (input.bio) Object.assign(empUpdates, {
        ...(input.bio.first_name !== undefined && { first_name: input.bio.first_name }),
        ...(input.bio.last_name !== undefined && { last_name: input.bio.last_name }),
        ...(input.bio.date_of_birth !== undefined && { date_of_birth: input.bio.date_of_birth || null }),
        ...(input.bio.gender !== undefined && { gender: input.bio.gender || null }),
        ...(input.bio.marital_status !== undefined && { marital_status: input.bio.marital_status || null }),
        ...(input.bio.religion !== undefined && { religion: input.bio.religion || null }),
        ...(input.bio.nationality !== undefined && { nationality: input.bio.nationality || null }),
      });
      if (input.contact) Object.assign(empUpdates, {
        ...(input.contact.personal_phone !== undefined && { personal_phone: input.contact.personal_phone || null }),
        ...(input.contact.personal_email !== undefined && { personal_email: input.contact.personal_email || null }),
      });
      if (Object.keys(empUpdates).length > 0) {
        const { error } = await (supabase as any).from("employees").update(empUpdates).eq("id", employeeId);
        if (error) throw error;
      }

      // 2. Upsert one-to-one sub-records: fetch existing id, then update or insert
      const upsertOne = async (table: string, payload: Record<string, unknown>) => {
        const { data: existing } = await (supabase as any).from(table).select("id").eq("employee_id", employeeId).maybeSingle();
        if (existing?.id) {
          const { error } = await (supabase as any).from(table).update(payload).eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await (supabase as any).from(table).insert({ employee_id: employeeId, client_id: clientId, ...payload });
          if (error) throw error;
        }
      };

      if (input.address) await upsertOne("employee_addresses", { type: "current", ...input.address });
      if (input.bank) await upsertOne("employee_bank_details", input.bank);
      if (input.emergency) await upsertOne("employee_emergency_contacts", input.emergency);

      // 3. Education: replace-all strategy (delete + insert)
      if (input.education) {
        await (supabase as any).from("employee_education").delete().eq("employee_id", employeeId);
        const rows = input.education
          .filter((e) => e.institution || e.degree || e.field_of_study)
          .map((e) => ({
            employee_id: employeeId,
            client_id: clientId,
            institution: e.institution || null,
            degree: e.degree || null,
            field_of_study: e.field_of_study || null,
            start_year: e.start_year ?? null,
          }));
        if (rows.length > 0) {
          const { error } = await (supabase as any).from("employee_education").insert(rows);
          if (error) throw error;
        }
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["employee-profile", vars.employeeId] });
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["employees-ctx"] });
      toast({ title: "Saved", description: "Profile updated successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });
}
