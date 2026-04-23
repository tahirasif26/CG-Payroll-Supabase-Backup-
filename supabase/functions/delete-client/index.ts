import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Tables with a `client_id` column. Order matters: child/dependent tables first.
const TENANT_TABLES = [
  // payroll dependents
  "payroll_lines",
  "payroll_one_off_adjustments",
  "payslips",
  "payroll_setup_components",
  "payroll_setup_tax_rules",
  // loan/advance/expense dependents
  "loan_transactions",
  "expense_approvals", // no client_id but cleaned via expense delete below
  "mileage_entries",
  // leave dependents
  "leave_allocations",
  "leave_balances",
  "leave_requests",
  // asset dependents
  "asset_audit_entries",
  "asset_history",
  "asset_requests",
  "asset_store_items",
  "assets",
  "asset_categories",
  "asset_conditions",
  "asset_locations",
  "asset_audits",
  // performance
  "performance_calibrations",
  "performance_assessments",
  "performance_questionnaires",
  "performance_cycles",
  "assessment_ratings",
  // policies
  "policy_acknowledgements",
  "policy_acknowledgments",
  "company_policies",
  // employee details
  "employee_addresses",
  "employee_bank_details",
  "employee_compensation",
  "employee_documents",
  "employee_education",
  "employee_emergency_contacts",
  // financial / hr
  "advances",
  "expenses",
  "expense_categories",
  "loans",
  "payroll_runs",
  "payroll_setups",
  "tax_configs",
  "cost_allocations",
  "project_team_members",
  "projects",
  "timesheets",
  "separations",
  // org
  "designations",
  "departments",
  "holidays",
  "gl_code_mappings",
  "reminder_log",
  "reminder_settings",
  "notifications",
  "audit_logs",
  // access / config
  "user_approval_role_assignments",
  "approval_roles",
  "feature_toggles",
  "feature_presets",
  "leave_types",
  // employees + roles + profiles last
  "employees",
];

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

    // Verify super_admin
    const { data: roleRow } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Forbidden: super_admin required" }, 403);

    const body = await req.json().catch(() => ({}));
    const clientId: string | undefined = body?.client_id;
    if (!clientId || typeof clientId !== "string") {
      return json({ error: "Missing client_id" }, 400);
    }

    // Confirm client exists
    const { data: clientRow, error: clientErr } = await adminClient
      .from("clients")
      .select("id, company_name")
      .eq("id", clientId)
      .maybeSingle();
    if (clientErr) return json({ error: clientErr.message }, 500);
    if (!clientRow) {
      // Idempotent: already deleted (e.g. duplicate invocation). Return success.
      return json({ success: true, client_id: clientId, already_deleted: true }, 200);
    }

    // 1) Collect all auth user IDs that belong to this client (via user_roles + profiles)
    const userIdSet = new Set<string>();
    const { data: roleUsers } = await adminClient
      .from("user_roles")
      .select("user_id")
      .eq("client_id", clientId);
    (roleUsers ?? []).forEach((r: any) => r.user_id && userIdSet.add(r.user_id));

    const { data: profileUsers } = await adminClient
      .from("profiles")
      .select("id")
      .eq("client_id", clientId);
    (profileUsers ?? []).forEach((p: any) => p.id && userIdSet.add(p.id));

    // Also include employees.user_id (if not already there)
    const { data: empUsers } = await adminClient
      .from("employees")
      .select("user_id")
      .eq("client_id", clientId)
      .not("user_id", "is", null);
    (empUsers ?? []).forEach((e: any) => e.user_id && userIdSet.add(e.user_id));

    // Don't delete the caller (super_admin) even if somehow linked
    userIdSet.delete(user.id);

    // 2) Delete all tenant rows (child → parent order)
    const errors: Array<{ table: string; error: string }> = [];
    for (const table of TENANT_TABLES) {
      const { error } = await adminClient.from(table).delete().eq("client_id", clientId);
      if (error) {
        // Some tables in the list may not have client_id (e.g. expense_approvals) — ignore "column does not exist"
        if (!/column .* does not exist|does not have/i.test(error.message)) {
          console.error(`[delete-client] failed deleting ${table}:`, error.message);
          errors.push({ table, error: error.message });
        }
      }
    }

    // 3) Remove user_roles for this client (separate from generic loop because of unique combinations)
    {
      const { error } = await adminClient.from("user_roles").delete().eq("client_id", clientId);
      if (error) errors.push({ table: "user_roles", error: error.message });
    }

    // 4) Null out / detach profiles for users in this tenant (we delete the auth user next which cascades)
    {
      const ids = Array.from(userIdSet);
      if (ids.length > 0) {
        const { error } = await adminClient.from("profiles").delete().in("id", ids);
        if (error) errors.push({ table: "profiles", error: error.message });
      }
    }

    // 5) Delete the client row itself
    {
      const { error } = await adminClient.from("clients").delete().eq("id", clientId);
      if (error) errors.push({ table: "clients", error: error.message });
    }

    // 6) Delete auth users belonging to this tenant
    let authDeleted = 0;
    for (const uid of userIdSet) {
      const { error } = await adminClient.auth.admin.deleteUser(uid);
      if (error) {
        console.error(`[delete-client] auth.deleteUser ${uid} failed:`, error.message);
      } else {
        authDeleted += 1;
      }
    }

    return json({
      success: true,
      client_id: clientId,
      auth_users_deleted: authDeleted,
      table_errors: errors,
    }, 200);
  } catch (err) {
    console.error("delete-client error:", err);
    return json({ error: err instanceof Error ? err.message : "Internal server error" }, 500);
  }
});
