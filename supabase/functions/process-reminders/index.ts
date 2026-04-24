// Scheduled reminders processor — RULE-DRIVEN.
// Reads reminder_rules per client and processes only enabled categories.
// Dedup via reminder_dispatches table.
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

// ---------- Types ----------
type ReminderRule = {
  id: string;
  client_id: string;
  category: string;
  name: string;
  is_enabled: boolean;
  lead_days_before: number[];
  repeat_frequency: "once" | "daily" | "weekly" | "monthly";
  recipients: string[];
  conditions: Record<string, unknown>;
  priority: "info" | "warning" | "urgent";
};

// ---------- Utilities ----------
const today = new Date();
today.setHours(0, 0, 0, 0);

function daysBetween(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

function priorityToSeverity(p: string): "info" | "warning" | "error" | "success" {
  return p === "urgent" ? "error" : p === "warning" ? "warning" : "info";
}

function periodKey(freq: string): string {
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  const d = today.getDate();
  if (freq === "monthly") return `${y}-${m}`;
  if (freq === "weekly") {
    const week = Math.floor((today.getTime() - new Date(y, 0, 1).getTime()) / (7 * 86400000));
    return `${y}-W${week}`;
  }
  if (freq === "daily") return `${y}-${m}-${d}`;
  return "once"; // 'once' uses lead_day in key for natural dedup
}

async function alreadyDispatched(key: string): Promise<boolean> {
  const { data } = await supabase
    .from("reminder_dispatches")
    .select("id")
    .eq("dispatch_key", key)
    .maybeSingle();
  return !!data;
}

async function dispatch(opts: {
  rule: ReminderRule;
  recipientUserId: string;
  entityType: string;
  entityId: string | null;
  leadDay: number;
  title: string;
  body: string;
  actionUrl?: string;
}) {
  const baseKey = `${opts.rule.id}:${opts.entityType}:${opts.entityId ?? "_"}:${opts.recipientUserId}:${opts.leadDay}`;
  const key =
    opts.rule.repeat_frequency === "once"
      ? baseKey
      : `${baseKey}:${periodKey(opts.rule.repeat_frequency)}`;

  if (await alreadyDispatched(key)) return false;

  const { data: notif } = await supabase
    .rpc("create_notification", {
      _recipient_user_id: opts.recipientUserId,
      _title: opts.title,
      _body: opts.body,
      _category: opts.rule.category,
      _severity: priorityToSeverity(opts.rule.priority),
      _entity_type: opts.entityType,
      _entity_id: opts.entityId,
      _action_url: opts.actionUrl ?? null,
      _client_id: opts.rule.client_id,
    });

  await supabase.from("reminder_dispatches").insert({
    rule_id: opts.rule.id,
    client_id: opts.rule.client_id,
    entity_type: opts.entityType,
    entity_id: opts.entityId,
    recipient_user_id: opts.recipientUserId,
    notification_id: notif as string | null,
    lead_days_used: opts.leadDay,
    dispatch_key: key,
  });
  return true;
}

async function resolveRecipients(rule: ReminderRule, ctx: {
  employeeId?: string | null;
  approverIds?: string[];
}): Promise<string[]> {
  const userIds = new Set<string>();

  for (const r of rule.recipients) {
    if (r === "employee" && ctx.employeeId) {
      const { data } = await supabase
        .from("employees").select("user_id").eq("id", ctx.employeeId).maybeSingle();
      if (data?.user_id) userIds.add(data.user_id);
    } else if (r === "manager" && ctx.employeeId) {
      const { data: emp } = await supabase
        .from("employees").select("reports_to").eq("id", ctx.employeeId).maybeSingle();
      if (emp?.reports_to) {
        const { data: mgr } = await supabase
          .from("employees").select("user_id").eq("id", emp.reports_to).maybeSingle();
        if (mgr?.user_id) userIds.add(mgr.user_id);
      }
    } else if (r === "hr" || r === "admin") {
      const { data: roles } = await supabase
        .from("user_roles").select("user_id").eq("client_id", rule.client_id).eq("role", "admin");
      (roles ?? []).forEach(x => x.user_id && userIds.add(x.user_id));
    } else if (r === "approver" && ctx.approverIds) {
      ctx.approverIds.forEach(id => userIds.add(id));
    }
  }
  return [...userIds];
}

// ---------- Category processors ----------
async function processDocumentExpiry(rule: ReminderRule) {
  const { data: docs } = await supabase
    .from("employee_documents")
    .select("id, client_id, employee_id, doc_type, expiry_date")
    .eq("client_id", rule.client_id)
    .eq("status", "active")
    .not("expiry_date", "is", null);

  let count = 0;
  for (const d of docs ?? []) {
    const exp = new Date(d.expiry_date as string); exp.setHours(0,0,0,0);
    const daysLeft = daysBetween(exp, today);
    if (!rule.lead_days_before.includes(daysLeft)) continue;

    const recipients = await resolveRecipients(rule, { employeeId: d.employee_id as string });
    const { data: emp } = await supabase
      .from("employees").select("first_name,last_name").eq("id", d.employee_id).maybeSingle();
    const name = `${emp?.first_name ?? ""} ${emp?.last_name ?? ""}`.trim() || "Employee";
    const title = `${d.doc_type} expiring in ${daysLeft} day(s)`;
    const body = `${name}'s ${d.doc_type} expires on ${d.expiry_date}.`;

    for (const uid of recipients) {
      const sent = await dispatch({
        rule, recipientUserId: uid, entityType: "employee_document",
        entityId: d.id, leadDay: daysLeft, title, body, actionUrl: "/employees",
      });
      if (sent) count++;
    }
  }
  return count;
}

async function processAssetField(rule: ReminderRule, field: "warranty_expiry" | "service_due_date") {
  const { data: assets } = await supabase
    .from("assets")
    .select(`id, client_id, asset_tag, name, employee_id, ${field}`)
    .eq("client_id", rule.client_id)
    .not(field, "is", null);

  let count = 0;
  for (const a of assets ?? []) {
    const dateStr = (a as Record<string, unknown>)[field] as string | null;
    if (!dateStr) continue;
    const d = new Date(dateStr); d.setHours(0,0,0,0);
    const daysLeft = daysBetween(d, today);
    if (!rule.lead_days_before.includes(daysLeft)) continue;

    const recipients = await resolveRecipients(rule, { employeeId: (a as { employee_id?: string }).employee_id ?? null });
    const label = field === "warranty_expiry" ? "Warranty expires" : "Service due";
    const title = `${(a as { name: string }).name} (${(a as { asset_tag: string }).asset_tag}) — ${label} in ${daysLeft} day(s)`;
    const body = `${label} on ${dateStr}.`;

    for (const uid of recipients) {
      const sent = await dispatch({
        rule, recipientUserId: uid, entityType: "asset",
        entityId: (a as { id: string }).id, leadDay: daysLeft, title, body, actionUrl: "/assets/inventory",
      });
      if (sent) count++;
    }
  }
  return count;
}

async function processAdvanceSettlement(rule: ReminderRule) {
  const { data: advances } = await supabase
    .from("advances")
    .select("id, client_id, employee_id, advance_name, amount, settlement_due_date, status")
    .eq("client_id", rule.client_id)
    .in("status", ["approved", "disbursed", "partially_settled"])
    .not("settlement_due_date", "is", null);

  let count = 0;
  for (const a of advances ?? []) {
    const due = new Date(a.settlement_due_date as string); due.setHours(0,0,0,0);
    const daysLeft = daysBetween(due, today);
    if (!rule.lead_days_before.includes(daysLeft)) continue;

    const recipients = await resolveRecipients(rule, { employeeId: a.employee_id as string });
    const overdue = daysLeft < 0;
    const title = overdue ? `Advance overdue by ${Math.abs(daysLeft)} day(s)` : `Advance settlement in ${daysLeft} day(s)`;
    const amt = (Number(a.amount) / 100).toLocaleString();
    const body = `${a.advance_name ?? "Advance"} (${amt}) — settlement due ${a.settlement_due_date}.`;

    for (const uid of recipients) {
      const sent = await dispatch({
        rule, recipientUserId: uid, entityType: "advance",
        entityId: a.id, leadDay: daysLeft, title, body, actionUrl: "/advances",
      });
      if (sent) count++;
    }
  }
  return count;
}

async function processProbation(rule: ReminderRule) {
  const { data: emps } = await supabase
    .from("employees")
    .select("id, client_id, first_name, last_name, probation_end_date")
    .eq("client_id", rule.client_id)
    .eq("status", "active")
    .not("probation_end_date", "is", null);

  let count = 0;
  for (const e of emps ?? []) {
    const end = new Date(e.probation_end_date as string); end.setHours(0,0,0,0);
    const daysLeft = daysBetween(end, today);
    if (!rule.lead_days_before.includes(daysLeft)) continue;

    const recipients = await resolveRecipients(rule, { employeeId: e.id });
    const name = `${e.first_name ?? ""} ${e.last_name ?? ""}`.trim() || "Employee";
    const title = `Probation ending in ${daysLeft} day(s): ${name}`;
    const body = `${name}'s probation ends on ${e.probation_end_date}. Please complete the review.`;

    for (const uid of recipients) {
      const sent = await dispatch({
        rule, recipientUserId: uid, entityType: "employee",
        entityId: e.id, leadDay: daysLeft, title, body, actionUrl: "/employees",
      });
      if (sent) count++;
    }
  }
  return count;
}

async function processBirthdayOrAnniversary(rule: ReminderRule, kind: "birthday" | "anniversary") {
  const dateField = kind === "birthday" ? "date_of_birth" : "joining_date";
  const { data: emps } = await supabase
    .from("employees")
    .select(`id, client_id, first_name, last_name, ${dateField}`)
    .eq("client_id", rule.client_id)
    .eq("status", "active")
    .not(dateField, "is", null);

  let count = 0;
  for (const e of emps ?? []) {
    const raw = (e as Record<string, unknown>)[dateField] as string | null;
    if (!raw) continue;
    const d = new Date(raw);
    // Build this year's occurrence
    const occ = new Date(today.getFullYear(), d.getMonth(), d.getDate());
    if (occ < today) occ.setFullYear(occ.getFullYear() + 1);
    const daysLeft = daysBetween(occ, today);
    if (!rule.lead_days_before.includes(daysLeft)) continue;

    const recipients = await resolveRecipients(rule, { employeeId: (e as { id: string }).id });
    const name = `${(e as { first_name?: string }).first_name ?? ""} ${(e as { last_name?: string }).last_name ?? ""}`.trim() || "Employee";
    const title = kind === "birthday"
      ? `🎂 ${name}'s birthday in ${daysLeft} day(s)`
      : `🎉 ${name}'s work anniversary in ${daysLeft} day(s)`;
    const body = `${name}'s ${kind === "birthday" ? "birthday" : "work anniversary"} is on ${occ.toISOString().slice(0,10)}.`;

    for (const uid of recipients) {
      const sent = await dispatch({
        rule, recipientUserId: uid, entityType: "employee",
        entityId: (e as { id: string }).id, leadDay: daysLeft, title, body, actionUrl: "/birthdays",
      });
      if (sent) count++;
    }
  }
  return count;
}

async function processPolicyAck(rule: ReminderRule) {
  const { data: policies } = await supabase
    .from("company_policies")
    .select("id, client_id, title")
    .eq("client_id", rule.client_id)
    .eq("status", "active")
    .eq("requires_ack", true);

  let count = 0;
  const leadDay = rule.lead_days_before[0] ?? 0; // policy ack is recurring nudge
  for (const p of policies ?? []) {
    const { data: emps } = await supabase
      .from("employees").select("id, user_id")
      .eq("client_id", p.client_id).eq("status", "active").not("user_id","is",null);
    const { data: acks } = await supabase
      .from("policy_acknowledgments").select("employee_id").eq("policy_id", p.id);
    const ackedSet = new Set((acks ?? []).map(a => a.employee_id));

    for (const e of emps ?? []) {
      if (ackedSet.has(e.id)) continue;
      const sent = await dispatch({
        rule, recipientUserId: e.user_id as string, entityType: "company_policy",
        entityId: p.id, leadDay, title: "Policy acknowledgment pending",
        body: `Please review and acknowledge: "${p.title}".`, actionUrl: "/policies",
      });
      if (sent) count++;
    }
  }
  return count;
}

async function processApprovalPending(rule: ReminderRule) {
  // Pending leave + expense + advance approvals to admins
  let count = 0;
  const recipients = await resolveRecipients(rule, {});
  const leadDay = rule.lead_days_before[0] ?? 0;

  const sources = [
    { table: "leave_requests", entity: "leave_request", url: "/leave" },
    { table: "expenses", entity: "expense", url: "/expenses" },
    { table: "advances", entity: "advance", url: "/advances" },
  ];

  for (const src of sources) {
    const { data: rows } = await supabase
      .from(src.table)
      .select("id, created_at")
      .eq("client_id", rule.client_id)
      .eq("status", "pending");
    const pendingCount = (rows ?? []).length;
    if (pendingCount === 0) continue;

    for (const uid of recipients) {
      const sent = await dispatch({
        rule, recipientUserId: uid, entityType: src.entity,
        entityId: null, leadDay,
        title: `${pendingCount} pending ${src.entity.replace("_"," ")} approval(s)`,
        body: `You have ${pendingCount} pending request(s) waiting for review.`,
        actionUrl: src.url,
      });
      if (sent) count++;
    }
  }
  return count;
}

async function processPayrollDue(rule: ReminderRule) {
  // Notify admins X days before month-end
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysToMonthEnd = lastDay - today.getDate();
  if (!rule.lead_days_before.includes(daysToMonthEnd)) return 0;

  const recipients = await resolveRecipients(rule, {});
  let count = 0;
  for (const uid of recipients) {
    const sent = await dispatch({
      rule, recipientUserId: uid, entityType: "payroll_cycle",
      entityId: null, leadDay: daysToMonthEnd,
      title: `Payroll run due in ${daysToMonthEnd} day(s)`,
      body: `Month-end payroll cycle is approaching. Please prepare the payroll run.`,
      actionUrl: "/payroll",
    });
    if (sent) count++;
  }
  return count;
}

async function processPerformanceAssessment(rule: ReminderRule) {
  // Generic nudge to all active employees about pending self-assessment.
  // (Detailed cycle integration can be added later via conditions.)
  const leadDay = rule.lead_days_before[0] ?? 0;
  const { data: emps } = await supabase
    .from("employees").select("id, user_id")
    .eq("client_id", rule.client_id).eq("status","active").not("user_id","is",null);
  let count = 0;
  for (const e of emps ?? []) {
    const sent = await dispatch({
      rule, recipientUserId: e.user_id as string, entityType: "employee",
      entityId: e.id, leadDay,
      title: "Performance assessment pending",
      body: "Please complete your self-assessment for the current performance cycle.",
      actionUrl: "/performance/self-assessment",
    });
    if (sent) count++;
  }
  return count;
}

// ---------- Dispatcher ----------
async function processRule(rule: ReminderRule): Promise<number> {
  switch (rule.category) {
    case "document_expiry": return processDocumentExpiry(rule);
    case "asset_warranty": return processAssetField(rule, "warranty_expiry");
    case "asset_service": return processAssetField(rule, "service_due_date");
    case "advance_settlement": return processAdvanceSettlement(rule);
    case "probation_end": return processProbation(rule);
    case "birthday": return processBirthdayOrAnniversary(rule, "birthday");
    case "work_anniversary": return processBirthdayOrAnniversary(rule, "anniversary");
    case "policy_ack": return processPolicyAck(rule);
    case "approval_pending": return processApprovalPending(rule);
    case "payroll_due": return processPayrollDue(rule);
    case "performance_assessment": return processPerformanceAssessment(rule);
    default: return 0;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    // Optional: filter by client_id (for "Test now" button)
    let body: { client_id?: string; rule_id?: string } = {};
    if (req.method === "POST") {
      try { body = await req.json(); } catch { body = {}; }
    }

    let q = supabase.from("reminder_rules").select("*").eq("is_enabled", true);
    if (body.client_id) q = q.eq("client_id", body.client_id);
    if (body.rule_id) q = q.eq("id", body.rule_id);

    const { data: rules, error } = await q;
    if (error) throw error;

    const results: Record<string, number> = {};
    for (const rule of (rules ?? []) as ReminderRule[]) {
      const sent = await processRule(rule);
      results[`${rule.category}:${rule.id.slice(0,8)}`] = sent;
      await supabase.from("reminder_rules")
        .update({ last_run_at: new Date().toISOString() })
        .eq("id", rule.id);
    }

    return new Response(JSON.stringify({ ok: true, processed: rules?.length ?? 0, results }), {
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
