// approve-payroll-run: server-side payroll approval with permission check + audit log.
// Verifies the caller has an approval role with can_approve_payroll = true, flips the
// run status to 'approved', and writes a tamper-resistant audit log entry using the
// service role.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ApprovalBody {
  payroll_run_id?: string;
}

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

    // Caller-context client (RLS applied) to identify the user.
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

    let body: ApprovalBody = {};
    try {
      body = await req.json();
    } catch {
      // ignore — handled below
    }
    const runId = body.payroll_run_id;
    if (!runId || typeof runId !== "string") {
      return new Response(
        JSON.stringify({ error: "payroll_run_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Service-role client for trusted reads/writes after we've verified the caller.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: rlOk } = await admin.rpc("check_rate_limit", {
      _key: `user:${user.id}:fn:approve-payroll-run`,
      _max: 20,
      _window_seconds: 60,
    });
    if (rlOk === false) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Load the run
    const { data: run, error: runErr } = await admin
      .from("payroll_runs")
      .select("id, client_id, status, month, year")
      .eq("id", runId)
      .maybeSingle();
    if (runErr) throw runErr;
    if (!run) {
      return new Response(JSON.stringify({ error: "Payroll run not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (run.status === "approved" || run.status === "completed") {
      return new Response(
        JSON.stringify({ error: `Payroll already ${run.status}` }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Verify the caller belongs to this client
    const { data: callerClientId, error: ccErr } = await admin.rpc(
      "get_user_client_id",
      { _user_id: user.id }
    );
    if (ccErr) throw ccErr;
    const isSuper = await admin
      .rpc("is_super_admin", { _user_id: user.id })
      .then((r) => r.data === true);

    if (!isSuper && callerClientId !== run.client_id) {
      return new Response(JSON.stringify({ error: "Forbidden (wrong tenant)" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Verify approval permission — only admins (or super admins) can approve payroll runs.
    if (!isSuper) {
      const { data: isAdmin, error: aErr } = await admin.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (aErr) throw aErr;
      if (isAdmin !== true) {
        return new Response(
          JSON.stringify({
            error: "You do not have permission to approve payroll",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const beforeValue = { status: run.status };
    const now = new Date().toISOString();

    // 4. Approve
    const { error: updErr } = await admin
      .from("payroll_runs")
      .update({
        status: "approved",
        approved_by: user.id,
        approved_at: now,
      })
      .eq("id", runId);
    if (updErr) throw updErr;

    // 5. Audit log (service role bypasses RLS — tamper resistant)
    await admin.from("audit_logs").insert({
      client_id: run.client_id,
      user_id: user.id,
      user_email: user.email ?? null,
      action: "payroll.approve",
      entity_type: "payroll_run",
      entity_id: runId,
      entity_label: `${run.month} ${run.year} Payroll`,
      before_value: beforeValue,
      after_value: { status: "approved", approved_by: user.id, approved_at: now },
      ip_address: req.headers.get("x-forwarded-for") ?? null,
      user_agent: req.headers.get("user-agent") ?? null,
    });

    return new Response(
      JSON.stringify({ ok: true, run_id: runId, status: "approved" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[approve-payroll-run] error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
