// useDownloadPayslip — fetches the payroll_lines row for an (employee, run)
// pair, calls the generate-payslip-pdf edge function, and triggers a download.
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useDownloadPayslip() {
  const [loading, setLoading] = useState<string | null>(null);

  async function download(args: {
    payrollRunId: string;
    employeeId: string;
    label?: string;
  }) {
    const key = `${args.payrollRunId}:${args.employeeId}`;
    setLoading(key);
    try {
      const { data: line, error: lineErr } = await (supabase as any)
        .from("payroll_lines")
        .select("id")
        .eq("payroll_run_id", args.payrollRunId)
        .eq("employee_id", args.employeeId)
        .maybeSingle();
      if (lineErr) throw lineErr;
      if (!line?.id) {
        toast.error("Payslip not available for this period yet.");
        return;
      }
      const { data, error } = await (supabase as any).functions.invoke(
        "generate-payslip-pdf",
        { body: { payroll_line_id: line.id } },
      );
      if (error) throw error;
      const url = (data as any)?.pdf_url;
      if (!url) throw new Error("No download URL returned");
      // Open in new tab so the browser handles the download.
      window.open(url, "_blank", "noopener,noreferrer");
      toast.success("Payslip ready");
    } catch (e: any) {
      console.error("[payslip download]", e);
      toast.error(e?.message ?? "Failed to generate payslip");
    } finally {
      setLoading(null);
    }
  }

  return { download, loading };
}
