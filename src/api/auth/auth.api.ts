import { supabase } from "@/integrations/supabase/client";
import { tokenStorage } from "../token-storage";
import { ApiClientError } from "../errors";
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
 * Auth layer backed by Lovable Cloud (Supabase). The NestJS migration is on
 * pause — the API server isn't deployed in the preview environment, so we
 * route auth directly to Supabase and synthesize the AuthSession shape that
 * the rest of the app expects.
 */

async function sessionFromSupabase(): Promise<AuthSession> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new ApiClientError(401, { code: "NO_SESSION", message: error.message });
  const s = data.session;
  if (!s) throw new ApiClientError(401, { code: "NO_SESSION", message: "No active session" });

  // Pull primary client id from user_roles (admin/hr/employee binding).
  let primaryClientId: string | null = null;
  try {
    const { data: rpcData } = await supabase.rpc("get_user_client_id", { _user_id: s.user.id });
    primaryClientId = (rpcData as string) ?? null;
  } catch {
    /* ignore — function returns null for super_admins */
  }

  return {
    accessToken: s.access_token,
    refreshToken: s.refresh_token,
    expiresIn: String(s.expires_in ?? 3600),
    user: {
      id: s.user.id,
      email: s.user.email ?? "",
      primaryClientId,
      roles: [], // populated separately via usersApi.me()
    },
  };
}

function persistSession(session: AuthSession) {
  tokenStorage.setTokens({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  });
  if (session.user.primaryClientId) {
    tokenStorage.setActiveClientId(session.user.primaryClientId);
  }
}

export const authApi = {
  async register(body: RegisterRequest): Promise<AuthSession> {
    const { error } = await supabase.auth.signUp({
      email: body.email,
      password: body.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: body.fullName ? { full_name: body.fullName } : undefined,
      },
    });
    if (error) throw new ApiClientError(400, { code: "REGISTER_FAILED", message: error.message });
    const session = await sessionFromSupabase();
    persistSession(session);
    return session;
  },

  async login(body: LoginRequest): Promise<AuthSession> {
    const { error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });
    if (error) throw new ApiClientError(401, { code: "LOGIN_FAILED", message: error.message });
    const session = await sessionFromSupabase();
    persistSession(session);
    return session;
  },

  async refresh(): Promise<AuthSession> {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) {
      throw new ApiClientError(401, { code: "REFRESH_FAILED", message: error?.message ?? "Refresh failed" });
    }
    const session = await sessionFromSupabase();
    persistSession(session);
    return session;
  },

  async logout(_body: LogoutRequest = {}): Promise<void> {
    try {
      await supabase.auth.signOut();
    } finally {
      tokenStorage.clear();
    }
  },

  async forgotPassword(body: ForgotPasswordRequest): Promise<{ acknowledged: boolean }> {
    const { error } = await supabase.auth.resetPasswordForEmail(body.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new ApiClientError(400, { code: "FORGOT_FAILED", message: error.message });
    return { acknowledged: true };
  },

  async resetPassword(body: ResetPasswordRequest): Promise<{ reset: boolean }> {
    const { error } = await supabase.auth.updateUser({ password: body.password });
    if (error) throw new ApiClientError(400, { code: "RESET_FAILED", message: error.message });
    return { reset: true };
  },

  async verifyEmail(_body: VerifyEmailRequest): Promise<{ verified: boolean }> {
    // Supabase handles email verification via the link flow; nothing to do here.
    return { verified: true };
  },
};
