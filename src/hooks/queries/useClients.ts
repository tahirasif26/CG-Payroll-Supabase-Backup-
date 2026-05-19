/** Super-admin client management — delegates to @/api/tenants. */
import {
  useTenants as useTenantsApi,
  useCreateTenant as useCreateTenantApi,
  useUpdateTenant as useUpdateTenantApi,
  type Tenant,
} from "@/api";

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
  company_slug: string;
  company_email: string;
  country: string;
  timezone: string;
  base_currency: string;
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
    user_count: 0,      // not yet returned by /tenants — would need a stats endpoint
    employee_count: 0,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
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
    mutate: (input: CreateClientInput) =>
      m.mutate({
        companyName: input.company_name,
        companySlug: input.company_slug,
        companyEmail: input.company_email,
        country: input.country,
        timezone: input.timezone,
        baseCurrency: input.base_currency,
      }),
    mutateAsync: async (input: CreateClientInput) =>
      m.mutateAsync({
        companyName: input.company_name,
        companySlug: input.company_slug,
        companyEmail: input.company_email,
        country: input.country,
        timezone: input.timezone,
        baseCurrency: input.base_currency,
      }),
  };
}

export function useUpdateClient() {
  const m = useUpdateTenantApi();
  return {
    ...m,
    mutate: ({ id, patch }: { id: string; patch: Partial<CreateClientInput> }) =>
      m.mutate({
        id,
        body: {
          companyName: patch.company_name,
          companyEmail: patch.company_email,
          country: patch.country,
          timezone: patch.timezone,
          baseCurrency: patch.base_currency,
        },
      }),
  };
}

export function useSetClientStatus() {
  return {
    mutate: () => console.warn("[useClients] setClientStatus not yet on NestJS"),
    mutateAsync: async () => undefined,
    isPending: false,
  };
}

export function useDeleteClient() {
  return {
    mutate: () => console.warn("[useClients] deleteClient not yet on NestJS"),
    mutateAsync: async () => undefined,
    isPending: false,
  };
}
