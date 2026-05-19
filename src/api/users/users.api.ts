import { apiGet, apiPatch } from "../client";
import type { ChangePasswordRequest } from "../auth/auth.types";
import type { CurrentUser, UpdateProfileRequest } from "./users.types";

export interface EffectiveFeatures {
  keys: string[];
  clientId: string | null;
}

export const usersApi = {
  me(): Promise<CurrentUser> {
    return apiGet<CurrentUser>("/users/me");
  },
  updateProfile(body: UpdateProfileRequest): Promise<CurrentUser["profile"]> {
    return apiPatch<CurrentUser["profile"]>("/users/me/profile", body);
  },
  changePassword(body: ChangePasswordRequest): Promise<{ changed: boolean }> {
    return apiPatch<{ changed: boolean }>("/users/me/password", body);
  },
  effectiveFeatures(): Promise<EffectiveFeatures> {
    return apiGet<EffectiveFeatures>("/users/me/effective-features");
  },
};
