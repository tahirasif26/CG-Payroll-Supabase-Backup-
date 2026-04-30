// Persists policy acknowledgements to the `policy_acknowledgements` table so the
// scheduled `process-reminders` job can stop nudging employees who already acked.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";
import { toast } from "sonner";

export function useMyPolicyAcks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["policy_acks", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("policy_acknowledgements")
        .select("policy_id")
        .eq("employee_id", (await supabase.from("employees").select("id").eq("user_id", user!.id).maybeSingle()).data?.id);
      if (error) throw error;
      return new Set<string>((data ?? []).map((r: any) => r.policy_id));
    },
  });
}

export function useAcknowledgePolicy() {
  const qc = useQueryClient();
  const { user, clientId } = useAuth();
  const { data: employee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (policyId: string) => {
      if (!user?.id || !employee?.id || !clientId) {
        throw new Error("Not signed in as an employee");
      }
      const { error } = await (supabase as any)
        .from("policy_acknowledgments")
        .insert({
          client_id: clientId,
          policy_id: policyId,
          employee_id: employee.id,
          user_id: user.id,
        });
      if (error && !String(error.message).includes("duplicate")) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["policy_acks"] });
      toast.success("Policy acknowledged");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to acknowledge"),
  });
}
