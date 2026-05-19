export type AppRole = "super_admin" | "admin" | "hr" | "employee";

export interface JwtRoleBinding {
  role: AppRole;
  clientId: string | null;
  roleId: string | null;
}

export interface AuthSessionUser {
  id: string;
  email: string;
  primaryClientId: string | null;
  roles: JwtRoleBinding[];
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  user: AuthSessionUser;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName?: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken?: string;
  allDevices?: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface VerifyEmailRequest {
  token: string;
}
