export type ClientStatus = "active" | "suspended" | "trial";
export type SubscriptionPlan = "starter" | "pro" | "enterprise";

export interface Tenant {
  id: string;
  companyName: string;
  companySlug: string;
  companyEmail: string;
  companyPhone: string | null;
  country: string;
  timezone: string;
  baseCurrency: string;
  status: ClientStatus;
  subscriptionPlan: SubscriptionPlan;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenantRequest {
  companyName: string;
  companySlug: string;
  companyEmail: string;
  companyPhone?: string;
  country: string;
  timezone: string;
  baseCurrency: string;
  subscriptionPlan?: SubscriptionPlan;
  initialAdmin?: {
    email: string;
    password: string;
    fullName?: string;
  };
}

export interface CreateTenantResponse {
  client: Tenant;
  adminUserId: string | null;
}

export type UpdateTenantRequest = Partial<
  Omit<CreateTenantRequest, "companySlug" | "initialAdmin">
>;
