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
  /** Tab keys this tenant's users can access. Empty array = locked workspace. */
  enabledTabKeys: string[];
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
  enabledTabKeys?: string[];
  initialAdmin?: {
    email: string;
    password: string;
    fullName?: string;
  };
  /** Email the admin a sign-up invitation link. Mutually exclusive with `initialAdmin`. */
  adminInvite?: {
    email: string;
    fullName?: string;
  };
}

export interface CreateTenantResponse {
  client: Tenant;
  adminUserId: string | null;
  /** Present when `adminInvite` was supplied. `emailSent: false` means the invitation row was created but SendGrid delivery failed. */
  invitation: {
    id: string;
    email: string;
    emailSent: boolean;
  } | null;
}

export type UpdateTenantRequest = Partial<
  Omit<CreateTenantRequest, "companySlug" | "initialAdmin">
> & {
  /** Suspend / reactivate / mark trial. */
  status?: ClientStatus;
};

export interface TenantTabAccess {
  id: string;
  enabledTabKeys: string[];
}

/** GET /tenants/me/tabs response. `null` = super_admin → unrestricted. */
export interface MyTabsResponse {
  enabledTabKeys: string[] | null;
}
