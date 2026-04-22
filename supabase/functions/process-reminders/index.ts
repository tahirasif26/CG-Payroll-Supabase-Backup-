// Scheduled reminders processor.
// Runs daily via pg_cron. Scans for upcoming/overdue events and creates
// in-app notifications using existing create_notification RPC.
//
// Categories handled:
//   - document   : employee_documents.expiry_date approaching (30/15/7/0 days)
//   - probation  : employees.probation_end_date approaching (30/7 days)
//   - asset      : assets.warranty_expiry / service_due_date approaching (30/7 days)
//   - loan       : active loans — monthly EMI reminder (5 days before month end)
//   - advance    : advances.settlement_due_date approaching/overdue
//   - policy     : company_policies requires_ack — unacknowledged reminder weekly
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

function daysBetween(a: Date, b: Date) {
  const ms = a.getTime() - b.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

async function alreadySent(key: string): Promise<boolean> {
  const { data } = await supabase
    .from("reminder_log")
    .select("id")
    .eq("reminder_key", key)
    .maybeSingle();
  return !!data;
}

async function logSent(args: {
  key: string;
  category: string;
  client_id: string | null;
  entity_type?: string;
  entity_id?: string;
}) {
  await supabase.from("reminder_log").insert({
    reminder_key: args.key,
    category: args.category,
    client_id: args.client_id,
    entity_type: args.entity_type ?? null,
    entity_id: args.entity_id ?? null,
  });
}

async function notify(opts: {
  user_id: string;
  client_id: string | null;
  title: string;
  body: string;
  category: string;
  severity: "info" | "warning" | "error" | "success";
  entity_type?: string;
  entity_id?: string;
  action_url?: string;
}) {
  await supabase.rpc("create_notification", {
    _recipient_user_id: opts.user_id,
    _title: opts.title,
    _body: opts.body,
    _category: opts.category,
    _severity: opts.severity,
    _entity_type: opts.entity_type ?? null,
    _entity_id: opts.entity_id ?? null,
    _action_url: opts.action_url ?? null,
    _client_id: opts.client_id,
  });
}

async function notifyClientAdmins(opts: {
  client_id: string;
  title: string;
  body: string;
  category: string;
  severity: "info" | "warning" | "error" | "success";
  entity_type?: string;
  entity_id?: string;
  action_url?: string;
}) {
  await supabase.rpc("notify_client_admins", {
    _client_id: opts.client_id,
    _title: opts.title,
    _body: opts.body,
    _category: opts.category,
    _severity: opts.severity,
    _entity_type: opts.entity_type ?? null,
    _entity_id: opts.entity_id ?? null,
    _action_url: opts.action_url ?? null,
  });
}

const today = new Date();
today.setHours(0, 0, 0, 0);

// ---------- 1. DOCUMENT EXPIRY ----------
async function processDocumentExpiry() {
  const { data: docs } = await supabase
    .from("employee_documents")
    .select("id, client_id, employee_id, doc_type, expiry_date, status")
    .not("expiry_date", "is", null)
    .eq("status", "active");

  if (!docs) return 0;
  let count = 0;

  for (const d of docs) {
    const exp = new Date(d.expiry_date as string);
    exp.setHours(0, 0, 0, 0);
    const days = daysBetween(exp, today);

    // Trigger at 30, 15, 7, 0 (expired)
    let bucket: number | null = null;
    if (days === 30) bucket = 30;
    else if (days === 15) bucket = 15;
    else if (days === 7) bucket = 7;
    else if (days <= 0 && days >= -1) bucket = 0;
    if (bucket === null) continue;

    const key = `doc_expiry:${d.id}:${bucket}`;
    if (await alreadySent(key)) continue;

    const { data: emp } = await supabase
      .from("employees")
      .select("user_id, first_name, last_name")
      .eq("id", d.employee_id)
      .maybeSingle();

    const empName = emp ? `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim() : "Employee";
    const expired = bucket === 0;
    const title = expired
      ? `${d.doc_type} expired`
      : `${d.doc_type} expiring in ${bucket} days`;
    const body = expired
      ? `${empName}'s ${d.doc_type} has expired. Please renew immediately.`
      : `${empName}'s ${d.doc_type} expires on ${d.expiry_date}.`;

    // Notify employee
    if (emp?.user_id) {
      await notify({
        user_id: emp.user_id,
        client_id: d.client_id as string,
        title: expired ? `Your ${d.doc_type} expired` : `Your ${d.doc_type} expires soon`,
        body,
        category: "document",
        severity: expired ? "error" : "warning",
        entity_type: "employee_document",
        entity_id: d.id,
        action_url: "/employees",
      });
    }

    // Notify admins
    await notifyClientAdmins({
      client_id: d.client_id as string,
      title,
      body,
      category: "document",
      severity: expired ? "error" : "warning",
      entity_type: "employee_document",
      entity_id: d.id,
      action_url: "/employees",
    });

    await logSent({
      key,
      category: "document",
      client_id: d.client_id as string,
      entity_type: "employee_document",
      entity_id: d.id,
    });
    count++;
  }
  return count;
}

// ---------- 2. PROBATION ENDING ----------
async function processProbation() {
  const { data: emps } = await supabase
    .from("employees")
    .select("id, client_id, user_id, first_name, last_name, probation_end_date, status")
    .not("probation_end_date", "is", null)
    .eq("status", "active");

  if (!emps) return 0;
  let count = 0;
  for (const e of emps) {
    const end = new Date(e.probation_end_date as string);
    end.setHours(0, 0, 0, 0);
    const days = daysBetween(end, today);
    let bucket: number | null = null;
    if (days === 30) bucket = 30;
    else if (days === 7) bucket = 7;
    else if (days === 0) bucket = 0;
    if (bucket === null) continue;

    const key = `probation:${e.id}:${bucket}`;
    if (await alreadySent(key)) continue;

    const empName = `${e.first_name ?? ""} ${e.last_name ?? ""}`.trim() || "Employee";
    const title =
      bucket === 0
        ? `Probation ended: ${empName}`
        : `Probation ending in ${bucket} days: ${empName}`;
    const body = `${empName}'s probation ${bucket === 0 ? "ended" : "ends"} on ${e.probation_end_date}. Please complete the review.`;

    await notifyClientAdmins({
      client_id: e.client_id as string,
      title,
      body,
      category: "probation",
      severity: bucket === 0 ? "warning" : "info",
      entity_type: "employee",
      entity_id: e.id,
      action_url: "/employees",
    });

    if (e.user_id) {
      await notify({
        user_id: e.user_id,
        client_id: e.client_id as string,
        title: bucket === 0 ? "Your probation period has ended" : `Your probation ends in ${bucket} days`,
        body: `Your probation ${bucket === 0 ? "ended" : "ends"} on ${e.probation_end_date}.`,
        category: "probation",
        severity: "info",
        entity_type: "employee",
        entity_id: e.id,
      });
    }

    await logSent({ key, category: "probation", client_id: e.client_id as string, entity_type: "employee", entity_id: e.id });
    count++;
  }
  return count;
}

// ---------- 3. ASSET WARRANTY / SERVICE ----------
async function processAssets() {
  const { data: assets } = await supabase
    .from("assets")
    .select("id, client_id, asset_tag, name, warranty_expiry, service_due_date, employee_id");
  if (!assets) return 0;
  let count = 0;

  for (const a of assets) {
    for (const field of ["warranty_expiry", "service_due_date"] as const) {
      const dateStr = a[field] as string | null;
      if (!dateStr) continue;
      const d = new Date(dateStr);
      d.setHours(0, 0, 0, 0);
      const days = daysBetween(d, today);
      let bucket: number | null = null;
      if (days === 30) bucket = 30;
      else if (days === 7) bucket = 7;
      else if (days === 0) bucket = 0;
      if (bucket === null) continue;

      const tag = field === "warranty_expiry" ? "warranty" : "service";
      const key = `asset_${tag}:${a.id}:${bucket}`;
      if (await alreadySent(key)) continue;

      const label = field === "warranty_expiry" ? "Warranty expires" : "Service due";
      const title =
        bucket === 0 ? `${a.name} (${a.asset_tag}) — ${label} today` : `${a.name} (${a.asset_tag}) — ${label} in ${bucket} days`;
      const body = `Asset ${a.name} [${a.asset_tag}] ${label.toLowerCase()} on ${dateStr}.`;

      await notifyClientAdmins({
        client_id: a.client_id as string,
        title,
        body,
        category: "asset",
        severity: bucket === 0 ? "warning" : "info",
        entity_type: "asset",
        entity_id: a.id,
        action_url: "/assets/inventory",
      });

      await logSent({ key, category: "asset", client_id: a.client_id as string, entity_type: "asset", entity_id: a.id });
      count++;
    }
  }
  return count;
}

// ---------- 4. LOAN EMI MONTHLY REMINDER ----------
async function processLoans() {
  // Send a reminder 5 days before month end for active loans with balance.
  const t = new Date(today);
  const lastDay = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  const dom = t.getDate();
  if (lastDay - dom !== 5) return 0; // only run on that specific day

  const { data: loans } = await supabase
    .from("loans")
    .select("id, client_id, employee_id, monthly_deduction, remaining_balance, status")
    .eq("status", "active")
    .gt("remaining_balance", 0);
  if (!loans) return 0;
  let count = 0;

  const monthKey = `${t.getFullYear()}-${t.getMonth() + 1}`;
  for (const l of loans) {
    const key = `loan_emi:${l.id}:${monthKey}`;
    if (await alreadySent(key)) continue;

    const { data: emp } = await supabase
      .from("employees")
      .select("user_id, first_name, last_name")
      .eq("id", l.employee_id)
      .maybeSingle();

    const emi = (Number(l.monthly_deduction) / 100).toLocaleString();
    const bal = (Number(l.remaining_balance) / 100).toLocaleString();

    if (emp?.user_id) {
      await notify({
        user_id: emp.user_id,
        client_id: l.client_id as string,
        title: "Loan EMI deduction upcoming",
        body: `Your monthly EMI of ${emi} will be deducted in the next payroll. Remaining balance: ${bal}.`,
        category: "loan",
        severity: "info",
        entity_type: "loan",
        entity_id: l.id,
        action_url: "/loans",
      });
    }

    await notifyClientAdmins({
      client_id: l.client_id as string,
      title: "Loan EMI due this month",
      body: `Loan ${l.id.slice(0, 8)} — EMI ${emi} due in next payroll. Balance: ${bal}.`,
      category: "loan",
      severity: "info",
      entity_type: "loan",
      entity_id: l.id,
      action_url: "/loans",
    });

    await logSent({ key, category: "loan", client_id: l.client_id as string, entity_type: "loan", entity_id: l.id });
    count++;
  }
  return count;
}

// ---------- 5. ADVANCE SETTLEMENT DUE ----------
async function processAdvances() {
  const { data: advances } = await supabase
    .from("advances")
    .select("id, client_id, employee_id, advance_name, amount, settlement_due_date, status")
    .in("status", ["approved", "disbursed", "partially_settled"])
    .not("settlement_due_date", "is", null);
  if (!advances) return 0;
  let count = 0;

  for (const a of advances) {
    const due = new Date(a.settlement_due_date as string);
    due.setHours(0, 0, 0, 0);
    const days = daysBetween(due, today);
    let bucket: number | null = null;
    if (days === 7) bucket = 7;
    else if (days === 0) bucket = 0;
    else if (days < 0 && days >= -30 && days % 7 === 0) bucket = days; // weekly overdue ping
    if (bucket === null) continue;

    const key = `advance_due:${a.id}:${bucket}`;
    if (await alreadySent(key)) continue;

    const overdue = bucket < 0;
    const title = overdue
      ? `Advance overdue by ${Math.abs(bucket)} days`
      : bucket === 0
        ? "Advance settlement due today"
        : `Advance settlement in ${bucket} days`;
    const body = `${a.advance_name ?? "Advance"} (amount ${(Number(a.amount) / 100).toLocaleString()}) — settlement due ${a.settlement_due_date}.`;

    const { data: emp } = await supabase
      .from("employees")
      .select("user_id")
      .eq("id", a.employee_id)
      .maybeSingle();
    if (emp?.user_id) {
      await notify({
        user_id: emp.user_id,
        client_id: a.client_id as string,
        title,
        body,
        category: "advance",
        severity: overdue ? "error" : bucket === 0 ? "warning" : "info",
        entity_type: "advance",
        entity_id: a.id,
        action_url: "/advances",
      });
    }
    await notifyClientAdmins({
      client_id: a.client_id as string,
      title,
      body,
      category: "advance",
      severity: overdue ? "error" : "warning",
      entity_type: "advance",
      entity_id: a.id,
      action_url: "/advances",
    });

    await logSent({ key, category: "advance", client_id: a.client_id as string, entity_type: "advance", entity_id: a.id });
    count++;
  }
  return count;
}

// ---------- 6. POLICY ACKNOWLEDGMENT ----------
async function processPolicyAcks() {
  // Weekly nudge (every Monday) for unacknowledged active policies that require ack.
  if (today.getDay() !== 1) return 0;

  const { data: policies } = await supabase
    .from("company_policies")
    .select("id, client_id, title, status, requires_ack")
    .eq("status", "active")
    .eq("requires_ack", true);
  if (!policies) return 0;
  let count = 0;

  const weekKey = `${today.getFullYear()}-W${Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / (7 * 86400000))}`;

  for (const p of policies) {
    // Get all active employees in client with user_id
    const { data: emps } = await supabase
      .from("employees")
      .select("id, user_id")
      .eq("client_id", p.client_id as string)
      .eq("status", "active")
      .not("user_id", "is", null);
    if (!emps) continue;

    // Get acks for this policy
    const { data: acks } = await supabase
      .from("policy_acknowledgments")
      .select("employee_id")
      .eq("policy_id", p.id);
    const ackedSet = new Set((acks ?? []).map((a) => a.employee_id));

    for (const e of emps) {
      if (ackedSet.has(e.id)) continue;
      const key = `policy_ack:${p.id}:${e.id}:${weekKey}`;
      if (await alreadySent(key)) continue;

      await notify({
        user_id: e.user_id as string,
        client_id: p.client_id as string,
        title: "Policy acknowledgment pending",
        body: `Please review and acknowledge the policy: "${p.title}".`,
        category: "policy",
        severity: "warning",
        entity_type: "company_policy",
        entity_id: p.id,
        action_url: "/policies",
      });
      await logSent({ key, category: "policy", client_id: p.client_id as string, entity_type: "company_policy", entity_id: p.id });
      count++;
    }
  }
  return count;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const results = {
      documents: await processDocumentExpiry(),
      probation: await processProbation(),
      assets: await processAssets(),
      loans: await processLoans(),
      advances: await processAdvances(),
      policies: await processPolicyAcks(),
    };
    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[process-reminders] error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
