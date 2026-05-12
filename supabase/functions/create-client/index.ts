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
  enabled_features: z.array(z.string().trim().min(1).max(128)).max(256).optional().default([]),
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

    // Check admin_email doesn't already exist (paginate through all users)
    console.log("[create-client] checking admin email:", input.admin_email);
    const targetEmail = input.admin_email.toLowerCase();
    let page = 1;
    let emailExists = false;
    while (true) {
      const { data: pageData, error: listErr } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
      if (listErr) {
        console.error("[create-client] listUsers error:", listErr);
        return json({ error: `Failed to verify admin email: ${listErr.message}` }, 500);
      }
      const users = pageData?.users ?? [];
      if (users.some((u) => u.email?.toLowerCase() === targetEmail)) {
        emailExists = true;
        break;
      }
      if (users.length < 1000) break;
      page += 1;
      if (page > 20) break; // hard cap
    }
    if (emailExists) {
      return json({ error: `Admin email "${input.admin_email}" is already registered. Use a different email.` }, 409);
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
        enabled_features:
          Array.isArray(input.enabled_features) && input.enabled_features.length > 0
            ? input.enabled_features
            : null,
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
        adminClient.from("asset_locations").insert([
          { client_id: clientId, name: "Head Office", status: "active" },
          { client_id: clientId, name: "Warehouse", status: "active" },
          { client_id: clientId, name: "Branch Office", status: "active" },
          { client_id: clientId, name: "Remote", status: "active" },
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

    // Also create an employees row for the admin so their "My Dashboard" tab works.
    try {
      const nameParts = input.admin_full_name.trim().split(/\s+/);
      const firstName = nameParts[0] || "Admin";
      const lastName = nameParts.slice(1).join(" ") || "User";

      const { data: adminEmpId } = await adminClient.rpc("generate_next_emp_id", { _client_id: clientId });

      await adminClient.from("employees").insert({
        client_id: clientId,
        user_id: adminUserId,
        emp_id: adminEmpId ?? `ADM-001`,
        first_name: firstName,
        last_name: lastName,
        email: input.admin_email.toLowerCase().trim(),
        status: "active",
        joining_date: new Date().toISOString().slice(0, 10),
      });

      // Link the new admin employee to the seeded "Admin" role
      try {
        const { data: adminRole } = await adminClient
          .from("roles")
          .select("id")
          .eq("client_id", clientId)
          .eq("name", "Admin")
          .maybeSingle();
        if (adminRole?.id) {
          await adminClient
            .from("employees")
            .update({ role_id: adminRole.id })
            .eq("client_id", clientId)
            .eq("user_id", adminUserId);
        }
      } catch (roleErr) {
        console.error("[create-client] failed to assign Admin role to employee (non-fatal):", roleErr);
      }
    } catch (empErr) {
      console.error("[create-client] failed to seed admin employee row (non-fatal):", empErr);
    }

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
