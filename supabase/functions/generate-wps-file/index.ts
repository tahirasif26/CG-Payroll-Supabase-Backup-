// generate-wps-file: produces a Saudi Arabia (SAMA) Wage Protection System
// SIF (CSV) file for a given completed payroll run. Returns the CSV body as a
// downloadable text response. Permission: admin/hr in the payroll run's tenant.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.22.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  payroll_run_id: z.string().uuid(),
});

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function toRow(values: unknown[]): string {
  return values.map(csvEscape).join(",");
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
    const { payroll_run_id } = parsed.data;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Rate-limit
    const { data: rlOk } = await admin.rpc("check_rate_limit", {
      _key: `user:${user.id}:fn:generate-wps-file`,
      _max: 20,
      _window_seconds: 60,
    });
    if (rlOk === false) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load run
    const { data: run, error: runErr } = await admin
      .from("payroll_runs")
      .select("id, client_id, status, month, year")
      .eq("id", payroll_run_id)
      .maybeSingle();
    if (runErr) throw runErr;
    if (!run) {
      return new Response(JSON.stringify({ error: "Payroll run not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tenant check
    const { data: callerClientId } = await admin.rpc("get_user_client_id", {
      _user_id: user.id,
    });
    const { data: isSuper } = await admin.rpc("is_super_admin", {
      _user_id: user.id,
    });
    if (!isSuper && callerClientId !== run.client_id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pull payroll lines + employee bank details
    const { data: lines, error: linesErr } = await admin
      .from("payroll_lines")
      .select(
        "employee_id, basic, allowances, total_deductions, net_pay, pay_currency, employees!inner(emp_id, first_name, last_name)"
      )
      .eq("payroll_run_id", payroll_run_id);
    if (linesErr) throw linesErr;

    const employeeIds = (lines ?? []).map((l: { employee_id: string }) => l.employee_id);
    const { data: banks } = await admin
      .from("employee_bank_details")
      .select("employee_id, iban, bank_name, swift_code, beneficiary_name")
      .in("employee_id", employeeIds.length ? employeeIds : ["00000000-0000-0000-0000-000000000000"]);

    const bankByEmp = new Map<string, { iban?: string | null; bank_name?: string | null; swift_code?: string | null; beneficiary_name?: string | null }>();
    (banks ?? []).forEach((b) => bankByEmp.set(b.employee_id as string, b));

    // Load client (employer) for header record
    const { data: client } = await admin
      .from("clients")
      .select("id, company_name, base_currency")
      .eq("id", run.client_id)
      .maybeSingle();

    const period = `${run.year}${String(run.month).padStart(2, "0")}`;
    const totalSalaries = (lines ?? []).reduce(
      (sum: bigint, l: { net_pay: number | string }) => sum + BigInt(l.net_pay ?? 0),
      0n,
    );

    // Build SIF (simplified SAMA WPS layout — extend per bank's exact spec)
    const rows: string[] = [];
    rows.push(toRow([
      "EMPLOYER",
      client?.company_name ?? "",
      run.client_id,
      period,
      (lines ?? []).length,
      totalSalaries.toString(),
      client?.base_currency ?? "SAR",
    ]));

    for (const line of lines ?? []) {
      const emp = (line as unknown as { employees: { emp_id: string; first_name: string; last_name: string } }).employees;
      const bank = bankByEmp.get((line as { employee_id: string }).employee_id);
      rows.push(toRow([
        "EMPLOYEE",
        emp.emp_id,
        `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim(),
        bank?.iban ?? "",
        bank?.bank_name ?? "",
        bank?.swift_code ?? "",
        BigInt((line as { basic: number | string }).basic ?? 0).toString(),
        BigInt((line as { allowances: number | string }).allowances ?? 0).toString(),
        BigInt((line as { total_deductions: number | string }).total_deductions ?? 0).toString(),
        BigInt((line as { net_pay: number | string }).net_pay ?? 0).toString(),
        (line as { pay_currency: string }).pay_currency ?? client?.base_currency ?? "SAR",
      ]));
    }

    rows.push(toRow(["TRAILER", (lines ?? []).length, totalSalaries.toString()]));

    const csv = rows.join("\n") + "\n";

    // Audit
    await admin.from("audit_logs").insert({
      client_id: run.client_id,
      user_id: user.id,
      user_email: user.email ?? null,
      action: "payroll.wps_export",
      entity_type: "payroll_run",
      entity_id: payroll_run_id,
      entity_label: `${run.month} ${run.year} WPS Export`,
      after_value: { line_count: (lines ?? []).length },
    });

    return new Response(csv, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="wps-${period}.csv"`,
      },
    });
  } catch (err) {
    console.error("[generate-wps-file] error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
