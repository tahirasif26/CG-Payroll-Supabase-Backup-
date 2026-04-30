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
      .from("policy_acknowledgements").select("employee_id").eq("policy_id", p.id);
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
  // Per-row routing: for each pending request resolve the approval group via
  // policy, then notify the active approvers (delegation-aware). If the
  // configured escalate_after_days window has elapsed, also notify the
  // escalation group.
  let count = 0;
  const fallbackRecipients = await resolveRecipients(rule, {});
  const leadDay = rule.lead_days_before[0] ?? 0;

  const sources: Array<{
    table: string;
    entity: string;
    url: string;
    valueField: "amount" | "days";
    categoryFor: (row: any) => string;
  }> = [
    {
      table: "leave_requests",
      entity: "leave_request",
      url: "/leave",
      valueField: "days",
      categoryFor: () => "leave",
    },
    {
      table: "expenses",
      entity: "expense",
      url: "/expenses",
      valueField: "amount",
      categoryFor: (r) =>
        r.expense_categories?.name
          ? `expenses_${String(r.expense_categories.name).toLowerCase().replace(/\s+/g, "_")}`
          : "expenses_other",
    },
    {
      table: "advances",
      entity: "advance",
      url: "/advances",
      valueField: "amount",
      categoryFor: () => "advances",
    },
  ];

  for (const src of sources) {
    const select =
      src.entity === "expense"
        ? "id, created_at, amount, expense_categories(name)"
        : src.valueField === "days"
        ? "id, created_at, days"
        : "id, created_at, amount";

    const { data: rows } = await supabase
      .from(src.table)
      .select(select)
      .eq("client_id", rule.client_id)
      .eq("status", "pending");

    for (const row of rows ?? []) {
      const value =
        src.valueField === "days"
          ? Number((row as any).days ?? 0)
          : Number((row as any).amount ?? 0);

      // Resolve group from policy
      const { data: groupId } = await supabase.rpc("resolve_approval_group", {
        _client_id: rule.client_id,
        _category: src.categoryFor(row),
        _value: value,
      });

      let recipients: string[] = [];
      let escalateGroupId: string | null = null;
      let escalateAfter: number | null = null;

      if (groupId) {
        const { data: approvers } = await supabase.rpc("get_active_approvers", {
          _group_id: groupId,
        });
        const empIds = (approvers ?? []).map((a: any) => a.employee_id).filter(Boolean);
        if (empIds.length) {
          const { data: empRows } = await supabase
            .from("employees")
            .select("user_id")
            .in("id", empIds);
          recipients = (empRows ?? [])
            .map((e: any) => e.user_id)
            .filter((u: string | null): u is string => !!u);
        }
        const { data: grp } = await supabase
          .from("approval_groups")
          .select("escalate_after_days, escalate_to_group_id")
          .eq("id", groupId)
          .maybeSingle();
        escalateAfter = grp?.escalate_after_days ?? null;
        escalateGroupId = grp?.escalate_to_group_id ?? null;
      }

      if (recipients.length === 0) recipients = fallbackRecipients;

      const ageDays = Math.floor(
        (today.getTime() - new Date((row as any).created_at).getTime()) / (1000 * 60 * 60 * 24),
      );
      const escalating = !!(escalateAfter && escalateGroupId && ageDays >= escalateAfter);

      // Add escalation recipients on top
      if (escalating && escalateGroupId) {
        const { data: escApprovers } = await supabase.rpc("get_active_approvers", {
          _group_id: escalateGroupId,
        });
        const escEmpIds = (escApprovers ?? []).map((a: any) => a.employee_id).filter(Boolean);
        if (escEmpIds.length) {
          const { data: escEmpRows } = await supabase
            .from("employees")
            .select("user_id")
            .in("id", escEmpIds);
          const escUids = (escEmpRows ?? [])
            .map((e: any) => e.user_id)
            .filter((u: string | null): u is string => !!u);
          recipients = Array.from(new Set([...recipients, ...escUids]));
        }
      }

      const title = escalating
        ? `Escalated: pending ${src.entity.replace("_", " ")} approval`
        : `Pending ${src.entity.replace("_", " ")} approval`;
      const body = escalating
        ? `A ${src.entity.replace("_", " ")} request has been pending for ${ageDays} day(s) and was escalated.`
        : `A ${src.entity.replace("_", " ")} request is awaiting your review.`;

      for (const uid of recipients) {
        const sent = await dispatch({
          rule,
          recipientUserId: uid,
          entityType: src.entity,
          entityId: (row as any).id,
          leadDay,
          title,
          body,
          actionUrl: src.url,
        });
        if (sent) count++;
      }
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

// ---------- New: doc-type-based expiry (visa, iqama, contract, medical insurance) ----------
async function processDocTypeExpiry(rule: ReminderRule, opts: {
  docTypeMatch: string[];   // values to match against employee_documents.doc_type (case-insensitive)
  label: string;            // human label e.g. "Visa"
}) {
  const { data: docs } = await supabase
    .from("employee_documents")
    .select("id, client_id, employee_id, doc_type, expiry_date")
    .eq("client_id", rule.client_id)
    .eq("status", "active")
    .not("expiry_date", "is", null);

  let count = 0;
  const matchSet = new Set(opts.docTypeMatch.map((s) => s.toLowerCase()));

  for (const d of docs ?? []) {
    const dt = String(d.doc_type ?? "").toLowerCase();
    if (![...matchSet].some((m) => dt.includes(m))) continue;

    const exp = new Date(d.expiry_date as string); exp.setHours(0, 0, 0, 0);
    const daysLeft = daysBetween(exp, today);
    if (!rule.lead_days_before.includes(daysLeft)) continue;

    const recipients = await resolveRecipients(rule, { employeeId: d.employee_id as string });
    const { data: emp } = await supabase
      .from("employees").select("first_name,last_name").eq("id", d.employee_id).maybeSingle();
    const name = `${emp?.first_name ?? ""} ${emp?.last_name ?? ""}`.trim() || "Employee";
    const title = `${opts.label} expiring in ${daysLeft} day(s): ${name}`;
    const body = `${name}'s ${opts.label.toLowerCase()} (${d.doc_type}) expires on ${d.expiry_date}.`;

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

// ---------- New: loan instalment due ----------
async function processLoanInstalment(rule: ReminderRule) {
  // Compute next instalment date as the next monthly anniversary of start_date
  // for active loans with remaining balance.
  const { data: loans } = await supabase
    .from("loans")
    .select("id, client_id, employee_id, start_date, end_date, monthly_deduction, remaining_balance, paused_until")
    .eq("client_id", rule.client_id)
    .eq("status", "active")
    .gt("remaining_balance", 0);

  let count = 0;
  for (const l of loans ?? []) {
    if (!l.start_date || !l.monthly_deduction) continue;

    // Skip paused loans
    if (l.paused_until) {
      const pu = new Date(l.paused_until); pu.setHours(0, 0, 0, 0);
      if (pu >= today) continue;
    }

    const start = new Date(l.start_date as string); start.setHours(0, 0, 0, 0);
    const day = start.getDate();
    let next = new Date(today.getFullYear(), today.getMonth(), day);
    if (next < today) next = new Date(today.getFullYear(), today.getMonth() + 1, day);

    if (l.end_date) {
      const end = new Date(l.end_date as string); end.setHours(0, 0, 0, 0);
      if (next > end) continue;
    }

    const daysLeft = daysBetween(next, today);
    if (!rule.lead_days_before.includes(daysLeft)) continue;

    const recipients = await resolveRecipients(rule, { employeeId: l.employee_id as string });
    const amt = (Number(l.monthly_deduction) / 100).toLocaleString();
    const title = `Loan instalment due in ${daysLeft} day(s)`;
    const body = `Your monthly loan instalment of ${amt} will be deducted on ${next.toISOString().slice(0, 10)}.`;

    for (const uid of recipients) {
      const sent = await dispatch({
        rule, recipientUserId: uid, entityType: "loan",
        entityId: l.id, leadDay: daysLeft, title, body, actionUrl: "/loans",
      });
      if (sent) count++;
    }
  }
  return count;
}

// ---------- New: leave balance lapse (year-end) ----------
async function processLeaveBalanceLapse(rule: ReminderRule) {
  // Compute days until calendar year-end
  const yearEnd = new Date(today.getFullYear(), 11, 31);
  yearEnd.setHours(0, 0, 0, 0);
  const daysLeft = daysBetween(yearEnd, today);
  if (!rule.lead_days_before.includes(daysLeft)) return 0;

  const year = today.getFullYear();
  const { data: balances } = await supabase
    .from("leave_balances")
    .select("id, employee_id, leave_type_id, allocated, used, carryforward_in, carried_forward")
    .eq("client_id", rule.client_id)
    .eq("year", year);

  let count = 0;
  for (const b of balances ?? []) {
    const allocated = Number(b.allocated ?? 0);
    const used = Number(b.used ?? 0);
    const cfIn = Number(b.carryforward_in ?? 0);
    const remaining = allocated + cfIn - used;
    if (remaining <= 0) continue;

    const recipients = await resolveRecipients(rule, { employeeId: b.employee_id as string });
    const title = `${remaining} leave day(s) will lapse in ${daysLeft} day(s)`;
    const body = `You have ${remaining} unused leave day(s) for ${year}. They may lapse at year-end on ${yearEnd.toISOString().slice(0, 10)}.`;

    for (const uid of recipients) {
      const sent = await dispatch({
        rule, recipientUserId: uid, entityType: "leave_balance",
        entityId: b.id, leadDay: daysLeft, title, body, actionUrl: "/leave",
      });
      if (sent) count++;
    }
  }
  return count;
}

// ---------- Dispatcher ----------
async function processRule(rule: ReminderRule): Promise<number> {
  switch (rule.category) {
    case "document_expiry": return processDocumentExpiry(rule);
    case "visa_expiry": return processDocTypeExpiry(rule, { docTypeMatch: ["visa"], label: "Visa" });
    case "iqama_expiry": return processDocTypeExpiry(rule, { docTypeMatch: ["iqama", "residence"], label: "Iqama" });
    case "contract_expiry": return processDocTypeExpiry(rule, { docTypeMatch: ["contract"], label: "Contract" });
    case "medical_insurance": return processDocTypeExpiry(rule, { docTypeMatch: ["medical", "insurance", "health"], label: "Medical insurance" });
    case "loan_instalment": return processLoanInstalment(rule);
    case "leave_balance_lapse": return processLeaveBalanceLapse(rule);
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
