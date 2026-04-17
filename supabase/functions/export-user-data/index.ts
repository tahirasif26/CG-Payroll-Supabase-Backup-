// export-user-data: GDPR/PDPL personal data export. Returns a JSON bundle of
// every record tied to the requested user. Permitted callers:
//   - the user themselves
//   - admin/hr in the same tenant
//   - super_admin
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.22.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  target_user_id: z.string().uuid().optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Validation failed", details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const targetUserId = parsed.data.target_user_id ?? user.id;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Rate-limit per caller
    const { data: rlOk } = await admin.rpc("check_rate_limit", {
      _key: `user:${user.id}:fn:export-user-data`,
      _max: 5,
      _window_seconds: 300,
    });
    if (rlOk === false) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Permission check
    if (targetUserId !== user.id) {
      const { data: isSuper } = await admin.rpc("is_super_admin", {
        _user_id: user.id,
      });
      if (!isSuper) {
        // Caller must be admin/hr in target's tenant
        const { data: targetEmp } = await admin
          .from("employees")
          .select("client_id")
          .eq("user_id", targetUserId)
          .maybeSingle();
        const { data: callerOk } = await admin.rpc("is_admin_or_hr_in_client", {
          _user_id: user.id,
          _client_id: targetEmp?.client_id,
        });
        if (!callerOk) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Pull employee row (most data joins through it)
    const { data: employee } = await admin
      .from("employees")
      .select("*")
      .eq("user_id", targetUserId)
      .maybeSingle();

    const employeeId = employee?.id;

    const tablesByEmp = [
      "employee_addresses",
      "employee_bank_details",
      "employee_compensation",
      "employee_documents",
      "employee_education",
      "employee_emergency_contacts",
      "expenses",
      "advances",
      "asset_requests",
      "cost_allocations",
    ];

    const sections: Record<string, unknown> = { profile: null, employee, audit_logs: [] };

    const { data: profile } = await admin
      .from("profiles")
      .select("*")
      .eq("id", targetUserId)
      .maybeSingle();
    sections.profile = profile;

    if (employeeId) {
      for (const t of tablesByEmp) {
        const { data } = await admin.from(t as never).select("*").eq("employee_id", employeeId);
        sections[t] = data ?? [];
      }
    }

    const { data: auditLogs } = await admin
      .from("audit_logs")
      .select("*")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false })
      .limit(1000);
    sections.audit_logs = auditLogs ?? [];

    // Audit the export itself
    await admin.from("audit_logs").insert({
      user_id: user.id,
      user_email: user.email ?? null,
      client_id: employee?.client_id ?? null,
      action: "data.export",
      entity_type: "user",
      entity_id: targetUserId,
      entity_label: "Personal data export",
    });

    return new Response(
      JSON.stringify({
        exported_at: new Date().toISOString(),
        target_user_id: targetUserId,
        sections,
      }, null, 2),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="user-data-${targetUserId}.json"`,
        },
      },
    );
  } catch (err) {
    console.error("[export-user-data] error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
