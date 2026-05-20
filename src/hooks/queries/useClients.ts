/** Super-admin client management — delegates to @/api/tenants. */
import {
  useTenants as useTenantsApi,
  useCreateTenant as useCreateTenantApi,
  useUpdateTenant as useUpdateTenantApi,
  useDeleteTenant as useDeleteTenantApi,
  type Tenant,
} from "@/api";
import { COUNTRIES } from "@/lib/countries";

export interface ClientStat {
  id: string;
  company_name: string;
  company_slug: string;
  company_email: string;
  status: string;
  subscription_plan: string;
  country: string;
  timezone: string;
  base_currency: string;
  enabled_tab_keys: string[];
  user_count: number;
  employee_count: number;
  created_at: string;
  updated_at: string;
}
export interface ClientUserRow {
  id: string;
  email: string;
  full_name: string | null;
}
export interface ClientFilters {
  search?: string;
  status?: string;
}
export interface CreateClientInput {
  company_name: string;
  company_slug?: string;
  company_email: string;
  country: string;
  timezone: string;
  base_currency: string;
  enabled_tab_keys?: string[];
  /** Email the admin a sign-up invitation link. */
  admin_invite?: {
    email: string;
    full_name?: string;
  };
}

function adapt(t: Tenant): ClientStat {
  return {
    id: t.id,
    company_name: t.companyName,
    company_slug: t.companySlug,
    company_email: t.companyEmail,
    status: t.status,
    subscription_plan: t.subscriptionPlan,
    country: t.country,
    timezone: t.timezone,
    base_currency: t.baseCurrency,
    enabled_tab_keys: t.enabledTabKeys ?? [],
    user_count: 0,
    employee_count: 0,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

/**
 * Backend wants:
 *   - `companySlug`: required slug (lowercase letters/digits/hyphens)
 *   - `country`: ISO-2 code (e.g. "SA"), NOT the full name
 *
 * The wizard sends:
 *   - company_name, no slug at all
 *   - country: full display name (e.g. "Saudi Arabia")
 *
 * This helper bridges the two shapes.
 */
function toIsoCountry(input: string): string {
  if (!input) return "SA";
  const trimmed = input.trim();
  if (trimmed.length === 2) return trimmed.toUpperCase();
  const match = COUNTRIES.find(
    (c) => c.name.toLowerCase() === trimmed.toLowerCase() || c.code.toLowerCase() === trimmed.toLowerCase(),
  );
  return match ? match.code : "SA";
}

function makeSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  // Backend slug regex requires start + end with [a-z0-9]; if empty fallback.
  const safe = base || `client-${Date.now()}`;
  // Append a short suffix so accidental name collisions don't fail
  return `${safe}-${Math.random().toString(36).slice(2, 6)}`;
}

function toBackendBody(input: CreateClientInput) {
  return {
    companyName: input.company_name,
    companySlug: input.company_slug?.trim() || makeSlug(input.company_name),
    companyEmail: input.company_email,
    country: toIsoCountry(input.country),
    timezone: input.timezone,
    baseCurrency: input.base_currency,
    ...(input.enabled_tab_keys ? { enabledTabKeys: input.enabled_tab_keys } : {}),
    ...(input.admin_invite?.email
      ? {
          adminInvite: {
            email: input.admin_invite.email,
            ...(input.admin_invite.full_name ? { fullName: input.admin_invite.full_name } : {}),
          },
        }
      : {}),
  };
}

export function useClients(filters?: ClientFilters) {
  const q = useTenantsApi({ search: filters?.search, pageSize: 200 });
  return { ...q, data: (q.data?.data ?? []).map(adapt) };
}

export function useClientUsers(_clientId: string | null) {
  return { data: [] as ClientUserRow[], isLoading: false };
}

export function useCreateClient() {
  const m = useCreateTenantApi();
  return {
    ...m,
    mutate: (input: CreateClientInput) => m.mutate(toBackendBody(input)),
    mutateAsync: async (input: CreateClientInput) => m.mutateAsync(toBackendBody(input)),
  };
}

export function useUpdateClient() {
  const m = useUpdateTenantApi();
  const buildBody = (patch: Partial<CreateClientInput> & { status?: string }) => ({
    companyName: patch.company_name,
    companyEmail: patch.company_email,
    country: patch.country ? toIsoCountry(patch.country) : undefined,
    timezone: patch.timezone,
    baseCurrency: patch.base_currency,
    ...(patch.enabled_tab_keys ? { enabledTabKeys: patch.enabled_tab_keys } : {}),
    ...(patch.status ? { status: patch.status as "active" | "suspended" | "trial" } : {}),
  });
  return {
    ...m,
    // IMPORTANT: must override BOTH mutate and mutateAsync, otherwise the
    // spread `...m` re-exposes the original mutateAsync (which expects
    // `{ id, body }`, not `{ id, patch }`) and the wizard's call sends a
    // request with no body → 400 "Required".
    mutate: ({ id, patch }: { id: string; patch: Partial<CreateClientInput> & { status?: string } }) =>
      m.mutate({ id, body: buildBody(patch) }),
    mutateAsync: ({ id, patch }: { id: string; patch: Partial<CreateClientInput> & { status?: string } }) =>
      m.mutateAsync({ id, body: buildBody(patch) }),
  };
}

export function useSetClientStatus() {
  const m = useUpdateTenantApi();
  return {
    ...m,
    mutate: ({ id, status }: { id: string; status: "active" | "suspended" | "trial" }) =>
      m.mutate({ id, body: { status } }),
    mutateAsync: async ({ id, status }: { id: string; status: "active" | "suspended" | "trial" }) =>
      m.mutateAsync({ id, body: { status } }),
  };
}

export function useDeleteClient() {
  return useDeleteTenantApi();
}
