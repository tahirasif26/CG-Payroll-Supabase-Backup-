import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useEmployeeTypes } from "@/contexts/EmployeeTypeContext";
import { usePayrollSetups } from "@/contexts/PayrollSetupContext";
import { useEmployees } from "@/contexts/EmployeeContext";
import { useToast } from "@/hooks/use-toast";
import { Check, ChevronDown, ChevronUp, AlertCircle, User, Briefcase, DollarSign, ClipboardCheck, ArrowRight, ArrowLeft, SkipForward, Edit2 } from "lucide-react";
import type { Employee } from "@/types/hcm";

interface AddEmployeeWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeCount: number;
}

interface FormData {
  // Step 1: Personal
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  // Step 2: Work
  department: string;
  designation: string;
  category: string;
  workLocationCountry: string;
  joiningDate: string;
  // Step 3: Compensation
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
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({ 0: true, 1: true, 2: true, 3: true });

  const updateField = useCallback((field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
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
      const valid = validateStep(currentStep);
      if (valid) {
        const newStatuses = [...stepStatuses];
        newStatuses[currentStep] = "complete";
        setStepStatuses(newStatuses);
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const goBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const skipStep = () => {
    if (currentStep < 3) {
      const hasMandatoryMissing = !isStepComplete(currentStep);
      const newStatuses = [...stepStatuses];
      newStatuses[currentStep] = hasMandatoryMissing ? "incomplete" : "complete";
      setStepStatuses(newStatuses);
      setCurrentStep(currentStep + 1);
      if (hasMandatoryMissing) {
        toast({ title: "Step Skipped", description: "Some mandatory fields are missing. You can fill them later.", variant: "destructive" });
      }
    }
  };

  const handleSubmit = () => {
    // Validate all mandatory fields across all steps
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
      // Find first incomplete step
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
    setExpandedSections({ 0: true, 1: true, 2: true, 3: true });
    onOpenChange(false);
  };

  const toggleSection = (idx: number) => {
    setExpandedSections(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const getStepStatusBadge = (idx: number) => {
    const status = stepStatuses[idx];
    if (status === "complete") return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-200 text-[10px]"><Check className="h-3 w-3 mr-0.5" />Complete</Badge>;
    if (status === "incomplete") return <Badge variant="destructive" className="text-[10px]"><AlertCircle className="h-3 w-3 mr-0.5" />Incomplete</Badge>;
    return null;
  };

  const getTypeName = (id: string) => activeTypes.find(t => t.id === id)?.name || id;
  const getSetupName = (id: string) => activeSetups.find(s => s.id === id)?.name || id;

  const renderFieldError = (field: keyof FormData) =>
    errors[field] ? <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors[field]}</p> : null;

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl">Onboard New Employee</DialogTitle>
          <DialogDescription>Complete the steps below to add a new employee to the directory.</DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step, idx) => {
              const StepIcon = step.icon;
              const isActive = idx === currentStep;
              const isDone = stepStatuses[idx] === "complete";
              const isIncomplete = stepStatuses[idx] === "incomplete";
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <button
                    onClick={() => setCurrentStep(idx)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-left",
                      isActive && "bg-primary/10 ring-1 ring-primary/30",
                      !isActive && "hover:bg-muted"
                    )}
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors shrink-0",
                      isActive && "bg-primary text-primary-foreground",
                      isDone && !isActive && "bg-emerald-500 text-white",
                      isIncomplete && !isActive && "bg-destructive text-white",
                      !isActive && !isDone && !isIncomplete && "bg-muted text-muted-foreground"
                    )}>
                      {isDone ? <Check className="h-4 w-4" /> : idx + 1}
                    </div>
                    <div className="hidden sm:block">
                      <p className={cn("text-xs font-medium", isActive ? "text-foreground" : "text-muted-foreground")}>{step.label}</p>
                    </div>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <div className={cn("flex-1 h-0.5 mx-1", isDone ? "bg-emerald-500" : "bg-border")} />
                  )}
                </div>
              );
            })}
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">Step {currentStep + 1} of {STEPS.length} — {STEPS[currentStep].description}</p>
        </div>

        <Separator />

        <ScrollArea className="flex-1 max-h-[50vh]">
          <div className="p-6 space-y-4">

            {/* Step 1: Personal Information */}
            {currentStep === 0 && (
              <Collapsible open={expandedSections[0]} onOpenChange={() => toggleSection(0)}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Personal Information</span>
                    {getStepStatusBadge(0)}
                  </div>
                  {expandedSections[0] ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-2 gap-4">
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
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email Address <span className="text-destructive">*</span></Label>
                    <Input type="email" value={form.email} onChange={e => updateField("email", e.target.value)} placeholder="employee@company.com" className={cn(errors.email && "border-destructive")} />
                    {renderFieldError("email")}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Phone Number</Label>
                      <Input value={form.phone} onChange={e => updateField("phone", e.target.value)} placeholder="+966 ..." />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Date of Birth</Label>
                      <Input type="date" value={form.dateOfBirth} onChange={e => updateField("dateOfBirth", e.target.value)} />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Step 2: Work Information */}
            {currentStep === 1 && (
              <Collapsible open={expandedSections[1]} onOpenChange={() => toggleSection(1)}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Work Information</span>
                    {getStepStatusBadge(1)}
                  </div>
                  {expandedSections[1] ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Department <span className="text-destructive">*</span></Label>
                      <Select value={form.department} onValueChange={v => updateField("department", v)}>
                        <SelectTrigger className={cn(errors.department && "border-destructive")}><SelectValue placeholder="Select department" /></SelectTrigger>
                        <SelectContent>
                          {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {renderFieldError("department")}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Designation <span className="text-destructive">*</span></Label>
                      <Input value={form.designation} onChange={e => updateField("designation", e.target.value)} placeholder="e.g. Associate" className={cn(errors.designation && "border-destructive")} />
                      {renderFieldError("designation")}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Employee Type <span className="text-destructive">*</span></Label>
                      <Select value={form.category} onValueChange={v => updateField("category", v)}>
                        <SelectTrigger className={cn(errors.category && "border-destructive")}><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          {activeTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {renderFieldError("category")}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Job Location</Label>
                      <Input value={form.workLocationCountry} onChange={e => updateField("workLocationCountry", e.target.value)} placeholder="e.g. Saudi Arabia" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Joining Date</Label>
                    <Input type="date" value={form.joiningDate} onChange={e => updateField("joiningDate", e.target.value)} />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Step 3: Compensation Information */}
            {currentStep === 2 && (
              <Collapsible open={expandedSections[2]} onOpenChange={() => toggleSection(2)}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Compensation Information</span>
                    {getStepStatusBadge(2)}
                  </div>
                  {expandedSections[2] ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Base Salary <span className="text-destructive">*</span></Label>
                      <Input type="number" value={form.salary} onChange={e => updateField("salary", e.target.value)} placeholder="e.g. 5000" className={cn(errors.salary && "border-destructive")} />
                      {renderFieldError("salary")}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Payroll Setup <span className="text-destructive">*</span></Label>
                      <Select value={form.payrollSetupId} onValueChange={v => updateField("payrollSetupId", v)}>
                        <SelectTrigger className={cn(errors.payrollSetupId && "border-destructive")}><SelectValue placeholder="Select payroll setup" /></SelectTrigger>
                        <SelectContent>
                          {activeSetups.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.country})</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {renderFieldError("payrollSetupId")}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Bonus</Label>
                      <Input type="number" value={form.bonus} onChange={e => updateField("bonus", e.target.value)} placeholder="Optional bonus amount" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Allowances</Label>
                      <Input type="number" value={form.allowances} onChange={e => updateField("allowances", e.target.value)} placeholder="Optional allowances" />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Step 4: Review */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardCheck className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Review & Confirm</span>
                </div>

                {/* Check for incomplete steps */}
                {stepStatuses.slice(0, 3).some(s => s === "incomplete" || s === "pending") && (
                  <Card className="border-destructive/50 bg-destructive/5">
                    <CardContent className="p-4 flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-destructive">Incomplete Steps</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Some mandatory fields are missing. Click on the incomplete step to fill in the details before submitting.
                        </p>
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

                {/* Summary cards */}
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold flex items-center gap-2"><User className="h-3.5 w-3.5 text-primary" />Personal Information</h4>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCurrentStep(0)}><Edit2 className="h-3 w-3 mr-1" />Edit</Button>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <ReviewField label="First Name" value={form.firstName} required />
                      <ReviewField label="Last Name" value={form.lastName} required />
                      <ReviewField label="Email" value={form.email} required />
                      <ReviewField label="Phone" value={form.phone} />
                      <ReviewField label="Date of Birth" value={form.dateOfBirth} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold flex items-center gap-2"><Briefcase className="h-3.5 w-3.5 text-primary" />Work Information</h4>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCurrentStep(1)}><Edit2 className="h-3 w-3 mr-1" />Edit</Button>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <ReviewField label="Department" value={form.department} required />
                      <ReviewField label="Designation" value={form.designation} required />
                      <ReviewField label="Employee Type" value={form.category ? getTypeName(form.category) : ""} required />
                      <ReviewField label="Location" value={form.workLocationCountry} />
                      <ReviewField label="Joining Date" value={form.joiningDate} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold flex items-center gap-2"><DollarSign className="h-3.5 w-3.5 text-primary" />Compensation</h4>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCurrentStep(2)}><Edit2 className="h-3 w-3 mr-1" />Edit</Button>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <ReviewField label="Base Salary" value={form.salary ? `$${Number(form.salary).toLocaleString()}` : ""} required />
                      <ReviewField label="Payroll Setup" value={form.payrollSetupId ? getSetupName(form.payrollSetupId) : ""} required />
                      <ReviewField label="Bonus" value={form.bonus ? `$${Number(form.bonus).toLocaleString()}` : ""} />
                      <ReviewField label="Allowances" value={form.allowances ? `$${Number(form.allowances).toLocaleString()}` : ""} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>

        <Separator />

        {/* Navigation buttons */}
        <div className="p-4 flex items-center justify-between">
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
      </DialogContent>
    </Dialog>
  );
}

function ReviewField({ label, value, required }: { label: string; value: string; required?: boolean }) {
  const isMissing = required && !value;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}{required && <span className="text-destructive"> *</span>}</p>
      {isMissing ? (
        <p className="text-xs text-destructive flex items-center gap-1 mt-0.5"><AlertCircle className="h-3 w-3" />Missing</p>
      ) : (
        <p className="text-sm font-medium">{value || "—"}</p>
      )}
    </div>
  );
}
