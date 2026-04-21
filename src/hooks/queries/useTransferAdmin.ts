import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Promotes the given auth user to "admin" of their client.
 * The DB trigger `enforce_single_admin_per_client` automatically demotes the
 * previous admin to "employee", guaranteeing exactly one admin per client.
 */
export function useTransferAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (newAdminUserId: string) => {
      const { data, error } = await supabase.functions.invoke("transfer-admin", {
        body: { new_admin_user_id: newAdminUserId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-users"] });
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["all-feature-toggles"] });
      toast.success("Admin transferred", {
        description: "The selected user is now the client admin. The previous admin is now a regular employee.",
      });
    },
    onError: (err: Error) => {
      toast.error("Transfer failed", { description: err.message });
    },
  });
}
