import { useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCompletedRuns, computeComparison } from "@/data/payrollAnalyticsData";
import { ArrowUpRight, ArrowDownRight, Users, DollarSign, TrendingUp, Minus, UserPlus, UserMinus, RefreshCw } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-SA", { style: "decimal", maximumFractionDigits: 0 }).format(n);

const fmtCurrency = (n: number) => `SAR ${fmt(n)}`;

function DeltaBadge({ value, suffix = "" }: { value: number; suffix?: string }) {
  if (value === 0) return <span className="text-muted-foreground text-xs flex items-center gap-1"><Minus className="h-3 w-3" />No change</span>;
  const isPositive = value > 0;
  return (
    <span className={`text-xs font-medium flex items-center gap-0.5 ${isPositive ? "text-success" : "text-destructive"}`}>
      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {isPositive ? "+" : ""}{typeof suffix === "string" && suffix === "%" ? `${value.toFixed(1)}%` : fmtCurrency(Math.abs(value))}
    </span>
  );
}

export default function PayrollAnalyticsPage() {
  const runs = getCompletedRuns();
  const [baseRunId, setBaseRunId] = useState(runs[0]?.id || "");
  const [compareRunId, setCompareRunId] = useState(runs[1]?.id || "");

  const comparison = useMemo(
    () => (baseRunId && compareRunId ? computeComparison(baseRunId, compareRunId) : null),
    [baseRunId, compareRunId]
  );

  // Waterfall chart data
  const waterfallData = useMemo(() => {
    if (!comparison) return [];
    let running = 0;
    return comparison.bridge.map((item) => {
      if (item.type === "total") {
        const result = { name: item.label, value: item.value, start: 0, fill: "hsl(233, 90%, 60%)" };
        running = item.value;
        return result;
      }
      const start = running;
      running += item.value;
      return {
        name: item.label,
        value: Math.abs(item.value),
        start: item.value >= 0 ? start : running,
        fill: item.value >= 0 ? "hsl(152, 69%, 40%)" : "hsl(0, 72%, 51%)",
      };
    });
  }, [comparison]);

  // Department chart data
  const deptChartData = useMemo(() => {
    if (!comparison) return [];
    return comparison.departmentBreakdown.map((d) => ({
      department: d.department,
      [comparison.baseRun.runLabel]: d.base,
      [comparison.compareRun.runLabel]: d.compare,
    }));
  }, [comparison]);

  // Composition pie
  const compositionData = useMemo(() => {
    if (!comparison) return [];
    const deptTotals = new Map<string, number>();
    for (const e of comparison.compareRun.employees) {
      deptTotals.set(e.department, (deptTotals.get(e.department) || 0) + e.grossPay);
    }
    const COLORS = ["hsl(233, 90%, 60%)", "hsl(213, 94%, 55%)", "hsl(152, 69%, 40%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)", "hsl(280, 70%, 55%)"];
    return Array.from(deptTotals.entries()).map(([dept, total], i) => ({
      name: dept,
      value: total,
      fill: COLORS[i % COLORS.length],
    }));
  }, [comparison]);

  if (runs.length < 2) {
    return (
      <div>
        <PageHeader title="Payroll Analytics" description="Compare payroll runs to identify trends and changes." />
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            At least two completed payroll runs are required for comparison analytics.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Payroll Analytics" description="Compare payroll runs to identify trends and changes." />

      {/* Run Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Base Period</span>
              <Select value={baseRunId} onValueChange={setBaseRunId}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {runs.map((r) => (
                    <SelectItem key={r.id} value={r.id} disabled={r.id === compareRunId}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <RefreshCw className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <div className="flex items-center gap-2 flex-1">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Compare Period</span>
              <Select value={compareRunId} onValueChange={setCompareRunId}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {runs.map((r) => (
                    <SelectItem key={r.id} value={r.id} disabled={r.id === baseRunId}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {comparison && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gross Pay</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{fmtCurrency(comparison.compareGross)}</p>
                    <DeltaBadge value={comparison.grossChange} />
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Net Pay</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{fmtCurrency(comparison.compareNet)}</p>
                    <DeltaBadge value={comparison.netChange} />
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-info" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Deductions</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{fmtCurrency(comparison.compareDeductions)}</p>
                    <DeltaBadge value={comparison.deductionsChange} />
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-warning" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Headcount</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{comparison.compareHeadcount}</p>
                    <DeltaBadge value={comparison.headcountChange} />
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="bridge" className="space-y-4">
            <TabsList>
              <TabsTrigger value="bridge">Gross Pay Bridge</TabsTrigger>
              <TabsTrigger value="department">By Department</TabsTrigger>
              <TabsTrigger value="composition">Cost Composition</TabsTrigger>
              <TabsTrigger value="changes">Employee Changes</TabsTrigger>
            </TabsList>

            {/* Bridge Chart */}
            <TabsContent value="bridge">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Gross Pay Waterfall</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={waterfallData} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="fill-muted-foreground" />
                        <Tooltip
                          formatter={(value: number) => [fmtCurrency(value), "Amount"]}
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem" }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {waterfallData.map((entry, index) => (
                            <Cell key={index} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Department Comparison */}
            <TabsContent value="department">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Department Cost Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={deptChartData} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="department" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="fill-muted-foreground" />
                        <Tooltip
                          formatter={(value: number) => [fmtCurrency(value)]}
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem" }}
                        />
                        <Legend />
                        <Bar dataKey={comparison.baseRun.runLabel} fill="hsl(233, 90%, 60%)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey={comparison.compareRun.runLabel} fill="hsl(213, 94%, 55%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Department table */}
                  <Table className="mt-6">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Department</TableHead>
                        <TableHead className="text-right">{comparison.baseRun.runLabel}</TableHead>
                        <TableHead className="text-right">{comparison.compareRun.runLabel}</TableHead>
                        <TableHead className="text-right">Change</TableHead>
                        <TableHead className="text-right">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparison.departmentBreakdown.map((d) => (
                        <TableRow key={d.department}>
                          <TableCell className="font-medium">{d.department}</TableCell>
                          <TableCell className="text-right">{fmtCurrency(d.base)}</TableCell>
                          <TableCell className="text-right">{fmtCurrency(d.compare)}</TableCell>
                          <TableCell className="text-right">
                            <DeltaBadge value={d.change} />
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={d.changePercent > 0 ? "text-success" : d.changePercent < 0 ? "text-destructive" : "text-muted-foreground"}>
                              {d.changePercent > 0 ? "+" : ""}{d.changePercent.toFixed(1)}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Composition */}
            <TabsContent value="composition">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Payroll Cost Composition — {comparison.compareRun.runLabel}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={compositionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={110}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {compositionData.map((entry, index) => (
                            <Cell key={index} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [fmtCurrency(value)]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Employee Changes */}
            <TabsContent value="changes">
              <div className="space-y-4">
                {/* New Hires */}
                {comparison.newHires.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-success" />
                        New Hires ({comparison.newHires.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Designation</TableHead>
                            <TableHead className="text-right">Gross Pay</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {comparison.newHires.map((e) => (
                            <TableRow key={e.employeeId}>
                              <TableCell className="font-medium">{e.name}</TableCell>
                              <TableCell>{e.department}</TableCell>
                              <TableCell>{e.designation}</TableCell>
                              <TableCell className="text-right">{fmtCurrency(e.grossPay)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {/* Separations */}
                {comparison.separations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <UserMinus className="h-4 w-4 text-destructive" />
                        Separations ({comparison.separations.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Designation</TableHead>
                            <TableHead className="text-right">Gross Pay (Lost)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {comparison.separations.map((e) => (
                            <TableRow key={e.employeeId}>
                              <TableCell className="font-medium">{e.name}</TableCell>
                              <TableCell>{e.department}</TableCell>
                              <TableCell>{e.designation}</TableCell>
                              <TableCell className="text-right text-destructive">{fmtCurrency(e.grossPay)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {/* Salary Changes */}
                {comparison.salaryChanges.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-info" />
                        Salary Changes ({comparison.salaryChanges.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead className="text-right">Previous Gross</TableHead>
                            <TableHead className="text-right">New Gross</TableHead>
                            <TableHead className="text-right">Change</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {comparison.salaryChanges.map((sc) => (
                            <TableRow key={sc.employee.employeeId}>
                              <TableCell className="font-medium">{sc.employee.name}</TableCell>
                              <TableCell>{sc.employee.department}</TableCell>
                              <TableCell className="text-right">{fmtCurrency(sc.oldGross)}</TableCell>
                              <TableCell className="text-right">{fmtCurrency(sc.newGross)}</TableCell>
                              <TableCell className="text-right">
                                <DeltaBadge value={sc.newGross - sc.oldGross} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {comparison.newHires.length === 0 && comparison.separations.length === 0 && comparison.salaryChanges.length === 0 && (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      No employee changes detected between these two periods.
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
