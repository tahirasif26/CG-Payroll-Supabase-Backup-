import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  // The auth user_id of the employee who should become the new admin.
  new_admin_user_id: z.string().uuid(),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: rlOk } = await adminClient.rpc("check_rate_limit", {
      _key: `user:${user.id}:fn:transfer-admin`,
      _max: 10,
      _window_seconds: 300,
    });
    if (rlOk === false) return json({ error: "Rate limit exceeded" }, 429);

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, 400);
    }
    const { new_admin_user_id } = parsed.data;

    // Caller must be super_admin OR the current admin of the same client as the target.
    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role, client_id")
      .eq("user_id", user.id);

    const isSuperAdmin = callerRoles?.some((r) => r.role === "super_admin") ?? false;
    const callerAdminRow = callerRoles?.find((r) => r.role === "admin");

    // Look up target's current role row(s) to find their client.
    const { data: targetRoles } = await adminClient
      .from("user_roles")
      .select("role, client_id")
      .eq("user_id", new_admin_user_id);

    const targetClientId =
      targetRoles?.find((r) => r.client_id)?.client_id ?? null;
    if (!targetClientId) {
      return json({ error: "Target user is not a member of any client" }, 400);
    }

    if (!isSuperAdmin) {
      if (!callerAdminRow || callerAdminRow.client_id !== targetClientId) {
        return json({ error: "Forbidden: only the current admin of this client can transfer admin" }, 403);
      }
    }

    // Promote the target to admin in their client.
    // The DB trigger `enforce_single_admin_per_client` automatically demotes
    // any existing admin in the same client to 'employee'.
    // First: delete any existing role rows for this user in this client to keep
    //   user_roles tidy (one canonical row per user/client).
    await adminClient
      .from("user_roles")
      .delete()
      .eq("user_id", new_admin_user_id)
      .eq("client_id", targetClientId);

    const { error: insertErr } = await adminClient
      .from("user_roles")
      .insert({
        user_id: new_admin_user_id,
        role: "admin",
        client_id: targetClientId,
      });

    if (insertErr) return json({ error: insertErr.message }, 500);

    // Audit log
    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      client_id: targetClientId,
      action: "transfer_admin",
      entity_type: "user_role",
      entity_id: new_admin_user_id,
      entity_label: "Admin role transferred",
      after_value: { new_admin_user_id, client_id: targetClientId },
    });

    return json({ success: true, new_admin_user_id, client_id: targetClientId }, 200);
  } catch (err) {
    console.error("transfer-admin error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
