import type { AppRole } from "../auth/auth.types";
import type { AuthSession } from "../auth/auth.types";

export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export interface Invitation {
  id: string;
  clientId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  empId: string | null;
  department: string | null;
  designation: string | null;
  appRole: AppRole;
  roleId: string | null;
  status: InvitationStatus;
  expiresAt: string;
  acceptedAt: string | null;
  acceptedByUserId: string | null;
  revokedAt: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvitationRequest {
  email: string;
  appRole: Exclude<AppRole, "super_admin">;
  firstName?: string;
  lastName?: string;
  empId?: string;
  department?: string;
  designation?: string;
  roleId?: string;
}

export interface AcceptInvitationRequest {
  token: string;
  password: string;
  fullName?: string;
}

export type AcceptInvitationResponse = AuthSession;
