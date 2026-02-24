import { createContext, useContext, useState, ReactNode } from "react";

export interface ClientConfig {
  companyName: string;
  companyLogo?: string; // base64 data URL
  yearEndDate?: string; // MM-DD format, e.g. "12-31"
  yearEndLocked?: boolean;
}

interface ClientContextType {
  client: ClientConfig;
  setClient: (config: ClientConfig) => void;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export function ClientProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<ClientConfig>(() => {
    const saved = localStorage.getItem("cg_client_config");
    return saved ? JSON.parse(saved) : { companyName: "" };
  });

  const updateClient = (config: ClientConfig) => {
    setClient(config);
    localStorage.setItem("cg_client_config", JSON.stringify(config));
  };

  return (
    <ClientContext.Provider value={{ client, setClient: updateClient }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error("useClient must be used within ClientProvider");
  return ctx;
}
