import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  user_id: z.string().uuid(),
  feature_key: z.string().trim().min(1).max(100),
  is_enabled: z.boolean(),
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
      _key: `user:${user.id}:fn:set-feature-toggle`,
      _max: 100,
      _window_seconds: 60,
    });
    if (rlOk === false) return json({ error: "Rate limit exceeded" }, 429);

    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role, client_id")
      .eq("user_id", user.id);
    if (!callerRoles?.length) return json({ error: "Forbidden" }, 403);

    const isSuperAdmin = callerRoles.some((r) => r.role === "super_admin");
    const privileged = callerRoles.find((r) => r.role === "admin" || r.role === "hr");
    if (!isSuperAdmin && !privileged) return json({ error: "Forbidden: admin or hr required" }, 403);

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, 400);
    }
    const { user_id, feature_key, is_enabled } = parsed.data;

    // Get target user's client_id
    const { data: targetRoles } = await adminClient
      .from("user_roles")
      .select("client_id")
      .eq("user_id", user_id)
      .in("role", ["admin", "hr", "employee"])
      .limit(1);
    const targetClientId = targetRoles?.[0]?.client_id;
    if (!targetClientId) return json({ error: "Target user has no client" }, 404);

    if (!isSuperAdmin && privileged?.client_id !== targetClientId) {
      return json({ error: "Forbidden: cross-tenant access denied" }, 403);
    }

    // Verify feature_key exists
    const { data: featureDef } = await adminClient
      .from("feature_definitions")
      .select("feature_key")
      .eq("feature_key", feature_key)
      .maybeSingle();
    if (!featureDef) return json({ error: "Unknown feature_key" }, 404);

    const { error: upsertErr } = await adminClient
      .from("feature_toggles")
      .upsert(
        {
          client_id: targetClientId,
          user_id,
          feature_key,
          is_enabled,
          enabled_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "client_id,user_id,feature_key" },
      );
    if (upsertErr) return json({ error: upsertErr.message }, 500);

    return json({ success: true });
  } catch (err) {
    console.error("set-feature-toggle error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
