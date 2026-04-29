import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Caller can provide either an explicit email or a user_id (we'll resolve it).
const BodySchema = z.object({
  email: z.string().trim().email().max(255).optional(),
  user_id: z.string().uuid().optional(),
  client_id: z.string().uuid(),
}).refine((v) => !!v.email || !!v.user_id, {
  message: "Either email or user_id is required",
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

    // Rate limit (max 20 resends per minute per caller)
    const { data: rlOk } = await adminClient.rpc("check_rate_limit", {
      _key: `user:${user.id}:fn:resend-invite`,
      _max: 20,
      _window_seconds: 60,
    });
    if (rlOk === false) return json({ error: "Too many resends, please wait a moment" }, 429);

    // Caller authorization: must be super_admin OR admin/hr in the same client
    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role, client_id")
      .eq("user_id", user.id);
    if (!callerRoles?.length) return json({ error: "Forbidden" }, 403);

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
    }
    const { email: emailIn, user_id: userIdIn, client_id } = parsed.data;

    const isSuperAdmin = callerRoles.some((r) => r.role === "super_admin");
    if (!isSuperAdmin) {
      const adminRow = callerRoles.find((r) => (r.role === "admin" || r.role === "hr") && r.client_id === client_id);
      if (!adminRow) return json({ error: "Forbidden: cannot resend invites for another company" }, 403);
    }

    // Resolve target email
    let targetEmail = emailIn?.toLowerCase() ?? null;
    let targetUserId = userIdIn ?? null;

    if (!targetEmail && targetUserId) {
      const { data: u, error: gErr } = await adminClient.auth.admin.getUserById(targetUserId);
      if (gErr || !u?.user?.email) return json({ error: "User not found" }, 404);
      targetEmail = u.user.email.toLowerCase();
    }

    if (!targetEmail) return json({ error: "Could not resolve target email" }, 400);

    // If user already confirmed (signed in at least once) — block resend
    if (targetUserId) {
      const { data: existing } = await adminClient.auth.admin.getUserById(targetUserId);
      if (existing?.user?.last_sign_in_at) {
        return json({ error: "User already verified — no need to resend invite", verified: true }, 409);
      }
    } else {
      // Look up by email
      const { data: list } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = list?.users?.find((u) => u.email?.toLowerCase() === targetEmail);
      if (existing?.last_sign_in_at) {
        return json({ error: "User already verified — no need to resend invite", verified: true }, 409);
      }
      targetUserId = existing?.id ?? null;
    }

    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "";

    // Re-issue the invite. Supabase will send a fresh magic link.
    const { error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(targetEmail, {
      redirectTo: `${origin}/reset-password`,
    });
    if (inviteErr) {
      // If user exists but invite says "already registered", generate a recovery link instead
      const msg = inviteErr.message?.toLowerCase() ?? "";
      if (msg.includes("already") && targetUserId) {
        const { error: linkErr } = await adminClient.auth.admin.generateLink({
          type: "recovery",
          email: targetEmail,
          options: { redirectTo: `${origin}/reset-password` },
        });
        if (linkErr) return json({ error: linkErr.message }, 400);
      } else {
        return json({ error: inviteErr.message }, 400);
      }
    }

    return json({ success: true, email: targetEmail }, 200);
  } catch (err) {
    console.error("resend-invite error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
