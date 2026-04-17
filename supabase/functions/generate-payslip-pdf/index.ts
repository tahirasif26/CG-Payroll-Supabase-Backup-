// generate-payslip-pdf — produce a PDF for a payroll line, store it in the
// 'payslips' bucket and update the payslips table with pdf_url + issued_at.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  payroll_line_id: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) {
      return json({ error: "Unauthorized" }, 401);
    }

    // 1. Validate caller
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    const body = (await req.json()) as Body;
    if (!body?.payroll_line_id) return json({ error: "payroll_line_id required" }, 400);

    // 2. Fetch with RLS — if caller can't read it, this fails
    const { data: line, error: lineErr } = await userClient
      .from("payroll_lines")
      .select("*")
      .eq("id", body.payroll_line_id)
      .maybeSingle();
    if (lineErr || !line) return json({ error: "Payroll line not found or no access" }, 404);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const [{ data: emp }, { data: run }, { data: client }] = await Promise.all([
      admin.from("employees").select("*").eq("id", line.employee_id).maybeSingle(),
      admin.from("payroll_runs").select("*").eq("id", line.payroll_run_id).maybeSingle(),
      admin.from("clients").select("*").eq("id", line.client_id).maybeSingle(),
    ]);

    // 3. Generate PDF
    const pdfBytes = await buildPdf({ line, emp, run, client });

    // 4. Upload
    const path = `${line.client_id}/${line.employee_id}/${line.payroll_run_id}.pdf`;
    const { error: upErr } = await admin.storage.from("payslips").upload(path, pdfBytes, {
      upsert: true,
      contentType: "application/pdf",
    });
    if (upErr) return json({ error: `Upload failed: ${upErr.message}` }, 500);

    // 5. Upsert payslips row
    const { data: existing } = await admin
      .from("payslips")
      .select("id")
      .eq("payroll_line_id", line.id)
      .maybeSingle();

    if (existing) {
      await admin
        .from("payslips")
        .update({ pdf_url: path, issued_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await admin.from("payslips").insert({
        client_id: line.client_id,
        employee_id: line.employee_id,
        payroll_line_id: line.id,
        pdf_url: path,
        issued_at: new Date().toISOString(),
      });
    }

    // 6. Signed URL for immediate download
    const { data: signed } = await admin.storage.from("payslips").createSignedUrl(path, 3600);
    return json({ pdf_url: signed?.signedUrl, path });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface BuildArgs {
  line: Record<string, unknown> & {
    basic: number; allowances: number; gross: number; pay_currency: string;
    tax_deduction: number; statutory_deduction: number; loan_deduction: number;
    advance_given: number; one_off_deductions: number; other_deductions: number;
    expense_reimbursement: number; one_off_benefits: number; separation_settlement: number;
    total_deductions: number; net_pay: number;
  };
  emp: any;
  run: any;
  client: any;
}

async function buildPdf({ line, emp, run, client }: BuildArgs): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const { width } = page.getSize();
  const margin = 40;
  let y = 800;

  const text = (t: string, x: number, yy: number, opts?: { size?: number; b?: boolean; color?: [number, number, number] }) => {
    page.drawText(t, {
      x, y: yy,
      size: opts?.size ?? 10,
      font: opts?.b ? bold : font,
      color: opts?.color ? rgb(...opts.color) : rgb(0.1, 0.1, 0.1),
    });
  };

  // Header
  text(client?.company_name ?? "Company", margin, y, { size: 18, b: true });
  y -= 22;
  text("PAYSLIP", width - margin - 60, y + 22, { size: 14, b: true, color: [0.4, 0.4, 0.4] });

  text(`Pay period: ${run?.month ?? ""} ${run?.year ?? ""}`, margin, y, { size: 10 });
  y -= 14;
  text(`Run date: ${run?.run_date ?? ""}`, margin, y);
  y -= 24;

  // Employee block
  page.drawRectangle({ x: margin, y: y - 60, width: width - margin * 2, height: 60, color: rgb(0.96, 0.96, 0.97) });
  text("Employee", margin + 10, y - 14, { b: true });
  text(`${emp?.first_name ?? ""} ${emp?.last_name ?? ""}`, margin + 10, y - 28);
  text(`ID: ${emp?.emp_id ?? ""}`, margin + 10, y - 42);
  text(`Department: ${emp?.department ?? "—"}`, margin + 220, y - 28);
  text(`Designation: ${emp?.designation ?? "—"}`, margin + 220, y - 42);
  y -= 80;

  const fmt = (n: number) => `${line.pay_currency} ${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Earnings
  text("EARNINGS", margin, y, { b: true, size: 11 });
  y -= 4;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
  y -= 16;
  const earnings: Array<[string, number]> = [
    ["Basic", line.basic],
    ["Allowances", line.allowances],
    ["One-off benefits", line.one_off_benefits],
    ["Expense reimbursement", line.expense_reimbursement],
    ["Separation settlement", line.separation_settlement],
  ];
  for (const [label, val] of earnings) {
    if (!val) continue;
    text(label, margin, y);
    text(fmt(val), width - margin - 100, y);
    y -= 14;
  }
  text("Gross", margin, y, { b: true });
  text(fmt(line.gross), width - margin - 100, y, { b: true });
  y -= 24;

  // Deductions
  text("DEDUCTIONS", margin, y, { b: true, size: 11 });
  y -= 4;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
  y -= 16;
  const deductions: Array<[string, number]> = [
    ["Income tax", line.tax_deduction],
    ["Statutory (GOSI)", line.statutory_deduction],
    ["Loan repayment", line.loan_deduction],
    ["Advance settlement", line.advance_given],
    ["One-off deductions", line.one_off_deductions],
    ["Other deductions", line.other_deductions],
  ];
  for (const [label, val] of deductions) {
    if (!val) continue;
    text(label, margin, y);
    text(`(${fmt(val)})`, width - margin - 110, y);
    y -= 14;
  }
  text("Total deductions", margin, y, { b: true });
  text(`(${fmt(line.total_deductions)})`, width - margin - 110, y, { b: true });
  y -= 30;

  // Net
  page.drawRectangle({ x: margin, y: y - 24, width: width - margin * 2, height: 28, color: rgb(0.05, 0.45, 0.35) });
  text("NET PAY", margin + 10, y - 16, { b: true, size: 12, color: [1, 1, 1] });
  text(fmt(line.net_pay), width - margin - 130, y - 16, { b: true, size: 12, color: [1, 1, 1] });
  y -= 60;

  // Signature
  page.drawLine({ start: { x: margin, y: y }, end: { x: margin + 180, y: y }, thickness: 0.5, color: rgb(0.5, 0.5, 0.5) });
  text("Authorised signature", margin, y - 12, { size: 9, color: [0.4, 0.4, 0.4] });

  // Footer
  text(
    `Generated ${new Date().toISOString().slice(0, 10)} · This is a computer-generated payslip and does not require a signature.`,
    margin,
    30,
    { size: 8, color: [0.5, 0.5, 0.5] }
  );

  return await doc.save();
}
