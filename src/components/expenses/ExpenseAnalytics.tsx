import { useState, useMemo } from "react";
import { expenses, payrollRuns } from "@/data/mockData";
import { useEmployees } from "@/contexts/EmployeeContext";
import { ExpenseReimbursement } from "@/types/hcm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp, DollarSign, Users, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

type GroupBy = "category" | "employee";

function getCompletedRuns() {
  return payrollRuns
    .filter(r => r.status === "completed")
    .map(r => ({ id: r.id, label: `${r.month} ${r.year}` }));
}

function getExpensesForRun(runId: string, allExpenses: ExpenseReimbursement[]): ExpenseReimbursement[] {
  return allExpenses.filter(exp => exp.payrollRunId === runId && (exp.status === "approved" || exp.status === "paid"));
}

function groupExpenses(
  exps: ExpenseReimbursement[],
  groupBy: GroupBy
): Map<string, number> {
  const map = new Map<string, number>();
  for (const exp of exps) {
    const key = groupBy === "category" ? exp.category : exp.employeeName;
    map.set(key, (map.get(key) || 0) + exp.amount);
  }
  return map;
}

export default function ExpenseAnalytics() {
  const { employees } = useEmployees();
  const completedRuns = getCompletedRuns();

  const [baseRunId, setBaseRunId] = useState(completedRuns[0]?.id || "");
  const [compareRunId, setCompareRunId] = useState(completedRuns[1]?.id || completedRuns[0]?.id || "");
  const [groupBy, setGroupBy] = useState<GroupBy>("category");

  const allExpenses = useMemo(() => [...expenses], []);

  const baseLabel = completedRuns.find(r => r.id === baseRunId)?.label || "Period 1";
  const compareLabel = completedRuns.find(r => r.id === compareRunId)?.label || "Period 2";

  const baseExpenses = useMemo(() => getExpensesForRun(baseRunId, allExpenses), [baseRunId, allExpenses]);
  const compareExpenses = useMemo(() => getExpensesForRun(compareRunId, allExpenses), [compareRunId, allExpenses]);

  const baseTotal = baseExpenses.reduce((s, e) => s + e.amount, 0);
  const compareTotal = compareExpenses.reduce((s, e) => s + e.amount, 0);
  const totalChange = compareTotal - baseTotal;
  const totalChangePct = baseTotal > 0 ? (totalChange / baseTotal) * 100 : compareTotal > 0 ? 100 : 0;

  const baseCount = baseExpenses.length;
  const compareCount = compareExpenses.length;

  const baseGrouped = useMemo(() => groupExpenses(baseExpenses, groupBy), [baseExpenses, groupBy]);
  const compareGrouped = useMemo(() => groupExpenses(compareExpenses, groupBy), [compareExpenses, groupBy]);

  const allKeys = useMemo(() => {
    const keys = new Set<string>();
    baseGrouped.forEach((_, k) => keys.add(k));
    compareGrouped.forEach((_, k) => keys.add(k));
    return Array.from(keys).sort();
  }, [baseGrouped, compareGrouped]);

  const chartData = useMemo(() => {
    return allKeys.map(key => ({
      name: key,
      [baseLabel]: baseGrouped.get(key) || 0,
      [compareLabel]: compareGrouped.get(key) || 0,
    })).sort((a, b) => (b[compareLabel] as number) - (a[compareLabel] as number));
  }, [allKeys, baseGrouped, compareGrouped, baseLabel, compareLabel]);

  const tableData = useMemo(() => {
    return allKeys.map(key => {
      const base = baseGrouped.get(key) || 0;
      const compare = compareGrouped.get(key) || 0;
      const change = compare - base;
      const changePct = base > 0 ? (change / base) * 100 : compare > 0 ? 100 : 0;
      return { key, base, compare, change, changePct };
    }).sort((a, b) => b.compare - a.compare);
  }, [allKeys, baseGrouped, compareGrouped]);

  const ChangeIndicator = ({ value, percent }: { value: number; percent: number }) => {
    if (value === 0) return <span className="flex items-center gap-1 text-muted-foreground"><Minus className="h-3 w-3" />No change</span>;
    const isUp = value > 0;
    return (
      <span className={cn("flex items-center gap-1 text-xs font-semibold", isUp ? "text-red-600" : "text-green-600")}>
        {isUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
        {isUp ? "+" : ""}{value.toLocaleString()} ({percent.toFixed(1)}%)
      </span>
    );
  };

  if (completedRuns.length < 1) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No completed payroll runs available for analysis. Expenses are linked to payroll periods upon approval.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period selectors & Group By */}
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Base Period</label>
          <Select value={baseRunId} onValueChange={setBaseRunId}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {completedRuns.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Compare Period</label>
          <Select value={compareRunId} onValueChange={setCompareRunId}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {completedRuns.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Group By</label>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="category">Category</SelectItem>
              <SelectItem value="employee">Employee</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Expenses</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold">SAR {compareTotal.toLocaleString()}</span>
            </div>
            <div className="mt-1">
              <ChangeIndicator value={totalChange} percent={totalChangePct} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">vs {baseLabel}: SAR {baseTotal.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Claims Count</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold">{compareCount}</span>
              {compareCount !== baseCount && (
                <span className={cn("text-xs font-semibold", compareCount > baseCount ? "text-red-600" : "text-green-600")}>
                  {compareCount > baseCount ? "+" : ""}{compareCount - baseCount} vs prior
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{baseLabel}: {baseCount} claims</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Avg per Claim</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold">SAR {compareCount > 0 ? Math.round(compareTotal / compareCount).toLocaleString() : "0"}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {baseLabel}: SAR {baseCount > 0 ? Math.round(baseTotal / baseCount).toLocaleString() : "0"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Spend by {groupBy === "category" ? "Category" : "Employee"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => `SAR ${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey={baseLabel} fill="hsl(var(--muted-foreground) / 0.3)" radius={[0, 4, 4, 0]} />
                  <Bar dataKey={compareLabel} fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Detailed Comparison — by {groupBy === "category" ? "Category" : "Employee"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">{groupBy === "category" ? "Category" : "Employee"}</TableHead>
                <TableHead className="font-semibold text-right">{baseLabel}</TableHead>
                <TableHead className="font-semibold text-right">{compareLabel}</TableHead>
                <TableHead className="font-semibold text-right">Change</TableHead>
                <TableHead className="font-semibold text-right">% Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.length > 0 ? tableData.map(row => (
                <TableRow key={row.key}>
                  <TableCell className="font-medium">{row.key}</TableCell>
                  <TableCell className="text-right">SAR {row.base.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-semibold">SAR {row.compare.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <span className={cn(
                      "font-semibold",
                      row.change > 0 ? "text-red-600" : row.change < 0 ? "text-green-600" : "text-muted-foreground"
                    )}>
                      {row.change > 0 ? "+" : ""}{row.change.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className={cn(
                      "text-xs",
                      row.change > 0 ? "border-red-200 text-red-700" : row.change < 0 ? "border-green-200 text-green-700" : ""
                    )}>
                      {row.changePct > 0 ? "+" : ""}{row.changePct.toFixed(1)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No approved expenses found for the selected periods.
                  </TableCell>
                </TableRow>
              )}
              {tableData.length > 0 && (
                <TableRow className="bg-muted/30 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">SAR {baseTotal.toLocaleString()}</TableCell>
                  <TableCell className="text-right">SAR {compareTotal.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <span className={cn(totalChange > 0 ? "text-red-600" : totalChange < 0 ? "text-green-600" : "")}>
                      {totalChange > 0 ? "+" : ""}{totalChange.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="text-xs">
                      {totalChangePct > 0 ? "+" : ""}{totalChangePct.toFixed(1)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
