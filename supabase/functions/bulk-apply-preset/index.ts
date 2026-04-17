// bulk-apply-preset: apply a feature preset's toggles to multiple users at once.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  preset_id: z.string().uuid(),
  user_ids: z.array(z.string().uuid()).min(1).max(500),
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

    // Rate limit: 20/min per user
    const { data: allowed } = await adminClient.rpc("check_rate_limit", {
      _key: `user:${user.id}:fn:bulk-apply-preset`,
      _max: 20,
      _window_seconds: 60,
    });
    if (allowed === false) return json({ error: "Rate limit exceeded" }, 429);

    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role, client_id")
      .eq("user_id", user.id);
    if (!callerRoles?.length) return json({ error: "Forbidden" }, 403);

    const isSuperAdmin = callerRoles.some((r) => r.role === "super_admin");
    const privileged = callerRoles.find((r) => r.role === "admin" || r.role === "hr");
    if (!isSuperAdmin && !privileged) {
      return json({ error: "Forbidden: admin or hr required" }, 403);
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, 400);
    }
    const { preset_id, user_ids } = parsed.data;

    // Load preset
    const { data: preset, error: presetErr } = await adminClient
      .from("feature_presets")
      .select("id, client_id, name, toggles")
      .eq("id", preset_id)
      .maybeSingle();
    if (presetErr || !preset) return json({ error: "Preset not found" }, 404);

    if (!isSuperAdmin && privileged?.client_id !== preset.client_id) {
      return json({ error: "Forbidden: cross-tenant preset" }, 403);
    }

    // Verify all target users belong to the same client
    const { data: targetRoles } = await adminClient
      .from("user_roles")
      .select("user_id, client_id")
      .in("user_id", user_ids)
      .in("role", ["admin", "hr", "employee"]);

    const targets = (targetRoles ?? []).filter((r) => r.client_id === preset.client_id);
    if (targets.length === 0) return json({ error: "No valid target users in client" }, 404);

    const toggles = preset.toggles as Record<string, boolean>;
    const featureKeys = Object.keys(toggles);
    if (featureKeys.length === 0) return json({ success: true, updated_count: 0 });

    const now = new Date().toISOString();
    const rows = targets.flatMap((t) =>
      featureKeys.map((key) => ({
        client_id: preset.client_id,
        user_id: t.user_id,
        feature_key: key,
        is_enabled: !!toggles[key],
        enabled_by: user.id,
        updated_at: now,
      })),
    );

    const { error: upsertErr } = await adminClient
      .from("feature_toggles")
      .upsert(rows, { onConflict: "client_id,user_id,feature_key" });
    if (upsertErr) return json({ error: upsertErr.message }, 500);

    // Audit
    await adminClient.from("audit_logs").insert({
      client_id: preset.client_id,
      user_id: user.id,
      user_email: user.email ?? null,
      action: "feature_preset.bulk_apply",
      entity_type: "feature_preset",
      entity_id: preset.id,
      entity_label: preset.name,
      after_value: { applied_to: targets.length, toggles_count: featureKeys.length },
    });

    return json({ success: true, updated_count: targets.length, toggles_applied: featureKeys.length });
  } catch (err) {
    console.error("bulk-apply-preset error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
