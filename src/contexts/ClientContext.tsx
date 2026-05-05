import { createContext, useContext, ReactNode, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";

export interface ClientConfig {
  companyName: string;
  companyLogo?: string; // base64 data URL — not yet in DB schema, kept in localStorage
  yearEndDate?: string; // MM-DD — not yet in DB schema, kept in localStorage
  yearEndLocked?: boolean;
}

interface ClientContextType {
  client: ClientConfig;
  setClient: (config: ClientConfig) => void;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

const LOCAL_KEY = "cg_client_local_extras";

interface LocalExtras {
  companyLogo?: string;
  yearEndDate?: string;
  yearEndLocked?: boolean;
}

function readLocalExtras(): LocalExtras {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as LocalExtras) : {};
  } catch {
    return {};
  }
}

function writeLocalExtras(extras: LocalExtras) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(extras));
  } catch {
    /* ignore */
  }
}

export function ClientProvider({ children }: { children: ReactNode }) {
  const { clientId } = useRole();
  const qc = useQueryClient();

  const { data: dbClient } = useQuery({
    queryKey: ["client", clientId],
    enabled: !!clientId,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, company_name")
        .eq("id", clientId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (companyName: string) => {
      if (!clientId) return;
      const { error } = await supabase
        .from("clients")
        .update({ company_name: companyName })
        .eq("id", clientId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client", clientId] }),
  });

  const client = useMemo<ClientConfig>(() => {
    const extras = readLocalExtras();
    return {
      companyName: dbClient?.company_name ?? "",
      companyLogo: extras.companyLogo,
      yearEndDate: extras.yearEndDate,
      yearEndLocked: extras.yearEndLocked,
    };
  }, [dbClient]);

  const setClient = (next: ClientConfig) => {
    // Persist company name to DB
    if (next.companyName !== client.companyName) {
      updateMutation.mutate(next.companyName);
    }
    // Persist non-DB fields to localStorage until columns are added
    writeLocalExtras({
      companyLogo: next.companyLogo,
      yearEndDate: next.yearEndDate,
      yearEndLocked: next.yearEndLocked,
    });
    // Optimistic update for the local extras
    qc.setQueryData(["client", clientId], (old: any) => ({
      ...(old ?? {}),
      company_name: next.companyName,
    }));
  };

  return (
    <ClientContext.Provider value={{ client, setClient }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error("useClient must be used within ClientProvider");
  return ctx;
}
