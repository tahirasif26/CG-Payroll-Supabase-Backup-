import { useState } from "react";
import * as XLSX from "xlsx";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { Download, FileSpreadsheet, Users, Calendar, DollarSign, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { fromMinorUnits } from "@/lib/money";

const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function downloadXlsx(rows: Record<string, unknown>[], sheet: string, filename: string) {
  if (!rows.length) {
    toast({ title: "No data", description: "Nothing to export for the selected filters.", variant: "destructive" });
    return;
  }
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheet);
  XLSX.writeFile(wb, filename);
  toast({ title: "Exported", description: `${rows.length} rows downloaded.` });
}

export default function ReportsPage() {
  const { clientId } = useRole();
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<string>(months[now.getMonth()]);
  const [busy, setBusy] = useState<string | null>(null);

  const { data: setupCount = 0 } = useQuery({
    queryKey: ["reports-setup-count", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { count } = await supabase
        .from("payroll_setups")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId!);
      return count ?? 0;
    },
  });

  const exportPayrollRegister = async () => {
    if (!clientId) return;
    setBusy("payroll");
    try {
      const { data: runs, error: runsErr } = await supabase
        .from("payroll_runs")
        .select("id, month, year, status")
        .eq("client_id", clientId)
        .eq("year", year)
        .eq("month", month);
      if (runsErr) throw runsErr;
      const runIds = (runs ?? []).map((r) => r.id);
      if (!runIds.length) {
        toast({ title: "No payroll runs", description: `No runs found for ${month} ${year}.`, variant: "destructive" });
        return;
      }
      const { data: lines, error: linesErr } = await supabase
        .from("payroll_lines")
        .select("employee_id, basic, allowances, gross, loan_deduction, tax_deduction, statutory_deduction, other_deductions, total_deductions, expense_reimbursement, advance_given, separation_settlement, net_pay, pay_currency")
        .in("payroll_run_id", runIds);
      if (linesErr) throw linesErr;

      const empIds = Array.from(new Set((lines ?? []).map((l) => l.employee_id)));
      const { data: emps } = await supabase
        .from("employees")
        .select("id, emp_id, first_name, last_name, department, designation")
        .in("id", empIds);
      const empMap = new Map((emps ?? []).map((e) => [e.id, e]));

      const rows = (lines ?? []).map((l) => {
        const e = empMap.get(l.employee_id);
        const c = l.pay_currency || "SAR";
        return {
          "Employee ID": e?.emp_id ?? "",
          "Name": `${e?.first_name ?? ""} ${e?.last_name ?? ""}`.trim(),
          "Department": e?.department ?? "",
          "Designation": e?.designation ?? "",
          "Currency": c,
          "Basic": fromMinorUnits(BigInt(l.basic ?? 0), c),
          "Allowances": fromMinorUnits(BigInt(l.allowances ?? 0), c),
          "Gross": fromMinorUnits(BigInt(l.gross ?? 0), c),
          "Loan Deduction": fromMinorUnits(BigInt(l.loan_deduction ?? 0), c),
          "Tax": fromMinorUnits(BigInt(l.tax_deduction ?? 0), c),
          "Statutory": fromMinorUnits(BigInt(l.statutory_deduction ?? 0), c),
          "Other Deductions": fromMinorUnits(BigInt(l.other_deductions ?? 0), c),
          "Total Deductions": fromMinorUnits(BigInt(l.total_deductions ?? 0), c),
          "Reimbursement": fromMinorUnits(BigInt(l.expense_reimbursement ?? 0), c),
          "Advance": fromMinorUnits(BigInt(l.advance_given ?? 0), c),
          "EOSB Settlement": fromMinorUnits(BigInt(l.separation_settlement ?? 0), c),
          "Net Pay": fromMinorUnits(BigInt(l.net_pay ?? 0), c),
        };
      });
      downloadXlsx(rows, "Payroll Register", `payroll-register-${month}-${year}.xlsx`);
    } catch (e) {
      toast({ title: "Export failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const exportLeaveBalance = async () => {
    if (!clientId) return;
    setBusy("leave");
    try {
      const { data: balances, error } = await supabase
        .from("leave_balances")
        .select("employee_id, leave_type_id, allocated, used, carryforward_in, carried_forward, year")
        .eq("client_id", clientId)
        .eq("year", year);
      if (error) throw error;
      if (!balances?.length) {
        toast({ title: "No data", description: `No leave balances for ${year}.`, variant: "destructive" });
        return;
      }
      const empIds = Array.from(new Set(balances.map((b) => b.employee_id)));
      const typeIds = Array.from(new Set(balances.map((b) => b.leave_type_id)));
      const [{ data: emps }, { data: types }] = await Promise.all([
        supabase.from("employees").select("id, emp_id, first_name, last_name, department").in("id", empIds),
        supabase.from("leave_types").select("id, name").in("id", typeIds),
      ]);
      const empMap = new Map((emps ?? []).map((e) => [e.id, e]));
      const typeMap = new Map((types ?? []).map((t) => [t.id, t.name]));
      const rows = balances.map((b) => {
        const e = empMap.get(b.employee_id);
        const allocated = Number(b.allocated ?? 0);
        const used = Number(b.used ?? 0);
        const cf = Number(b.carryforward_in ?? 0) + Number(b.carried_forward ?? 0);
        return {
          "Employee ID": e?.emp_id ?? "",
          "Name": `${e?.first_name ?? ""} ${e?.last_name ?? ""}`.trim(),
          "Department": e?.department ?? "",
          "Leave Type": typeMap.get(b.leave_type_id) ?? "",
          "Year": b.year,
          "Allocated": allocated,
          "Carry Forward": cf,
          "Used": used,
          "Balance": allocated + cf - used,
        };
      });
      downloadXlsx(rows, "Leave Balance", `leave-balance-${year}.xlsx`);
    } catch (e) {
      toast({ title: "Export failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const exportHeadcount = async () => {
    if (!clientId) return;
    setBusy("headcount");
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("emp_id, first_name, last_name, email, phone, department, designation, division, category, status, joining_date, separation_date, work_location_country, work_location_city, nationality, gender, date_of_birth")
        .eq("client_id", clientId)
        .order("emp_id");
      if (error) throw error;
      const rows = (data ?? []).map((e) => ({
        "Employee ID": e.emp_id,
        "Name": `${e.first_name ?? ""} ${e.last_name ?? ""}`.trim(),
        "Email": e.email ?? "",
        "Phone": e.phone ?? "",
        "Department": e.department ?? "",
        "Designation": e.designation ?? "",
        "Division": e.division ?? "",
        "Category": e.category ?? "",
        "Status": e.status,
        "Joining Date": e.joining_date ?? "",
        "Separation Date": e.separation_date ?? "",
        "Country": e.work_location_country ?? "",
        "City": e.work_location_city ?? "",
        "Nationality": e.nationality ?? "",
        "Gender": e.gender ?? "",
        "Date of Birth": e.date_of_birth ?? "",
      }));

      // Summary
      const byDept: Record<string, number> = {};
      const byStatus: Record<string, number> = {};
      (data ?? []).forEach((e) => {
        const d = e.department || "Unassigned";
        byDept[d] = (byDept[d] ?? 0) + 1;
        byStatus[e.status] = (byStatus[e.status] ?? 0) + 1;
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wsDept = XLSX.utils.json_to_sheet(Object.entries(byDept).map(([k, v]) => ({ Department: k, Count: v })));
      const wsStatus = XLSX.utils.json_to_sheet(Object.entries(byStatus).map(([k, v]) => ({ Status: k, Count: v })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Headcount");
      XLSX.utils.book_append_sheet(wb, wsDept, "By Department");
      XLSX.utils.book_append_sheet(wb, wsStatus, "By Status");
      XLSX.writeFile(wb, `headcount-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast({ title: "Exported", description: `${rows.length} employees downloaded.` });
    } catch (e) {
      toast({ title: "Export failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const yearOpts = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 3 + i);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Exports"
        description="Generate Excel reports for payroll, leave, and workforce."
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Period</CardTitle>
          <CardDescription>Used for payroll register and leave balance exports.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs">Month</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {months.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Year</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {yearOpts.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-muted-foreground self-end pb-2">
            {setupCount} payroll setup{setupCount === 1 ? "" : "s"} configured
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Payroll Register</CardTitle>
            </div>
            <CardDescription>Per-employee gross, deductions, and net pay for the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={exportPayrollRegister} disabled={busy !== null} className="w-full gap-2">
              {busy === "payroll" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export Excel
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Leave Balance</CardTitle>
            </div>
            <CardDescription>Allocated, used, and remaining balance per employee for the selected year.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={exportLeaveBalance} disabled={busy !== null} className="w-full gap-2">
              {busy === "leave" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export Excel
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Headcount</CardTitle>
            </div>
            <CardDescription>Full workforce snapshot with department and status breakdown sheets.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={exportHeadcount} disabled={busy !== null} className="w-full gap-2">
              {busy === "headcount" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export Excel
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-6 flex items-start gap-3">
          <FileSpreadsheet className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p>All exports respect the active client scope and generate native Excel (.xlsx) workbooks.</p>
            <p>Need a PDF? Open the file in Excel/Numbers/Sheets and use <kbd className="px-1 py-0.5 bg-background border rounded">Print → Save as PDF</kbd>.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
