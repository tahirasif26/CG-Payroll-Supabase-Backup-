import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { useToast } from "@/hooks/use-toast";

export interface GLMappingRow {
  id: string;
  client_id: string;
  entry_name: string;
  gl_code: string;
  created_at: string;
  updated_at: string;
}

export function useGLMappings() {
  const { clientId, isSuperAdmin } = useRole();
  return useQuery({
    queryKey: ["gl_mappings", clientId ?? "super"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gl_code_mappings")
        .select("*")
        .order("entry_name");
      if (error) throw error;
      return (data ?? []) as GLMappingRow[];
    },
    enabled: !!clientId || isSuperAdmin,
    staleTime: 60_000,
  });
}

/** Bulk upsert GL mappings (inserts or updates by entry_name). */
export function useSaveGLMappings() {
  const qc = useQueryClient();
  const { clientId } = useRole();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (entries: { entry_name: string; gl_code: string }[]) => {
      if (!clientId) throw new Error("No client context");
      const payload = entries.map((e) => ({
        client_id: clientId,
        entry_name: e.entry_name,
        gl_code: e.gl_code,
      }));
      const { error } = await supabase
        .from("gl_code_mappings")
        .upsert(payload, { onConflict: "client_id,entry_name" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gl_mappings"] });
      toast({ title: "GL code mappings saved" });
    },
    onError: (err: Error) =>
      toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });
}
