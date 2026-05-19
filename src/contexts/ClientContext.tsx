import { createContext, useContext, ReactNode, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTenant, useUpdateTenant, tenantKeys } from "@/api";
import { useRole } from "@/contexts/RoleContext";

export interface ClientConfig {
  companyName: string;
  companyLogo?: string;    // localStorage only
  yearEndDate?: string;    // not yet on backend Client model; localStorage fallback
  yearEndLocked?: boolean; // localStorage only
  currency?: string;       // → backend `baseCurrency`
  country?: string;        // → backend `country`
  timezone?: string;       // → backend `timezone`
  email?: string;          // → backend `companyEmail`
  phone?: string;          // → backend `companyPhone`
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
  yearEndDate?: string;
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
  const tenantQ = useTenant(clientId);
  const updateMut = useUpdateTenant();

  const client = useMemo<ClientConfig>(() => {
    const extras = readLocalExtras();
    const db = tenantQ.data;
    return {
      companyName: db?.companyName ?? "",
      companyLogo: extras.companyLogo,
      yearEndDate: extras.yearEndDate ?? "12-31",
      yearEndLocked: extras.yearEndLocked,
      currency: db?.baseCurrency ?? "SAR",
      country: db?.country ?? "Saudi Arabia",
      timezone: db?.timezone ?? "Asia/Riyadh",
      email: db?.companyEmail ?? "",
      phone: db?.companyPhone ?? "",
    };
  }, [tenantQ.data]);

  const setClient = (next: ClientConfig) => {
    if (clientId) {
      updateMut.mutate({
        id: clientId,
        body: {
          companyName: next.companyName,
          ...(next.currency !== undefined ? { baseCurrency: next.currency } : {}),
          ...(next.country !== undefined ? { country: next.country } : {}),
          ...(next.timezone !== undefined ? { timezone: next.timezone } : {}),
          ...(next.email !== undefined ? { companyEmail: next.email } : {}),
          ...(next.phone !== undefined ? { companyPhone: next.phone } : {}),
        },
      });
    }
    writeLocalExtras({
      companyLogo: next.companyLogo,
      yearEndLocked: next.yearEndLocked,
      yearEndDate: next.yearEndDate,
    });
    if (clientId) {
      qc.invalidateQueries({ queryKey: tenantKeys.detail(clientId) });
    }
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
