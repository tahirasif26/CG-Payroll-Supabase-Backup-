import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

interface GLMapping {
  id: string;
  entry: string;
  category: string;
  glCode: string;
}

const defaultMappings: GLMapping[] = [
  { id: "1", entry: "Basic Salary", category: "Salary", glCode: "" },
  { id: "2", entry: "Housing Allowance", category: "Allowance", glCode: "" },
  { id: "3", entry: "Travel Allowance", category: "Allowance", glCode: "" },
  { id: "4", entry: "Medical Allowance", category: "Allowance", glCode: "" },
  { id: "5", entry: "Other Allowances", category: "Allowance", glCode: "" },
  { id: "6", entry: "GOSI (Employee)", category: "Deduction", glCode: "" },
  { id: "7", entry: "GOSI (Employer)", category: "Deduction", glCode: "" },
  { id: "8", entry: "Medical Insurance", category: "Deduction", glCode: "" },
  { id: "9", entry: "Loan Deduction", category: "Deduction", glCode: "" },
  { id: "10", entry: "Expense Reimbursement", category: "Reimbursement", glCode: "" },
  { id: "11", entry: "Net Pay", category: "Payable", glCode: "" },
  { id: "12", entry: "Salary Expense", category: "Expense", glCode: "" },
];

export default function GLCodeMappingPage() {
  const [mappings, setMappings] = useState<GLMapping[]>(() => {
    const saved = localStorage.getItem("gl_mappings");
    return saved ? JSON.parse(saved) : defaultMappings;
  });
  const { toast } = useToast();

  const updateCode = (id: string, code: string) => {
    setMappings(prev => prev.map(m => m.id === id ? { ...m, glCode: code } : m));
  };

  const handleSave = () => {
    localStorage.setItem("gl_mappings", JSON.stringify(mappings));
    toast({ title: "Saved", description: "GL code mappings have been saved." });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="GL Code Mapping" description="Map payroll entries to General Ledger codes for accounting integration.">
        <Button size="sm" className="gradient-ey text-primary-foreground font-semibold" onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />Save Mappings
        </Button>
      </PageHeader>

      <div className="bg-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Entry</TableHead>
              <TableHead className="font-semibold">Category</TableHead>
              <TableHead className="font-semibold">GL Code</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappings.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.entry}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                    {m.category}
                  </span>
                </TableCell>
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
  );
}
