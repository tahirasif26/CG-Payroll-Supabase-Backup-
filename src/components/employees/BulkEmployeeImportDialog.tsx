import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

interface BulkEmployeeImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedRow {
  emp_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  department?: string;
  designation?: string;
  joining_date?: string;
  nationality?: string;
  gender?: string;
}

interface ImportResult {
  ok: number;
  failed: { row: number; error: string }[];
}

const TEMPLATE_HEADERS = [
  "emp_id", "first_name", "last_name", "email", "phone",
  "department", "designation", "joining_date", "nationality", "gender",
];

const SAMPLE_ROW = [
  "EMP001", "Ahmed", "Khan", "ahmed@example.com", "+966500000000",
  "Engineering", "Software Engineer", "2025-01-15", "Saudi Arabia", "male",
];

export function BulkEmployeeImportDialog({ open, onOpenChange }: BulkEmployeeImportDialogProps) {
  const { clientId } = useRole();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, SAMPLE_ROW]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    XLSX.writeFile(wb, "employee-import-template.xlsx");
  };

  const handleFile = async (file: File) => {
    setErrors([]);
    setResult(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      const errs: string[] = [];
      const out: ParsedRow[] = [];
      rows.forEach((r, i) => {
        const row = i + 2; // +1 header, +1 1-indexed
        const emp_id = String(r.emp_id ?? "").trim();
        const first_name = String(r.first_name ?? "").trim();
        const last_name = String(r.last_name ?? "").trim();
        if (!emp_id) errs.push(`Row ${row}: missing emp_id`);
        if (!first_name) errs.push(`Row ${row}: missing first_name`);
        if (!last_name) errs.push(`Row ${row}: missing last_name`);
        if (!emp_id || !first_name || !last_name) return;
        let joining_date: string | undefined;
        const jd = r.joining_date;
        if (jd) {
          if (jd instanceof Date) joining_date = jd.toISOString().slice(0, 10);
          else if (typeof jd === "number") {
            const d = XLSX.SSF.parse_date_code(jd);
            if (d) joining_date = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
          } else joining_date = String(jd).trim() || undefined;
        }
        out.push({
          emp_id,
          first_name,
          last_name,
          email: String(r.email ?? "").trim() || undefined,
          phone: String(r.phone ?? "").trim() || undefined,
          department: String(r.department ?? "").trim() || undefined,
          designation: String(r.designation ?? "").trim() || undefined,
          joining_date,
          nationality: String(r.nationality ?? "").trim() || undefined,
          gender: String(r.gender ?? "").trim().toLowerCase() || undefined,
        });
      });
      setParsed(out);
      setErrors(errs);
    } catch (e) {
      setErrors([e instanceof Error ? e.message : "Failed to parse file"]);
    }
  };

  const runImport = async () => {
    if (!clientId || !parsed.length) return;
    setImporting(true);
    const failed: { row: number; error: string }[] = [];
    let ok = 0;
    for (let i = 0; i < parsed.length; i++) {
      const p = parsed[i];
      const { error } = await supabase.from("employees").insert({
        client_id: clientId,
        emp_id: p.emp_id,
        first_name: p.first_name,
        last_name: p.last_name,
        email: p.email ?? null,
        phone: p.phone ?? null,
        department: p.department ?? null,
        designation: p.designation ?? null,
        joining_date: p.joining_date ?? null,
        nationality: p.nationality ?? null,
        gender: p.gender ?? null,
        status: "active",
      });
      if (error) failed.push({ row: i + 2, error: error.message });
      else ok++;
    }
    setResult({ ok, failed });
    setImporting(false);
    if (ok > 0) {
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast({ title: "Import complete", description: `${ok} employees added, ${failed.length} failed.` });
    }
  };

  const close = () => {
    if (importing) return;
    setParsed([]);
    setErrors([]);
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Employees</DialogTitle>
          <DialogDescription>
            Upload an Excel/CSV file to add multiple employees at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-muted/40 rounded border-dashed border">
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground flex-1">
              Need the format? Download the template with sample data.
            </span>
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
              <Download className="h-3.5 w-3.5" />
              Template
            </Button>
          </div>

          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()} className="w-full gap-2">
              <Upload className="h-4 w-4" />
              Choose Excel or CSV file
            </Button>
          </div>

          {errors.length > 0 && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                Validation issues
              </div>
              {errors.slice(0, 8).map((e, i) => <div key={i} className="text-destructive/90">{e}</div>)}
              {errors.length > 8 && <div className="text-destructive/70">+{errors.length - 8} more...</div>}
            </div>
          )}

          {parsed.length > 0 && !result && (
            <div className="border rounded">
              <div className="px-3 py-2 bg-muted/40 border-b text-xs font-medium">
                Preview — {parsed.length} {parsed.length === 1 ? "employee" : "employees"} ready to import
              </div>
              <div className="max-h-60 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/20 sticky top-0">
                    <tr className="text-left">
                      <th className="px-2 py-1.5">ID</th>
                      <th className="px-2 py-1.5">Name</th>
                      <th className="px-2 py-1.5">Email</th>
                      <th className="px-2 py-1.5">Department</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.slice(0, 50).map((p, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1.5">{p.emp_id}</td>
                        <td className="px-2 py-1.5">{p.first_name} {p.last_name}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{p.email ?? "—"}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{p.department ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsed.length > 50 && (
                  <div className="text-center text-xs text-muted-foreground py-2 border-t">
                    +{parsed.length - 50} more rows
                  </div>
                )}
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded text-xs">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="font-medium">{result.ok}</span> imported successfully
                {result.failed.length > 0 && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="font-medium text-destructive">{result.failed.length}</span> failed
                  </>
                )}
              </div>
              {result.failed.length > 0 && (
                <div className="border border-destructive/30 rounded p-3 text-xs space-y-1 max-h-40 overflow-y-auto">
                  {result.failed.map((f, i) => (
                    <div key={i}><span className="font-mono">Row {f.row}:</span> <span className="text-destructive">{f.error}</span></div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={importing}>
            {result ? "Close" : "Cancel"}
          </Button>
          {parsed.length > 0 && !result && (
            <Button onClick={runImport} disabled={importing} className="gap-2">
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Import {parsed.length} Employees
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
