import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  company_name: z.string().trim().min(2).max(200),
  company_email: z.string().trim().email().max(255),
  company_phone: z.string().trim().max(50).optional(),
  country: z.string().trim().min(2).max(100),
  timezone: z.string().trim().max(100).optional().default("Asia/Riyadh"),
  base_currency: z.string().trim().min(3).max(10).optional().default("SAR"),
  subscription_plan: z.enum(["starter", "pro", "enterprise"]).optional().default("starter"),
  status: z.enum(["trial", "active"]).optional().default("trial"),
  admin_full_name: z.string().trim().min(2).max(200),
  admin_email: z.string().trim().email().max(255),
  enabled_modules: z.array(z.string().trim().min(1).max(64)).max(64).optional().default([]),
});

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

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
      _key: `user:${user.id}:fn:create-client`,
      _max: 5,
      _window_seconds: 60,
    });
    if (rlOk === false) return json({ error: "Rate limit exceeded" }, 429);

    // Verify super_admin
    const { data: roleRow } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Forbidden: super_admin required" }, 403);

    // Validate body
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, 400);
    }
    const input = parsed.data;

    // Check admin_email doesn't already exist
    const { data: existingUsers } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (existingUsers?.users?.some((u) => u.email?.toLowerCase() === input.admin_email.toLowerCase())) {
      return json({ error: "Admin email already registered" }, 409);
    }

    // Generate unique slug
    const baseSlug = slugify(input.company_name);
    let slug = baseSlug;
    let suffix = 0;
    while (true) {
      const { data: hit } = await adminClient
        .from("clients")
        .select("id")
        .eq("company_slug", slug)
        .maybeSingle();
      if (!hit) break;
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    // Create client
    const { data: clientRow, error: clientErr } = await adminClient
      .from("clients")
      .insert({
        company_name: input.company_name,
        company_slug: slug,
        company_email: input.company_email,
        company_phone: input.company_phone ?? null,
        country: input.country,
        timezone: input.timezone,
        base_currency: input.base_currency,
        subscription_plan: input.subscription_plan,
        status: input.status,
        enabled_modules: input.enabled_modules ?? [],
        created_by: user.id,
      })
      .select()
      .single();
    if (clientErr || !clientRow) return json({ error: clientErr?.message || "Failed to create client" }, 500);

    const clientId = clientRow.id;
    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "";

    // Seed per-client defaults (best-effort; failures are logged but don't block client creation).
    // approval_roles + default feature_preset are seeded automatically by DB triggers.
    try {
      await Promise.all([
        adminClient.from("leave_types").insert([
          { client_id: clientId, name: "Annual Leave", code: "AL", days_per_year: 21, accrual_type: "yearly", max_carryforward: 10, requires_approval: true, is_active: true },
          { client_id: clientId, name: "Sick Leave", code: "SL", days_per_year: 10, accrual_type: "yearly", max_carryforward: 0, requires_approval: false, is_active: true },
          { client_id: clientId, name: "Compassionate Leave", code: "CL", days_per_year: 5, accrual_type: "yearly", max_carryforward: 0, requires_approval: true, is_active: true },
          { client_id: clientId, name: "Unpaid Leave", code: "UL", days_per_year: 0, accrual_type: "none", max_carryforward: 0, requires_approval: true, is_active: true },
        ]),
        adminClient.from("asset_categories").insert([
          { client_id: clientId, name: "Laptops", description: "Portable computers", status: "active" },
          { client_id: clientId, name: "Monitors", description: "Desktop displays", status: "active" },
          { client_id: clientId, name: "Mobile Phones", description: "Company phones", status: "active" },
          { client_id: clientId, name: "Accessories", description: "Keyboards, mice, headsets", status: "active" },
        ]),
        adminClient.from("asset_conditions").insert([
          { client_id: clientId, name: "New", status: "active" },
          { client_id: clientId, name: "Good", status: "active" },
          { client_id: clientId, name: "Used", status: "active" },
          { client_id: clientId, name: "Damaged", status: "active" },
          { client_id: clientId, name: "Under Maintenance", status: "active" },
        ]),
        adminClient.from("expense_categories").insert([
          { client_id: clientId, name: "Travel", code: "TRAVEL", is_active: true },
          { client_id: clientId, name: "Meals", code: "MEALS", is_active: true },
          { client_id: clientId, name: "Office Supplies", code: "OFFICE", is_active: true },
          { client_id: clientId, name: "Software", code: "SW", is_active: true },
          { client_id: clientId, name: "Training", code: "TRAIN", is_active: true },
          { client_id: clientId, name: "Other", code: "OTHER", is_active: true },
        ]),
      ]);
    } catch (seedErr) {
      console.error("create-client seed defaults error (non-fatal):", seedErr);
    }

    // Invite admin
    const { data: invite, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(input.admin_email, {
      redirectTo: `${origin}/reset-password`,
      data: { full_name: input.admin_full_name, client_id: clientId, role: "admin" },
    });

    if (inviteErr || !invite?.user) {
      // Don't rollback — client is saved, admin can be re-invited
      return json({
        success: true,
        client_id: clientId,
        admin_user_id: null,
        warning: `Client created but invite failed: ${inviteErr?.message ?? "unknown"}`,
      }, 207);
    }

    const adminUserId = invite.user.id;

    await adminClient.from("user_roles").insert({
      user_id: adminUserId,
      role: "admin",
      client_id: clientId,
    });

    await adminClient
      .from("profiles")
      .update({ client_id: clientId, full_name: input.admin_full_name })
      .eq("id", adminUserId);

    return json({
      success: true,
      client_id: clientId,
      admin_user_id: adminUserId,
      message: "Client created and invitation sent",
    }, 201);
  } catch (err) {
    console.error("create-client error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
