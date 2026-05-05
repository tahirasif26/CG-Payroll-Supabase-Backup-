import { createContext, useContext, ReactNode, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";

export interface ClientConfig {
  companyName: string;
  companyLogo?: string;    // localStorage only (base64 — not in DB yet)
  yearEndDate?: string;    // DB: clients.year_end_date (MM-DD format e.g. "12-31")
  yearEndLocked?: boolean; // localStorage only for now
  currency?: string;       // DB: clients.base_currency
  country?: string;        // DB: clients.country
  timezone?: string;       // DB: clients.timezone
  email?: string;          // DB: clients.company_email
  phone?: string;          // DB: clients.company_phone
}

interface ClientContextType {
  client: ClientConfig;
  setClient: (config: ClientConfig) => void;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

const LOCAL_KEY = "cg_client_local_extras";

interface LocalExtras {
  companyLogo?: string;
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
        .select("id, company_name, year_end_date, base_currency, country, timezone, company_email, company_phone")
        .eq("id", clientId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (next: ClientConfig) => {
      if (!clientId) return;
      const patch: Record<string, any> = {
        company_name: next.companyName,
      };
      if (next.yearEndDate !== undefined) patch.year_end_date = next.yearEndDate;
      if (next.currency !== undefined) patch.base_currency = next.currency;
      if (next.country !== undefined) patch.country = next.country;
      if (next.timezone !== undefined) patch.timezone = next.timezone;
      if (next.email !== undefined) patch.company_email = next.email;
      if (next.phone !== undefined) patch.company_phone = next.phone;

      const { error } = await supabase.from("clients").update(patch as any).eq("id", clientId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client", clientId] }),
  });

  const client = useMemo<ClientConfig>(() => {
    const extras = readLocalExtras();
    const db: any = dbClient ?? {};
    return {
      companyName: db.company_name ?? "",
      companyLogo: extras.companyLogo,
      yearEndDate: db.year_end_date ?? "12-31",
      yearEndLocked: extras.yearEndLocked,
      currency: db.base_currency ?? "SAR",
      country: db.country ?? "Saudi Arabia",
      timezone: db.timezone ?? "Asia/Riyadh",
      email: db.company_email ?? "",
      phone: db.company_phone ?? "",
    };
  }, [dbClient]);

  const setClient = (next: ClientConfig) => {
    // Persist to DB (company name + all other DB-backed fields)
    updateMutation.mutate(next);

    // Persist ONLY non-DB fields to localStorage
    writeLocalExtras({
      companyLogo: next.companyLogo,
      yearEndLocked: next.yearEndLocked,
    });

    // Optimistic update
    qc.setQueryData(["client", clientId], (old: any) => ({
      ...(old ?? {}),
      company_name: next.companyName,
      year_end_date: next.yearEndDate,
      base_currency: next.currency,
      country: next.country,
      timezone: next.timezone,
      company_email: next.email,
      company_phone: next.phone,
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
