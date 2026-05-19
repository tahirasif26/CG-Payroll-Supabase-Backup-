import type { AppRole } from '@prisma/client';

/** Per-membership role binding embedded in the JWT. */
export interface JwtRoleBinding {
  role: AppRole;
  clientId: string | null;
  roleId: string | null;
}

/** Decoded shape of the signed access token. */
export interface JwtAccessPayload {
  sub: string; // user id
  email: string;
  type: 'access';
  primaryClientId: string | null;
  roles: JwtRoleBinding[];
  iat?: number;
  exp?: number;
}

/** Decoded shape of the signed refresh token. */
export interface JwtRefreshPayload {
  sub: string;
  type: 'refresh';
  family: string;
  jti: string; // matches refresh_tokens.token_hash key (sha256 of jti)
  iat?: number;
  exp?: number;
}

/** Resolved user context attached to every authenticated request. */
export interface RequestUser {
  id: string;
  email: string;
  primaryClientId: string | null;
  roles: JwtRoleBinding[];
  /** Currently-active client scope (set by ClientScopeGuard). */
  activeClientId: string | null;
}
