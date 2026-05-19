import type { AppRole } from "../auth/auth.types";

export interface CurrentUserProfile {
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  phone: string | null;
}

export interface CurrentUserRoleBinding {
  id: string;
  roleId: string;
  clientId: string | null;
  role: { id: string; name: string; appRole: AppRole };
  client: { id: string; companyName: string; companySlug: string } | null;
}

export interface CurrentUserEmployee {
  id: string;
  clientId: string;
  empId: string;
  firstName: string;
  lastName: string;
  department: string | null;
  designation: string | null;
  status: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  emailVerifiedAt: string | null;
  status: "pending" | "active" | "disabled";
  lastLoginAt: string | null;
  primaryClientId: string | null;
  profile: CurrentUserProfile | null;
  userRoles: CurrentUserRoleBinding[];
  employee: CurrentUserEmployee | null;
}

export interface UpdateProfileRequest {
  fullName?: string;
  avatarUrl?: string | null;
  phone?: string | null;
}
