import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useEmployeeTypes } from "@/contexts/EmployeeTypeContext";
import { usePayrollSetups } from "@/contexts/PayrollSetupContext";
import { useEmployees } from "@/contexts/EmployeeContext";
import { useToast } from "@/hooks/use-toast";
import {
  Check, AlertCircle, User, Briefcase, DollarSign, ClipboardCheck,
  ArrowRight, ArrowLeft, SkipForward, Edit2, ChevronLeft, Calculator, Settings
} from "lucide-react";
import type { Employee } from "@/types/hcm";

interface AddEmployeeWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeCount: number;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  department: string;
  designation: string;
  category: string;
  workLocationCountry: string;
  joiningDate: string;
  salary: string;
  payrollSetupId: string;
  bonus: string;
  allowances: string;
}

const INITIAL_FORM: FormData = {
  firstName: "", lastName: "", email: "", phone: "", dateOfBirth: "",
  department: "", designation: "", category: "", workLocationCountry: "", joiningDate: "",
  salary: "", payrollSetupId: "", bonus: "", allowances: "",
};

const STEPS = [
  { id: 0, label: "Personal", icon: User, description: "Basic personal information" },
  { id: 1, label: "Work", icon: Briefcase, description: "Employment details" },
  { id: 2, label: "Compensation", icon: DollarSign, description: "Salary & payroll setup" },
  { id: 3, label: "Review", icon: ClipboardCheck, description: "Confirm & submit" },
];

const DEPARTMENTS = ["Assurance", "Tax", "Advisory", "Strategy", "Technology"];

type StepStatus = "pending" | "complete" | "incomplete";

export function AddEmployeeWizard({ open, onOpenChange, employeeCount }: AddEmployeeWizardProps) {
  const { activeTypes } = useEmployeeTypes();
  const { setups } = usePayrollSetups();
  const { addEmployee } = useEmployees();
  const { toast } = useToast();
  const activeSetups = setups.filter(s => s.status === "active");

  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>(["pending", "pending", "pending", "pending"]);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const selectedSetup = useMemo(() => {
    return activeSetups.find(s => s.id === form.payrollSetupId);
  }, [form.payrollSetupId, activeSetups]);

  // Real-time salary calculation from payroll setup
  const salaryBreakdown = useMemo(() => {
    if (!selectedSetup || !form.salary || Number(form.salary) <= 0) return null;
    const baseSalary = Number(form.salary);
    const earnings = selectedSetup.payslipComponents
      .filter(c => c.type === "earning" && c.status === "active")
      .map(comp => ({
        name: comp.name,
        calculationType: comp.calculationType,
        percentage: comp.calculationType === "percentage" ? comp.value : undefined,
        amount: comp.calculationType === "percentage"
          ? Math.round(baseSalary * comp.value / 100)
          : comp.value,
      }));
    const deductions = selectedSetup.payslipComponents
      .filter(c => c.type === "deduction" && c.status === "active")
      .map(comp => ({
        name: comp.name,
        calculationType: comp.calculationType,
        percentage: comp.calculationType === "percentage" ? comp.value : undefined,
        amount: comp.calculationType === "percentage"
          ? Math.round(baseSalary * comp.value / 100)
          : comp.value,
      }));
    const totalEarnings = earnings.reduce((s, c) => s + c.amount, 0);
    const totalDeductions = deductions.reduce((s, c) => s + c.amount, 0);

    // Tax calculation
    let taxAmount = 0;
    if (selectedSetup.options.enableTaxCalculation && selectedSetup.taxRules.length > 0) {
      const annualGross = totalEarnings * 12;
      selectedSetup.taxRules.forEach(slab => {
        if (annualGross > slab.incomeFrom) {
          const taxable = Math.min(annualGross, slab.incomeTo) - slab.incomeFrom;
          if (taxable > 0) taxAmount += Math.round(taxable * slab.percentage / 100 / 12);
        }
      });
    }

    return { earnings, deductions, totalEarnings, totalDeductions, taxAmount, netSalary: totalEarnings - totalDeductions - taxAmount };
  }, [selectedSetup, form.salary]);

  const updateField = useCallback((field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
  }, []);

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (step === 0) {
      if (!form.firstName.trim()) newErrors.firstName = "First name is required";
      if (!form.lastName.trim()) newErrors.lastName = "Last name is required";
      if (!form.email.trim()) newErrors.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = "Invalid email address";
    } else if (step === 1) {
      if (!form.department) newErrors.department = "Department is required";
      if (!form.designation.trim()) newErrors.designation = "Designation is required";
      if (!form.category) newErrors.category = "Employee type is required";
    } else if (step === 2) {
      if (!form.salary || Number(form.salary) <= 0) newErrors.salary = "Valid salary is required";
      if (!form.payrollSetupId) newErrors.payrollSetupId = "Payroll setup is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isStepComplete = (step: number): boolean => {
    if (step === 0) return !!(form.firstName && form.lastName && form.email);
    if (step === 1) return !!(form.department && form.designation && form.category);
    if (step === 2) return !!(form.salary && form.payrollSetupId);
    return false;
  };

  const goNext = () => {
    if (currentStep < 3) {
      if (validateStep(currentStep)) {
        const s = [...stepStatuses]; s[currentStep] = "complete"; setStepStatuses(s);
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const goBack = () => { if (currentStep > 0) setCurrentStep(currentStep - 1); };

  const skipStep = () => {
    if (currentStep < 3) {
      const missing = !isStepComplete(currentStep);
      const s = [...stepStatuses]; s[currentStep] = missing ? "incomplete" : "complete"; setStepStatuses(s);
      setCurrentStep(currentStep + 1);
      if (missing) toast({ title: "Step Skipped", description: "Some mandatory fields are missing. You can fill them later.", variant: "destructive" });
    }
  };

  const handleSubmit = () => {
    const allErrors: Partial<Record<keyof FormData, string>> = {};
    if (!form.firstName.trim()) allErrors.firstName = "First name is required";
    if (!form.lastName.trim()) allErrors.lastName = "Last name is required";
    if (!form.email.trim()) allErrors.email = "Email is required";
    if (!form.department) allErrors.department = "Department is required";
    if (!form.designation.trim()) allErrors.designation = "Designation is required";
    if (!form.category) allErrors.category = "Employee type is required";
    if (!form.salary || Number(form.salary) <= 0) allErrors.salary = "Valid salary is required";
    if (!form.payrollSetupId) allErrors.payrollSetupId = "Payroll setup is required";

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      if (allErrors.firstName || allErrors.lastName || allErrors.email) setCurrentStep(0);
      else if (allErrors.department || allErrors.designation || allErrors.category) setCurrentStep(1);
      else if (allErrors.salary || allErrors.payrollSetupId) setCurrentStep(2);
      toast({ title: "Incomplete Information", description: "Please fill all mandatory fields before submitting.", variant: "destructive" });
      return;
    }

    const newEmp: Employee = {
      id: String(Date.now()),
      empId: `CG-${String(employeeCount + 1).padStart(3, "0")}`,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone,
      department: form.department,
      designation: form.designation,
      joiningDate: form.joiningDate || new Date().toISOString().split("T")[0],
      salary: Number(form.salary),
      status: "active",
      avatar: "",
      dateOfBirth: form.dateOfBirth,
      category: form.category,
      workLocationCountry: form.workLocationCountry || "Saudi Arabia",
      payrollSetupId: form.payrollSetupId,
      compensation: [],
    };

    addEmployee(newEmp);
    toast({ title: "Employee Added", description: `${newEmp.firstName} ${newEmp.lastName} has been successfully onboarded.` });
    resetAndClose();
  };

  const resetAndClose = () => {
    setForm(INITIAL_FORM);
    setCurrentStep(0);
    setStepStatuses(["pending", "pending", "pending", "pending"]);
    setErrors({});
    onOpenChange(false);
  };

  const getTypeName = (id: string) => activeTypes.find(t => t.id === id)?.name || id;
  const getSetupName = (id: string) => activeSetups.find(s => s.id === id)?.name || id;

  const renderFieldError = (field: keyof FormData) =>
    errors[field] ? <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors[field]}</p> : null;

  if (!open) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={resetAndClose}>
          <ChevronLeft className="h-4 w-4 mr-1" />Back to Directory
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">
            {form.firstName || form.lastName
              ? `${form.firstName} ${form.lastName}`.trim()
              : "New Employee"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {form.designation ? `${form.designation} · ` : ""}
            {form.department || "Complete the steps below to onboard"}
          </p>
        </div>
      </div>

      {/* Stepper */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step, idx) => {
              const isActive = idx === currentStep;
              const isDone = stepStatuses[idx] === "complete";
              const isIncomplete = stepStatuses[idx] === "incomplete";
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <button
                    onClick={() => setCurrentStep(idx)}
                    className={cn(
                      "flex items-center gap-2.5 px-4 py-2.5 rounded-lg transition-all text-left",
                      isActive && "bg-primary/10 ring-1 ring-primary/30",
                      !isActive && "hover:bg-muted"
                    )}
                  >
                    <div className={cn(
                      "h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors shrink-0",
                      isActive && "bg-primary text-primary-foreground",
                      isDone && !isActive && "bg-emerald-500 text-white",
                      isIncomplete && !isActive && "bg-destructive text-white",
                      !isActive && !isDone && !isIncomplete && "bg-muted text-muted-foreground"
                    )}>
                      {isDone ? <Check className="h-4 w-4" /> : idx + 1}
                    </div>
                    <div className="hidden md:block">
                      <p className={cn("text-sm font-medium", isActive ? "text-foreground" : "text-muted-foreground")}>{step.label}</p>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <div className={cn("flex-1 h-0.5 mx-2", isDone ? "bg-emerald-500" : "bg-border")} />
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-3 h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500 ease-out" style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }} />
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Personal */}
      {currentStep === 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4 text-primary" />Personal Information</CardTitle>
            {stepStatuses[0] === "complete" && <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-200 text-[10px]"><Check className="h-3 w-3 mr-0.5" />Complete</Badge>}
            {stepStatuses[0] === "incomplete" && <Badge variant="destructive" className="text-[10px]"><AlertCircle className="h-3 w-3 mr-0.5" />Incomplete</Badge>}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">First Name <span className="text-destructive">*</span></Label>
                <Input value={form.firstName} onChange={e => updateField("firstName", e.target.value)} placeholder="Enter first name" className={cn(errors.firstName && "border-destructive")} />
                {renderFieldError("firstName")}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Last Name <span className="text-destructive">*</span></Label>
                <Input value={form.lastName} onChange={e => updateField("lastName", e.target.value)} placeholder="Enter last name" className={cn(errors.lastName && "border-destructive")} />
                {renderFieldError("lastName")}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email Address <span className="text-destructive">*</span></Label>
                <Input type="email" value={form.email} onChange={e => updateField("email", e.target.value)} placeholder="employee@company.com" className={cn(errors.email && "border-destructive")} />
                {renderFieldError("email")}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone Number</Label>
                <Input value={form.phone} onChange={e => updateField("phone", e.target.value)} placeholder="+966 ..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Date of Birth</Label>
                <Input type="date" value={form.dateOfBirth} onChange={e => updateField("dateOfBirth", e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Work */}
      {currentStep === 1 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" />Work Information</CardTitle>
            {stepStatuses[1] === "complete" && <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-200 text-[10px]"><Check className="h-3 w-3 mr-0.5" />Complete</Badge>}
            {stepStatuses[1] === "incomplete" && <Badge variant="destructive" className="text-[10px]"><AlertCircle className="h-3 w-3 mr-0.5" />Incomplete</Badge>}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Department <span className="text-destructive">*</span></Label>
                <Select value={form.department} onValueChange={v => updateField("department", v)}>
                  <SelectTrigger className={cn(errors.department && "border-destructive")}><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
                {renderFieldError("department")}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Designation <span className="text-destructive">*</span></Label>
                <Input value={form.designation} onChange={e => updateField("designation", e.target.value)} placeholder="e.g. Associate" className={cn(errors.designation && "border-destructive")} />
                {renderFieldError("designation")}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Employee Type <span className="text-destructive">*</span></Label>
                <Select value={form.category} onValueChange={v => updateField("category", v)}>
                  <SelectTrigger className={cn(errors.category && "border-destructive")}><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>{activeTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
                {renderFieldError("category")}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Job Location</Label>
                <Input value={form.workLocationCountry} onChange={e => updateField("workLocationCountry", e.target.value)} placeholder="e.g. Saudi Arabia" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Joining Date</Label>
                <Input type="date" value={form.joiningDate} onChange={e => updateField("joiningDate", e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Compensation */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" />Compensation Information</CardTitle>
              {stepStatuses[2] === "complete" && <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-200 text-[10px]"><Check className="h-3 w-3 mr-0.5" />Complete</Badge>}
              {stepStatuses[2] === "incomplete" && <Badge variant="destructive" className="text-[10px]"><AlertCircle className="h-3 w-3 mr-0.5" />Incomplete</Badge>}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Base Salary <span className="text-destructive">*</span></Label>
                  <Input type="number" value={form.salary} onChange={e => updateField("salary", e.target.value)} placeholder="e.g. 5000" className={cn(errors.salary && "border-destructive")} />
                  {renderFieldError("salary")}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Payroll Setup <span className="text-destructive">*</span></Label>
                  <Select value={form.payrollSetupId} onValueChange={v => updateField("payrollSetupId", v)}>
                    <SelectTrigger className={cn(errors.payrollSetupId && "border-destructive")}><SelectValue placeholder="Select payroll setup" /></SelectTrigger>
                    <SelectContent>{activeSetups.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.country})</SelectItem>)}</SelectContent>
                  </Select>
                  {renderFieldError("payrollSetupId")}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Bonus</Label>
                  <Input type="number" value={form.bonus} onChange={e => updateField("bonus", e.target.value)} placeholder="Optional bonus amount" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Allowances</Label>
                  <Input type="number" value={form.allowances} onChange={e => updateField("allowances", e.target.value)} placeholder="Optional allowances" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payroll Setup Details & Salary Breakdown */}
          {selectedSetup && (
            <>
              {/* Setup Settings Overview */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="h-4 w-4 text-primary" />
                    {selectedSetup.name} — Setup Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Country</p>
                      <p className="text-sm font-medium">{selectedSetup.country}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Currency</p>
                      <p className="text-sm font-medium">{selectedSetup.currency}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Pay Frequency</p>
                      <p className="text-sm font-medium capitalize">{selectedSetup.paySchedule.payFrequency}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Pay Date</p>
                      <p className="text-sm font-medium">{selectedSetup.paySchedule.payDate}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Overtime</p>
                      <p className="text-sm font-medium">{selectedSetup.overtime.enabled ? `${selectedSetup.overtime.rateMultiplier}x (max ${selectedSetup.overtime.maxOvertimeHours}h)` : "Disabled"}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Tax Calculation</p>
                      <p className="text-sm font-medium">{selectedSetup.options.enableTaxCalculation ? "Enabled" : "Disabled"}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Salary Type</p>
                      <p className="text-sm font-medium capitalize">{selectedSetup.salaryRules.salaryType}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Proration</p>
                      <p className="text-sm font-medium capitalize">{selectedSetup.salaryRules.prorationRule.replace("-", " ")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Real-time Salary Breakdown */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-primary" />
                    Salary Breakdown
                    {form.salary && <Badge variant="outline" className="ml-2 text-xs">Live Calculation</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {salaryBreakdown ? (
                    <div className="space-y-4">
                      {/* Earnings */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Earnings</p>
                        <div className="bg-muted/30 rounded-lg overflow-hidden">
                          {salaryBreakdown.earnings.map((item, i) => (
                            <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 last:border-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{item.name}</span>
                                {item.calculationType === "percentage" && (
                                  <Badge variant="secondary" className="text-[10px] h-5">{item.percentage}%</Badge>
                                )}
                                {item.calculationType === "fixed" && (
                                  <Badge variant="outline" className="text-[10px] h-5">Fixed</Badge>
                                )}
                              </div>
                              <span className="text-sm font-semibold">{item.amount.toLocaleString()} {selectedSetup.currency}</span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-500/10 font-semibold">
                            <span className="text-sm">Total Earnings</span>
                            <span className="text-sm text-emerald-600">{salaryBreakdown.totalEarnings.toLocaleString()} {selectedSetup.currency}</span>
                          </div>
                        </div>
                      </div>

                      {/* Deductions */}
                      {salaryBreakdown.deductions.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Deductions</p>
                          <div className="bg-muted/30 rounded-lg overflow-hidden">
                            {salaryBreakdown.deductions.map((item, i) => (
                              <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 last:border-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{item.name}</span>
                                  {item.calculationType === "percentage" && (
                                    <Badge variant="secondary" className="text-[10px] h-5">{item.percentage}%</Badge>
                                  )}
                                </div>
                                <span className="text-sm font-semibold text-destructive">-{item.amount.toLocaleString()} {selectedSetup.currency}</span>
                              </div>
                            ))}
                            <div className="flex items-center justify-between px-4 py-2.5 bg-destructive/10 font-semibold">
                              <span className="text-sm">Total Deductions</span>
                              <span className="text-sm text-destructive">-{salaryBreakdown.totalDeductions.toLocaleString()} {selectedSetup.currency}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Tax */}
                      {salaryBreakdown.taxAmount > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tax</p>
                          <div className="bg-muted/30 rounded-lg overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-2.5">
                              <span className="text-sm">Tax Deduction (from slabs)</span>
                              <span className="text-sm font-semibold text-destructive">-{salaryBreakdown.taxAmount.toLocaleString()} {selectedSetup.currency}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Net Salary */}
                      <div className="flex items-center justify-between bg-primary/10 rounded-lg px-4 py-3.5 font-bold">
                        <span className="text-base">Net Salary</span>
                        <span className="text-base text-primary">{salaryBreakdown.netSalary.toLocaleString()} {selectedSetup.currency}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calculator className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Enter a base salary above to see the real-time breakdown</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Step 4: Review */}
      {currentStep === 3 && (
        <div className="space-y-4">
          {stepStatuses.slice(0, 3).some(s => s === "incomplete" || s === "pending") && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-destructive">Incomplete Steps</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Some mandatory fields are missing. Click on the step to fill details.</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {stepStatuses.slice(0, 3).map((s, i) => (s === "incomplete" || s === "pending") && !isStepComplete(i) ? (
                      <Button key={i} size="sm" variant="outline" className="h-7 text-xs border-destructive/30 text-destructive" onClick={() => setCurrentStep(i)}>
                        <Edit2 className="h-3 w-3 mr-1" />Go to {STEPS[i].label}
                      </Button>
                    ) : null)}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Personal Summary */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4 text-primary" />Personal Information</CardTitle>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCurrentStep(0)}><Edit2 className="h-3 w-3 mr-1" />Edit</Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ReviewField label="First Name" value={form.firstName} required />
                <ReviewField label="Last Name" value={form.lastName} required />
                <ReviewField label="Email" value={form.email} required />
                <ReviewField label="Phone" value={form.phone} />
                <ReviewField label="Date of Birth" value={form.dateOfBirth} />
              </div>
            </CardContent>
          </Card>

          {/* Work Summary */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" />Work Information</CardTitle>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCurrentStep(1)}><Edit2 className="h-3 w-3 mr-1" />Edit</Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ReviewField label="Department" value={form.department} required />
                <ReviewField label="Designation" value={form.designation} required />
                <ReviewField label="Employee Type" value={form.category ? getTypeName(form.category) : ""} required />
                <ReviewField label="Location" value={form.workLocationCountry} />
                <ReviewField label="Joining Date" value={form.joiningDate} />
              </div>
            </CardContent>
          </Card>

          {/* Compensation Summary */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" />Compensation</CardTitle>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCurrentStep(2)}><Edit2 className="h-3 w-3 mr-1" />Edit</Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ReviewField label="Base Salary" value={form.salary ? `${Number(form.salary).toLocaleString()}` : ""} required />
                <ReviewField label="Payroll Setup" value={form.payrollSetupId ? getSetupName(form.payrollSetupId) : ""} required />
                <ReviewField label="Bonus" value={form.bonus ? Number(form.bonus).toLocaleString() : ""} />
                <ReviewField label="Allowances" value={form.allowances ? Number(form.allowances).toLocaleString() : ""} />
                {salaryBreakdown && (
                  <div>
                    <p className="text-xs text-muted-foreground">Calculated Net Salary</p>
                    <p className="text-sm font-bold text-primary">{salaryBreakdown.netSalary.toLocaleString()} {selectedSetup?.currency}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation Buttons */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={goBack} disabled={currentStep === 0}>
              <ArrowLeft className="h-4 w-4 mr-1" />Back
            </Button>
            <div className="flex items-center gap-2">
              {currentStep < 3 && (
                <>
                  <Button variant="ghost" size="sm" onClick={skipStep} className="text-muted-foreground">
                    <SkipForward className="h-4 w-4 mr-1" />Skip
                  </Button>
                  <Button size="sm" onClick={goNext}>
                    Next<ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </>
              )}
              {currentStep === 3 && (
                <Button size="sm" onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Check className="h-4 w-4 mr-1" />Submit & Onboard
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReviewField({ label, value, required }: { label: string; value: string; required?: boolean }) {
  const isMissing = required && !value;
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}{required && <span className="text-destructive"> *</span>}</p>
      {isMissing ? (
        <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />Missing</p>
      ) : (
        <p className="text-sm font-medium">{value || "—"}</p>
      )}
    </div>
  );
}
