import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";
import { expenseCategories } from "@/data/settingsData";

interface GLMapping {
  id: string;
  entry: string;
  category: string;
  glCode: string;
}

const buildMappings = (): GLMapping[] => {
  const fixed: GLMapping[] = [
    { id: "1", entry: "Basic Salary", category: "Salary", glCode: "" },
    { id: "2", entry: "Housing Allowance", category: "Allowance", glCode: "" },
    { id: "3", entry: "Travel Allowance", category: "Allowance", glCode: "" },
    { id: "4", entry: "Medical Allowance", category: "Allowance", glCode: "" },
    { id: "5", entry: "Other Allowances", category: "Allowance", glCode: "" },
    { id: "6", entry: "GOSI (Employee)", category: "Deduction", glCode: "" },
    { id: "7", entry: "GOSI (Employer)", category: "Deduction", glCode: "" },
    { id: "8", entry: "Medical Insurance", category: "Deduction", glCode: "" },
    { id: "9", entry: "Loan Deduction", category: "Deduction", glCode: "" },
    { id: "10", entry: "Loan Disbursement", category: "Loan", glCode: "" },
    { id: "11", entry: "Advance Given", category: "Advance", glCode: "" },
    { id: "12", entry: "Net Pay", category: "Payable", glCode: "" },
  ];

  // Dynamically add expense categories
  const expenseMappings: GLMapping[] = expenseCategories
    .filter(c => c.isActive)
    .map((c, i) => ({
      id: `exp_${c.id}`,
      entry: `Expense: ${c.name}`,
      category: "Expense Reimbursement",
      glCode: "",
    }));

  return [...fixed, ...expenseMappings];
};

export default function GLCodeMappingPage() {
  const [mappings, setMappings] = useState<GLMapping[]>(() => {
    const saved = localStorage.getItem("gl_mappings");
    if (saved) {
      const parsed: GLMapping[] = JSON.parse(saved);
      // Merge with current template to pick up new expense categories
      const template = buildMappings();
      return template.map(t => {
        const existing = parsed.find(p => p.id === t.id);
        return existing ? { ...t, glCode: existing.glCode } : t;
      });
    }
    return buildMappings();
  });
  const { toast } = useToast();

  const updateCode = (id: string, code: string) => {
    setMappings(prev => prev.map(m => m.id === id ? { ...m, glCode: code } : m));
  };

  const handleSave = () => {
    localStorage.setItem("gl_mappings", JSON.stringify(mappings));
    toast({ title: "Saved", description: "GL code mappings have been saved." });
  };

  // Group mappings by category for display
  const categories = Array.from(new Set(mappings.map(m => m.category)));

  return (
    <div className="space-y-6">
      <PageHeader title="GL Code Mapping" description="Map payroll and financial entries to General Ledger codes for accounting integration.">
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />Save Mappings
        </Button>
      </PageHeader>

      {categories.map(cat => (
        <div key={cat} className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{cat}</h3>
          <div className="bg-card rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Entry</TableHead>
                  <TableHead className="font-semibold">GL Code</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.filter(m => m.category === cat).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.entry}</TableCell>
                    <TableCell>
                      <Input
                        className="max-w-[200px] h-8 text-sm"
                        placeholder="e.g. 5100-001"
                        value={m.glCode}
                        onChange={(e) => updateCode(m.id, e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
}
