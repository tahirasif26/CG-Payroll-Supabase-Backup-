import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "./auth.api";
import type {
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  LogoutRequest,
  RegisterRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
} from "./auth.types";

export const authKeys = {
  all: ["auth"] as const,
  session: () => [...authKeys.all, "session"] as const,
};

/**
 * useLogin / useRegister persist tokens via the API client, then invalidate
 * `users.me` so consumers refetch the authenticated profile.
 */

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LoginRequest) => authApi.login(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users", "me"] });
    },
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RegisterRequest) => authApi.register(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users", "me"] });
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LogoutRequest = {}) => authApi.logout(body),
    onSettled: () => {
      // Clear React Query cache so stale authed data isn't visible after sign-out.
      qc.clear();
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (body: ForgotPasswordRequest) => authApi.forgotPassword(body),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (body: ResetPasswordRequest) => authApi.resetPassword(body),
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (body: VerifyEmailRequest) => authApi.verifyEmail(body),
  });
}

/**
 * Mutation wrapper around POST /users/me/password (lives in the users module
 * on the backend but conceptually belongs in auth from the FE caller's view).
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: async (body: ChangePasswordRequest) => {
      const { usersApi } = await import("../users/users.api");
      return usersApi.changePassword(body);
    },
  });
}
