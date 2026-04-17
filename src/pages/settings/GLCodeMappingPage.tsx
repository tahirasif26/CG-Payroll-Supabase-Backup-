import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save } from "lucide-react";
import { expenseCategories } from "@/data/settingsData";
import { useGLMappings, useSaveGLMappings } from "@/hooks/queries/useGLMappings";
import { Skeleton } from "@/components/ui/skeleton";

interface GLEntry {
  entry: string;
  category: string;
  glCode: string;
}

const FIXED_ENTRIES: Omit<GLEntry, "glCode">[] = [
  { entry: "Basic Salary", category: "Salary" },
  { entry: "Housing Allowance", category: "Allowance" },
  { entry: "Travel Allowance", category: "Allowance" },
  { entry: "Medical Allowance", category: "Allowance" },
  { entry: "Other Allowances", category: "Allowance" },
  { entry: "GOSI (Employee)", category: "Deduction" },
  { entry: "GOSI (Employer)", category: "Deduction" },
  { entry: "Medical Insurance", category: "Deduction" },
  { entry: "Loan Deduction", category: "Deduction" },
  { entry: "Loan Disbursement", category: "Loan" },
  { entry: "Advance Given", category: "Advance" },
  { entry: "Net Pay", category: "Payable" },
];

function buildTemplate(): Omit<GLEntry, "glCode">[] {
  const expenseEntries = expenseCategories
    .filter((c) => c.isActive)
    .map((c) => ({ entry: `Expense: ${c.name}`, category: "Expense Reimbursement" }));
  return [...FIXED_ENTRIES, ...expenseEntries];
}

export default function GLCodeMappingPage() {
  const { data: dbMappings, isLoading } = useGLMappings();
  const saveMappings = useSaveGLMappings();

  const template = useMemo(buildTemplate, []);
  const [entries, setEntries] = useState<GLEntry[]>([]);

  // Hydrate local state when DB loads (or template grows from new expense categories)
  useEffect(() => {
    if (isLoading) return;
    const dbByName = new Map((dbMappings ?? []).map((m) => [m.entry_name, m.gl_code]));
    setEntries(
      template.map((t) => ({
        ...t,
        glCode: dbByName.get(t.entry) ?? "",
      }))
    );
  }, [dbMappings, isLoading, template]);

  const updateCode = (entryName: string, code: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.entry === entryName ? { ...e, glCode: code } : e))
    );
  };

  const handleSave = () => {
    saveMappings.mutate(
      entries.map((e) => ({ entry_name: e.entry, gl_code: e.glCode }))
    );
  };

  const categories = Array.from(new Set(entries.map((e) => e.category)));

  return (
    <div className="space-y-6">
      <PageHeader
        title="GL Code Mapping"
        description="Map payroll and financial entries to General Ledger codes for accounting integration."
      >
        <Button
          size="sm"
          className="gradient-ey text-primary-foreground font-semibold"
          onClick={handleSave}
          disabled={saveMappings.isPending || isLoading}
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMappings.isPending ? "Saving…" : "Save Mappings"}
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        categories.map((cat) => (
          <div key={cat} className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {cat}
            </h3>
            <div className="bg-card rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Entry</TableHead>
                    <TableHead className="font-semibold">GL Code</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries
                    .filter((m) => m.category === cat)
                    .map((m) => (
                      <TableRow key={m.entry}>
                        <TableCell className="font-medium">{m.entry}</TableCell>
                        <TableCell>
                          <Input
                            className="max-w-[200px] h-8 text-sm"
                            placeholder="e.g. 5100-001"
                            value={m.glCode}
                            onChange={(e) => updateCode(m.entry, e.target.value)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
