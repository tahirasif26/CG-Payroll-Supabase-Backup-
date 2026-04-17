import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  email: z.string().trim().email().max(255),
  full_name: z.string().trim().min(2).max(200),
  employee_id: z.string().trim().max(50).optional(),
  phone: z.string().trim().max(50).optional(),
  role: z.enum(["admin", "hr", "employee"]),
  client_id: z.string().uuid(),
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

    // Get caller's roles
    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role, client_id")
      .eq("user_id", user.id);
    if (!callerRoles?.length) return json({ error: "Forbidden" }, 403);

    const isSuperAdmin = callerRoles.some((r) => r.role === "super_admin");
    const adminRow = callerRoles.find((r) => r.role === "admin");
    const hrRow = callerRoles.find((r) => r.role === "hr");

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, 400);
    }
    const { email, full_name, employee_id, phone, role, client_id } = parsed.data;

    // Authorization
    if (!isSuperAdmin) {
      const callerClientId = adminRow?.client_id ?? hrRow?.client_id;
      if (!callerClientId || callerClientId !== client_id) {
        return json({ error: "Forbidden: cannot invite into another client" }, 403);
      }
      if (role === "admin" || role === "hr") {
        if (!adminRow) return json({ error: "Forbidden: admin role required to assign admin/hr" }, 403);
      } else if (role === "employee") {
        if (!adminRow && !hrRow) return json({ error: "Forbidden: admin or hr required" }, 403);
      }
    }

    // Verify client exists
    const { data: clientExists } = await adminClient
      .from("clients")
      .select("id")
      .eq("id", client_id)
      .maybeSingle();
    if (!clientExists) return json({ error: "Client not found" }, 404);

    // Check email doesn't exist
    const { data: existingUsers } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (existingUsers?.users?.some((u) => u.email?.toLowerCase() === email.toLowerCase())) {
      return json({ error: "Email already registered" }, 409);
    }

    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "";

    const { data: invite, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${origin}/reset-password`,
      data: { full_name, employee_id: employee_id ?? null, client_id, role },
    });
    if (inviteErr || !invite?.user) return json({ error: inviteErr?.message ?? "Invite failed" }, 400);

    const newUserId = invite.user.id;

    await adminClient.from("user_roles").insert({
      user_id: newUserId,
      role,
      client_id,
    });

    await adminClient
      .from("profiles")
      .update({
        client_id,
        full_name,
        ...(phone ? { phone } : {}),
        ...(employee_id ? { employee_id } : {}),
      })
      .eq("id", newUserId);

    return json({ success: true, user_id: newUserId, client_id, role }, 200);
  } catch (err) {
    console.error("invite-employee error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
