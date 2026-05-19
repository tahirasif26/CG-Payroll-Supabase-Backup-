import { useQuery } from "@tanstack/react-query";
import { auditApi } from "./audit.api";
import { tokenStorage } from "../token-storage";
import type { ListAuditQuery } from "./audit.types";

export const auditKeys = {
  all: ["audit-logs"] as const,
  list: (q: ListAuditQuery) => [...auditKeys.all, "list", q] as const,
};

export function useAuditLogs(query: ListAuditQuery = {}) {
  return useQuery({
    queryKey: auditKeys.list(query),
    queryFn: () => auditApi.list(query),
    enabled: !!tokenStorage.getAccessToken(),
    // Audit data is append-only — short stale-time is wasteful.
    staleTime: 60_000,
  });
}
