import { useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { getCompletedRuns, computeComparison, PayrollEmployeeDetail } from "@/data/payrollAnalyticsData";
import { departments, divisions } from "@/data/settingsData";
import { workLocationCountries } from "@/data/settingsData";
import { ArrowUpRight, ArrowDownRight, Users, DollarSign, TrendingUp, Minus, UserPlus, UserMinus, RefreshCw, Filter } from "lucide-react";
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

  // Composition filters
  const [compDivision, setCompDivision] = useState("all");
  const [compDepartment, setCompDepartment] = useState("all");
  const [compLocation, setCompLocation] = useState("all");
  const [compCurrency, setCompCurrency] = useState("all");
  const [compCategory, setCompCategory] = useState("all");
  const [compMetric, setCompMetric] = useState<"gross" | "count">("gross");

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

  // Filtered employees for composition
  const filteredCompareEmployees = useMemo(() => {
    if (!comparison) return [];
    return comparison.compareRun.employees.filter((e) => {
      if (compDivision !== "all" && e.division !== compDivision) return false;
      if (compDepartment !== "all" && e.department !== compDepartment) return false;
      if (compLocation !== "all" && e.workLocationCountry !== compLocation) return false;
      if (compCurrency !== "all" && e.payCurrency !== compCurrency) return false;
      if (compCategory !== "all" && e.category !== compCategory) return false;
      return true;
    });
  }, [comparison, compDivision, compDepartment, compLocation, compCurrency, compCategory]);

  // Composition pie (grouped by department)
  const compositionData = useMemo(() => {
    const deptTotals = new Map<string, number>();
    for (const e of filteredCompareEmployees) {
      const val = compMetric === "gross" ? e.grossPay : 1;
      deptTotals.set(e.department, (deptTotals.get(e.department) || 0) + val);
    }
    const COLORS = ["hsl(233, 90%, 60%)", "hsl(213, 94%, 55%)", "hsl(152, 69%, 40%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)", "hsl(280, 70%, 55%)"];
    return Array.from(deptTotals.entries()).map(([dept, total], i) => ({
      name: dept,
      value: total,
      fill: COLORS[i % COLORS.length],
    }));
  }, [filteredCompareEmployees, compMetric]);

  // Unique values for composition filters
  const compFilterOptions = useMemo(() => {
    if (!comparison) return { divisions: [], departments: [], locations: [], currencies: [] };
    const emps = comparison.compareRun.employees;
    return {
      divisions: [...new Set(emps.map(e => e.division))].sort(),
      departments: [...new Set(emps.map(e => e.department))].sort(),
      locations: [...new Set(emps.map(e => e.workLocationCountry))].sort(),
      currencies: [...new Set(emps.map(e => e.payCurrency))].sort(),
    };
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
              <TabsTrigger value="composition">Composition</TabsTrigger>
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
                  <CardTitle className="text-base flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Composition — {comparison.compareRun.runLabel}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Filters */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Division</Label>
                      <Select value={compDivision} onValueChange={setCompDivision}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Divisions</SelectItem>
                          {compFilterOptions.divisions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Department</Label>
                      <Select value={compDepartment} onValueChange={setCompDepartment}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Departments</SelectItem>
                          {compFilterOptions.departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Work Location</Label>
                      <Select value={compLocation} onValueChange={setCompLocation}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Locations</SelectItem>
                          {compFilterOptions.locations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Pay Currency</Label>
                      <Select value={compCurrency} onValueChange={setCompCurrency}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Currencies</SelectItem>
                          {compFilterOptions.currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Category</Label>
                      <Select value={compCategory} onValueChange={setCompCategory}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="direct">Direct Employee</SelectItem>
                          <SelectItem value="contractor">Contractor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Metric</Label>
                      <Select value={compMetric} onValueChange={(v) => setCompMetric(v as "gross" | "count")}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gross">Gross Pay</SelectItem>
                          <SelectItem value="count">Headcount</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Active filter badges */}
                  {(compDivision !== "all" || compDepartment !== "all" || compLocation !== "all" || compCurrency !== "all" || compCategory !== "all") && (
                    <div className="flex flex-wrap gap-1.5">
                      {compDivision !== "all" && <Badge variant="secondary" className="text-xs">Division: {compDivision}</Badge>}
                      {compDepartment !== "all" && <Badge variant="secondary" className="text-xs">Dept: {compDepartment}</Badge>}
                      {compLocation !== "all" && <Badge variant="secondary" className="text-xs">Location: {compLocation}</Badge>}
                      {compCurrency !== "all" && <Badge variant="secondary" className="text-xs">Currency: {compCurrency}</Badge>}
                      {compCategory !== "all" && <Badge variant="secondary" className="text-xs">Category: {compCategory}</Badge>}
                    </div>
                  )}

                  {/* Pie Chart */}
                  {compositionData.length > 0 ? (
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
                          <Tooltip formatter={(value: number) => [compMetric === "gross" ? fmtCurrency(value) : `${value} employees`]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
                      No employees match the selected filters.
                    </div>
                  )}

                  {/* Summary */}
                  <div className="text-sm text-muted-foreground text-center">
                    {filteredCompareEmployees.length} employee{filteredCompareEmployees.length !== 1 ? "s" : ""} 
                    {compMetric === "gross" && ` — Total: ${fmtCurrency(filteredCompareEmployees.reduce((s, e) => s + e.grossPay, 0))}`}
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
