import { supabase } from "@/integrations/supabase/client";
import { ApiClientError } from "../errors";
import type { ChangePasswordRequest } from "../auth/auth.types";
import type { CurrentUser, UpdateProfileRequest } from "./users.types";

export interface EffectiveFeatures {
  keys: string[];
  clientId: string | null;
}

function capRole(role: string): string {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function loadMe(): Promise<CurrentUser> {
  const { data: auth } = await supabase.auth.getUser();
  const u = auth.user;
  if (!u) throw new ApiClientError(401, { code: "NO_USER", message: "Not signed in" });

  const [{ data: profile }, { data: userRoles }, { data: clientIdRpc }] = await Promise.all([
    supabase.from("profiles").select("full_name, avatar_url, phone").eq("id", u.id).maybeSingle(),
    supabase.from("user_roles").select("id, role, client_id").eq("user_id", u.id),
    supabase.rpc("get_user_client_id", { _user_id: u.id }),
  ]);

  const primaryClientId = (clientIdRpc as string | null) ?? null;

  // Pull client names for the bindings we have.
  const clientIds = Array.from(
    new Set((userRoles ?? []).map((r) => r.client_id).filter((id): id is string => !!id)),
  );
  let clientsById: Record<string, { id: string; company_name: string; company_slug: string }> = {};
  if (clientIds.length) {
    const { data: clients } = await supabase
      .from("clients")
      .select("id, company_name, company_slug")
      .in("id", clientIds);
    clientsById = Object.fromEntries((clients ?? []).map((c) => [c.id, c]));
  }

  // Load employee row for primary client.
  let employee: CurrentUser["employee"] = null;
  if (primaryClientId) {
    const { data: empRow } = await supabase
      .from("employees")
      .select("id, client_id, emp_id, first_name, last_name, department, designation, status")
      .eq("user_id", u.id)
      .eq("client_id", primaryClientId)
      .maybeSingle();
    if (empRow) {
      employee = {
        id: empRow.id,
        clientId: empRow.client_id,
        empId: empRow.emp_id ?? "",
        firstName: empRow.first_name ?? "",
        lastName: empRow.last_name ?? "",
        department: empRow.department ?? null,
        designation: empRow.designation ?? null,
        status: empRow.status ?? "active",
      };
    }
  }

  return {
    id: u.id,
    email: u.email ?? "",
    emailVerifiedAt: u.email_confirmed_at ?? null,
    status: "active",
    lastLoginAt: u.last_sign_in_at ?? null,
    primaryClientId,
    profile: {
      userId: u.id,
      fullName: profile?.full_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      phone: profile?.phone ?? null,
    },
    userRoles: (userRoles ?? []).map((r) => ({
      id: r.id,
      roleId: r.id,
      clientId: r.client_id,
      role: { id: r.id, name: capRole(r.role), appRole: r.role as CurrentUser["userRoles"][number]["role"]["appRole"] },
      client: r.client_id && clientsById[r.client_id]
        ? {
            id: clientsById[r.client_id].id,
            companyName: clientsById[r.client_id].company_name,
            companySlug: clientsById[r.client_id].company_slug,
          }
        : null,
    })),
    employee,
  };
}

async function loadFeatures(): Promise<EffectiveFeatures> {
  const { data: auth } = await supabase.auth.getUser();
  const u = auth.user;
  if (!u) return { keys: [], clientId: null };
  const [{ data: feats }, { data: clientIdRpc }] = await Promise.all([
    supabase.rpc("get_user_features", { _user_id: u.id }),
    supabase.rpc("get_user_client_id", { _user_id: u.id }),
  ]);
  const keys = ((feats as { feature_key: string; enabled: boolean }[] | null) ?? [])
    .filter((f) => f.enabled)
    .map((f) => f.feature_key);
  return { keys, clientId: (clientIdRpc as string | null) ?? null };
}

export const usersApi = {
  me(): Promise<CurrentUser> {
    return loadMe();
  },
  async updateProfile(body: UpdateProfileRequest): Promise<CurrentUser["profile"]> {
    const { data: auth } = await supabase.auth.getUser();
    const u = auth.user;
    if (!u) throw new ApiClientError(401, { code: "NO_USER", message: "Not signed in" });
    const patch: Record<string, unknown> = {};
    if (body.fullName !== undefined) patch.full_name = body.fullName;
    if (body.avatarUrl !== undefined) patch.avatar_url = body.avatarUrl;
    if (body.phone !== undefined) patch.phone = body.phone;
    const { data, error } = await supabase
      .from("profiles")
      .update(patch as never)
      .eq("id", u.id)
      .select("full_name, avatar_url, phone")
      .maybeSingle();
    if (error) throw new ApiClientError(400, { code: "UPDATE_FAILED", message: error.message });
    return {
      userId: u.id,
      fullName: data?.full_name ?? null,
      avatarUrl: data?.avatar_url ?? null,
      phone: data?.phone ?? null,
    };
  },
  async changePassword(body: ChangePasswordRequest): Promise<{ changed: boolean }> {
    const { error } = await supabase.auth.updateUser({ password: body.newPassword });
    if (error) throw new ApiClientError(400, { code: "CHANGE_PW_FAILED", message: error.message });
    return { changed: true };
  },
  effectiveFeatures(): Promise<EffectiveFeatures> {
    return loadFeatures();
  },
};
