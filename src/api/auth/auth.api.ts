import { apiPost } from "../client";
import { tokenStorage } from "../token-storage";
import type {
  AuthSession,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  LogoutRequest,
  RegisterRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
} from "./auth.types";

/**
 * Raw HTTP layer for the NestJS auth module. The hooks file (`auth.hooks.ts`)
 * wraps these in React Query for UI consumption.
 */

export const authApi = {
  async register(body: RegisterRequest): Promise<AuthSession> {
    const session = await apiPost<AuthSession>("/auth/register", body);
    persistSession(session);
    return session;
  },

  async login(body: LoginRequest): Promise<AuthSession> {
    const session = await apiPost<AuthSession>("/auth/login", body);
    persistSession(session);
    return session;
  },

  /**
   * Manual refresh. The axios interceptor handles automatic refresh on 401 —
   * call this only from explicit "refresh now" flows.
   */
  async refresh(): Promise<AuthSession> {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) throw new Error("No refresh token");
    const session = await apiPost<AuthSession>("/auth/refresh", { refreshToken });
    persistSession(session);
    return session;
  },

  async logout(body: LogoutRequest = {}): Promise<void> {
    const refreshToken = body.refreshToken ?? tokenStorage.getRefreshToken() ?? undefined;
    try {
      await apiPost<void>("/auth/logout", { ...body, refreshToken });
    } finally {
      tokenStorage.clear();
    }
  },

  forgotPassword(body: ForgotPasswordRequest): Promise<{ acknowledged: boolean }> {
    return apiPost<{ acknowledged: boolean }>("/auth/forgot-password", body);
  },

  resetPassword(body: ResetPasswordRequest): Promise<{ reset: boolean }> {
    return apiPost<{ reset: boolean }>("/auth/reset-password", body);
  },

  verifyEmail(body: VerifyEmailRequest): Promise<{ verified: boolean }> {
    return apiPost<{ verified: boolean }>("/auth/verify-email", body);
  },
};

function persistSession(session: AuthSession) {
  tokenStorage.setTokens({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  });
  if (session.user.primaryClientId) {
    tokenStorage.setActiveClientId(session.user.primaryClientId);
  }
}
