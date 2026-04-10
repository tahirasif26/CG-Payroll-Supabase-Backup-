import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useEmployeeTypes } from "@/contexts/EmployeeTypeContext";
import { usePayrollSetups } from "@/contexts/PayrollSetupContext";
import { useEmployees } from "@/contexts/EmployeeContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Check, AlertCircle, User, Briefcase, DollarSign, Calendar, FileText, Monitor,
  ChevronLeft, Calculator, Settings, Phone, MapPin, CreditCard, GraduationCap, Heart,
  Plus, Trash2, Upload, ArrowRight, ArrowLeft, SkipForward
} from "lucide-react";
import type { Employee } from "@/types/hcm";

interface AddEmployeeWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeCount: number;
}

interface FormData {
  // Personal > Basic
  firstName: string; lastName: string; email: string; dateOfBirth: string;
  gender: string; maritalStatus: string; religion: string; nationality: string;
  // Personal > Contact
  personalPhone: string; personalEmail: string;
  emergencyName: string; emergencyRelation: string; emergencyPhone: string; emergencyEmail: string;
  // Personal > Address
  addressLine1: string; addressLine2: string; city: string; state: string; country: string; postalCode: string;
  // Personal > Bank
  bankName: string; bankCountry: string; swiftCode: string; bankAddress: string; iban: string; bankCurrency: string; beneficiaryName: string;
  // Work
  department: string; designation: string; category: string; division: string;
  workEmail: string; workLocationCity: string; workLocationCountry: string; joiningDate: string;
  reportsTo: string;
  // Compensation
  salary: string; payrollSetupId: string; bonus: string; allowances: string;
}

const INITIAL_FORM: FormData = {
  firstName: "", lastName: "", email: "", dateOfBirth: "",
  gender: "", maritalStatus: "", religion: "", nationality: "",
  personalPhone: "", personalEmail: "",
  emergencyName: "", emergencyRelation: "", emergencyPhone: "", emergencyEmail: "",
  addressLine1: "", addressLine2: "", city: "", state: "", country: "", postalCode: "",
  bankName: "", bankCountry: "", swiftCode: "", bankAddress: "", iban: "", bankCurrency: "", beneficiaryName: "",
  department: "", designation: "", category: "", division: "",
  workEmail: "", workLocationCity: "", workLocationCountry: "", joiningDate: "",
  reportsTo: "",
  salary: "", payrollSetupId: "", bonus: "", allowances: "",
};

const TABS = [
  { id: "personal", label: "Personal", icon: User },
  { id: "work", label: "Work", icon: Briefcase },
  { id: "compensation", label: "Compensation", icon: DollarSign },
  { id: "timeoff", label: "Time Off", icon: Calendar },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "assets", label: "Assets", icon: Monitor },
];

const DEPARTMENTS = ["Assurance", "Tax", "Advisory", "Strategy", "Technology"];

export function AddEmployeeWizard({ open, onOpenChange, employeeCount }: AddEmployeeWizardProps) {
  const { activeTypes } = useEmployeeTypes();
  const { setups } = usePayrollSetups();
  const { addEmployee, employees: allEmployees } = useEmployees();
  const { toast } = useToast();
  const activeSetups = setups.filter(s => s.status === "active");
  const activeEmps = allEmployees.filter(e => e.status !== "separated");

  const [activeTab, setActiveTab] = useState("personal");
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [education, setEducation] = useState<{ degree: string; institution: string; year: string; field: string }[]>([]);
  const [dependants, setDependants] = useState<{ name: string; relation: string; dateOfBirth: string }[]>([]);
  const [sendInvite, setSendInvite] = useState(true);
  const [inviting, setInviting] = useState(false);

  const selectedSetup = useMemo(() => activeSetups.find(s => s.id === form.payrollSetupId), [form.payrollSetupId, activeSetups]);

  // Real-time salary calculation
  const salaryBreakdown = useMemo(() => {
    if (!selectedSetup || !form.salary || Number(form.salary) <= 0) return null;
    const baseSalary = Number(form.salary);
    const earnings = selectedSetup.payslipComponents
      .filter(c => c.type === "earning" && c.status === "active")
      .map(comp => ({
        name: comp.name,
        calculationType: comp.calculationType,
        percentage: comp.calculationType === "percentage" ? comp.value : undefined,
        amount: comp.calculationType === "percentage" ? Math.round(baseSalary * comp.value / 100) : comp.value,
      }));
    const deductions = selectedSetup.payslipComponents
      .filter(c => c.type === "deduction" && c.status === "active")
      .map(comp => ({
        name: comp.name,
        calculationType: comp.calculationType,
        percentage: comp.calculationType === "percentage" ? comp.value : undefined,
        amount: comp.calculationType === "percentage" ? Math.round(baseSalary * comp.value / 100) : comp.value,
      }));
    const totalEarnings = earnings.reduce((s, c) => s + c.amount, 0);
    const totalDeductions = deductions.reduce((s, c) => s + c.amount, 0);
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

  const validateAndSubmit = () => {
    const allErrors: Partial<Record<keyof FormData, string>> = {};
    if (!form.firstName.trim()) allErrors.firstName = "Required";
    if (!form.lastName.trim()) allErrors.lastName = "Required";
    if (!form.email.trim()) allErrors.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) allErrors.email = "Invalid email";
    if (!form.department) allErrors.department = "Required";
    if (!form.designation.trim()) allErrors.designation = "Required";
    if (!form.category) allErrors.category = "Required";
    if (!form.salary || Number(form.salary) <= 0) allErrors.salary = "Required";
    if (!form.payrollSetupId) allErrors.payrollSetupId = "Required";

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      if (allErrors.firstName || allErrors.lastName || allErrors.email) setActiveTab("personal");
      else if (allErrors.department || allErrors.designation || allErrors.category) setActiveTab("work");
      else if (allErrors.salary || allErrors.payrollSetupId) setActiveTab("compensation");
      toast({ title: "Incomplete Information", description: "Please fill all mandatory fields.", variant: "destructive" });
      return;
    }

    const newEmp: Employee = {
      id: String(Date.now()),
      empId: `CG-${String(employeeCount + 1).padStart(3, "0")}`,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.personalPhone,
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

    // Send invite email if toggle is on
    if (sendInvite) {
      const inviteEmail = form.workEmail?.trim() || form.personalEmail?.trim() || form.email.trim();
      if (inviteEmail) {
        setInviting(true);
        try {
          const { data: inviteData, error: inviteError } = await supabase.functions.invoke("invite-employee", {
            body: {
              email: inviteEmail,
              full_name: `${form.firstName.trim()} ${form.lastName.trim()}`,
              employee_id: newEmp.empId,
            },
          });
          if (inviteError) throw inviteError;
          toast({ title: "Employee Added & Invited", description: `${newEmp.firstName} ${newEmp.lastName} onboarded. Login invite sent to ${inviteEmail}.` });
        } catch (err: any) {
          toast({ title: "Employee Added", description: `Onboarded successfully, but invite email failed: ${err?.message || "Unknown error"}. You can resend later.`, variant: "destructive" });
        } finally {
          setInviting(false);
        }
      } else {
        toast({ title: "Employee Added", description: `${newEmp.firstName} ${newEmp.lastName} has been onboarded. No email provided for invite.` });
      }
    } else {
      toast({ title: "Employee Added", description: `${newEmp.firstName} ${newEmp.lastName} has been successfully onboarded.` });
    }

    resetAndClose();
  };

  const resetAndClose = () => {
    setForm(INITIAL_FORM);
    setActiveTab("personal");
    setErrors({});
    setEducation([]);
    setDependants([]);
    onOpenChange(false);
  };

  const tabOrder = TABS.map(t => t.id);
  const currentTabIdx = tabOrder.indexOf(activeTab);
  const goNext = () => { if (currentTabIdx < tabOrder.length - 1) setActiveTab(tabOrder[currentTabIdx + 1]); };
  const goBack = () => { if (currentTabIdx > 0) setActiveTab(tabOrder[currentTabIdx - 1]); };
  const skipTab = () => goNext();

  const renderError = (field: keyof FormData) =>
    errors[field] ? <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors[field]}</p> : null;

  if (!open) return null;

  const displayName = form.firstName || form.lastName
    ? `${form.firstName} ${form.lastName}`.trim()
    : "New Employee";
  const displaySub = [form.designation, form.department].filter(Boolean).join(" · ") || "Complete the form below to onboard";

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={resetAndClose}>
          <ChevronLeft className="h-4 w-4 mr-1" />Back to Directory
        </Button>
      </div>

      {/* Header — matching detail view */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
              {form.firstName ? form.firstName[0] : "N"}{form.lastName ? form.lastName[0] : "E"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-bold">{displayName}</h2>
            <p className="text-sm text-muted-foreground">{displaySub}</p>
          </div>
        </div>
        <Button size="sm" onClick={validateAndSubmit} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Check className="h-4 w-4 mr-1" />Submit & Onboard
        </Button>
      </div>

      {/* Tabs — matching detail view */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.id} value={tab.id}>
                <Icon className="h-3.5 w-3.5 mr-1.5" />{tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* ========== PERSONAL TAB ========== */}
        <TabsContent value="personal" className="mt-4 space-y-4">
          {/* Basic Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4 text-primary" />Basic Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">First Name <span className="text-destructive">*</span></p>
                  <Input value={form.firstName} onChange={e => updateField("firstName", e.target.value)} placeholder="Enter first name" className={cn("h-8 text-sm", errors.firstName && "border-destructive")} />
                  {renderError("firstName")}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Last Name <span className="text-destructive">*</span></p>
                  <Input value={form.lastName} onChange={e => updateField("lastName", e.target.value)} placeholder="Enter last name" className={cn("h-8 text-sm", errors.lastName && "border-destructive")} />
                  {renderError("lastName")}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Date of Birth</p>
                  <Input type="date" value={form.dateOfBirth} onChange={e => updateField("dateOfBirth", e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Gender</p>
                  <Select value={form.gender} onValueChange={v => updateField("gender", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Marital Status</p>
                  <Select value={form.maritalStatus} onValueChange={v => updateField("maritalStatus", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Single">Single</SelectItem>
                      <SelectItem value="Married">Married</SelectItem>
                      <SelectItem value="Divorced">Divorced</SelectItem>
                      <SelectItem value="Widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Religion</p>
                  <Input value={form.religion} onChange={e => updateField("religion", e.target.value)} placeholder="e.g. Islam" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Nationality</p>
                  <Input value={form.nationality} onChange={e => updateField("nationality", e.target.value)} placeholder="e.g. Saudi" className="h-8 text-sm" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact & Emergency */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Phone className="h-4 w-4 text-primary" />Contact & Emergency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Personal Contact</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Personal Phone</p>
                    <Input value={form.personalPhone} onChange={e => updateField("personalPhone", e.target.value)} placeholder="+966 ..." className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Personal Email <span className="text-destructive">*</span></p>
                    <Input value={form.email} onChange={e => updateField("email", e.target.value)} placeholder="personal@email.com" className={cn("h-8 text-sm", errors.email && "border-destructive")} />
                    {renderError("email")}
                  </div>
                </div>
                <div className="border-t pt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Emergency Contact</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Name</p>
                      <Input value={form.emergencyName} onChange={e => updateField("emergencyName", e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Relationship</p>
                      <Input value={form.emergencyRelation} onChange={e => updateField("emergencyRelation", e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <Input value={form.emergencyPhone} onChange={e => updateField("emergencyPhone", e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Email</p>
                      <Input value={form.emergencyEmail} onChange={e => updateField("emergencyEmail", e.target.value)} className="h-8 text-sm" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Residential Address */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />Residential Address</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Address Line 1</p>
                  <Input value={form.addressLine1} onChange={e => updateField("addressLine1", e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Address Line 2</p>
                  <Input value={form.addressLine2} onChange={e => updateField("addressLine2", e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">City</p>
                  <Input value={form.city} onChange={e => updateField("city", e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">State / Province</p>
                  <Input value={form.state} onChange={e => updateField("state", e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Country</p>
                  <Input value={form.country} onChange={e => updateField("country", e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Postal Code</p>
                  <Input value={form.postalCode} onChange={e => updateField("postalCode", e.target.value)} className="h-8 text-sm" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bank Account Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" />Bank Account Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Bank Name</p>
                  <Input value={form.bankName} onChange={e => updateField("bankName", e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Bank Country</p>
                  <Input value={form.bankCountry} onChange={e => updateField("bankCountry", e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">SWIFT Code</p>
                  <Input value={form.swiftCode} onChange={e => updateField("swiftCode", e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Bank Address</p>
                  <Input value={form.bankAddress} onChange={e => updateField("bankAddress", e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">IBAN</p>
                  <Input value={form.iban} onChange={e => updateField("iban", e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Currency</p>
                  <Input value={form.bankCurrency} onChange={e => updateField("bankCurrency", e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Beneficiary Name</p>
                  <Input value={form.beneficiaryName} onChange={e => updateField("beneficiaryName", e.target.value)} className="h-8 text-sm" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Education */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2"><GraduationCap className="h-4 w-4 text-primary" />Education</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setEducation([...education, { degree: "", institution: "", year: "", field: "" }])}>
                <Plus className="h-4 w-4 mr-1" />Add Education
              </Button>
            </CardHeader>
            <CardContent>
              {education.length > 0 ? (
                <div className="space-y-4">
                  {education.map((edu, i) => (
                    <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-3 border-b last:border-0 relative">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Degree</p>
                        <Input value={edu.degree} onChange={e => { const u = [...education]; u[i] = { ...u[i], degree: e.target.value }; setEducation(u); }} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Field of Study</p>
                        <Input value={edu.field} onChange={e => { const u = [...education]; u[i] = { ...u[i], field: e.target.value }; setEducation(u); }} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Institution</p>
                        <Input value={edu.institution} onChange={e => { const u = [...education]; u[i] = { ...u[i], institution: e.target.value }; setEducation(u); }} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1 flex gap-2 items-end">
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">Year</p>
                          <Input value={edu.year} onChange={e => { const u = [...education]; u[i] = { ...u[i], year: e.target.value }; setEducation(u); }} className="h-8 text-sm" />
                        </div>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => setEducation(education.filter((_, idx) => idx !== i))}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No education records. Click "Add Education" to add.</p>
              )}
            </CardContent>
          </Card>

          {/* Dependants */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Heart className="h-4 w-4 text-primary" />Dependants</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setDependants([...dependants, { name: "", relation: "", dateOfBirth: "" }])}>
                <Plus className="h-4 w-4 mr-1" />Add Dependant
              </Button>
            </CardHeader>
            <CardContent>
              {dependants.length > 0 ? (
                <div className="space-y-4">
                  {dependants.map((dep, i) => (
                    <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-3 border-b last:border-0">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Name</p>
                        <Input value={dep.name} onChange={e => { const u = [...dependants]; u[i] = { ...u[i], name: e.target.value }; setDependants(u); }} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Relationship</p>
                        <Input value={dep.relation} onChange={e => { const u = [...dependants]; u[i] = { ...u[i], relation: e.target.value }; setDependants(u); }} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1 flex gap-2 items-end">
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">Date of Birth</p>
                          <Input type="date" value={dep.dateOfBirth} onChange={e => { const u = [...dependants]; u[i] = { ...u[i], dateOfBirth: e.target.value }; setDependants(u); }} className="h-8 text-sm" />
                        </div>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => setDependants(dependants.filter((_, idx) => idx !== i))}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No dependants recorded. Click "Add Dependant" to add.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== WORK TAB ========== */}
        <TabsContent value="work" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" />Work Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Employee ID</p>
                  <Input value={`CG-${String(employeeCount + 1).padStart(3, "0")}`} disabled className="h-8 text-sm bg-muted" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Work Email</p>
                  <Input value={form.workEmail} onChange={e => updateField("workEmail", e.target.value)} placeholder="employee@cg.com" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Employee Type <span className="text-destructive">*</span></p>
                  <Select value={form.category} onValueChange={v => updateField("category", v)}>
                    <SelectTrigger className={cn("h-8 text-sm", errors.category && "border-destructive")}><SelectValue placeholder="Select type..." /></SelectTrigger>
                    <SelectContent>{activeTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                  {renderError("category")}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Department <span className="text-destructive">*</span></p>
                  <Select value={form.department} onValueChange={v => updateField("department", v)}>
                    <SelectTrigger className={cn("h-8 text-sm", errors.department && "border-destructive")}><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                  {renderError("department")}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Designation <span className="text-destructive">*</span></p>
                  <Input value={form.designation} onChange={e => updateField("designation", e.target.value)} placeholder="e.g. Associate" className={cn("h-8 text-sm", errors.designation && "border-destructive")} />
                  {renderError("designation")}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Division</p>
                  <Input value={form.division} onChange={e => updateField("division", e.target.value)} placeholder="e.g. Assurance" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Reports To</p>
                  <Select value={form.reportsTo} onValueChange={v => updateField("reportsTo", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select manager..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No Manager</SelectItem>
                      {activeEmps.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} — {e.designation}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Joining Date</p>
                  <Input type="date" value={form.joiningDate} onChange={e => updateField("joiningDate", e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Work Location City</p>
                  <Input value={form.workLocationCity} onChange={e => updateField("workLocationCity", e.target.value)} placeholder="e.g. Riyadh" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Work Location Country</p>
                  <Input value={form.workLocationCountry} onChange={e => updateField("workLocationCountry", e.target.value)} placeholder="e.g. Saudi Arabia" className="h-8 text-sm" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== COMPENSATION TAB ========== */}
        <TabsContent value="compensation" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" />Compensation Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Base Salary <span className="text-destructive">*</span></p>
                  <Input type="number" value={form.salary} onChange={e => updateField("salary", e.target.value)} placeholder="e.g. 5000" className={cn("h-8 text-sm", errors.salary && "border-destructive")} />
                  {renderError("salary")}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Payroll Setup <span className="text-destructive">*</span></p>
                  <Select value={form.payrollSetupId} onValueChange={v => updateField("payrollSetupId", v)}>
                    <SelectTrigger className={cn("h-8 text-sm", errors.payrollSetupId && "border-destructive")}><SelectValue placeholder="Select payroll setup" /></SelectTrigger>
                    <SelectContent>{activeSetups.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.country})</SelectItem>)}</SelectContent>
                  </Select>
                  {renderError("payrollSetupId")}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Bonus</p>
                  <Input type="number" value={form.bonus} onChange={e => updateField("bonus", e.target.value)} placeholder="Optional" className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Allowances</p>
                  <Input type="number" value={form.allowances} onChange={e => updateField("allowances", e.target.value)} placeholder="Optional" className="h-8 text-sm" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Setup Configuration */}
          {selectedSetup && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" />{selectedSetup.name} — Configuration
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
                    <p className="text-sm font-medium">{selectedSetup.overtime.enabled ? `${selectedSetup.overtime.rateMultiplier}x` : "Disabled"}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Tax</p>
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
          )}

          {/* Salary Breakdown */}
          {selectedSetup && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary" />Salary Breakdown
                  {form.salary && <Badge variant="outline" className="ml-2 text-xs">Live</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {salaryBreakdown ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Earnings</p>
                      <div className="bg-muted/30 rounded-lg overflow-hidden">
                        {salaryBreakdown.earnings.map((item, i) => (
                          <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 last:border-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{item.name}</span>
                              {item.calculationType === "percentage" && <Badge variant="secondary" className="text-[10px] h-5">{item.percentage}%</Badge>}
                              {item.calculationType === "fixed" && <Badge variant="outline" className="text-[10px] h-5">Fixed</Badge>}
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
                    {salaryBreakdown.deductions.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Deductions</p>
                        <div className="bg-muted/30 rounded-lg overflow-hidden">
                          {salaryBreakdown.deductions.map((item, i) => (
                            <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 last:border-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{item.name}</span>
                                {item.calculationType === "percentage" && <Badge variant="secondary" className="text-[10px] h-5">{item.percentage}%</Badge>}
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
                    {salaryBreakdown.taxAmount > 0 && (
                      <div className="bg-muted/30 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5">
                          <span className="text-sm">Tax Deduction</span>
                          <span className="text-sm font-semibold text-destructive">-{salaryBreakdown.taxAmount.toLocaleString()} {selectedSetup.currency}</span>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between bg-primary/10 rounded-lg px-4 py-3.5 font-bold">
                      <span className="text-base">Net Salary</span>
                      <span className="text-base text-primary">{salaryBreakdown.netSalary.toLocaleString()} {selectedSetup.currency}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calculator className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Enter a base salary to see the breakdown</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ========== TIME OFF TAB ========== */}
        <TabsContent value="timeoff" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" />Time Off & Vacation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calendar className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Leave allocations will be configured after the employee is onboarded.</p>
                <p className="text-xs text-muted-foreground mt-1">Default leave balances from company policy will be applied automatically.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== DOCUMENTS TAB ========== */}
        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />Documents</CardTitle>
              <Button size="sm" variant="outline" disabled>
                <Upload className="h-4 w-4 mr-2" />Upload
              </Button>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Documents can be uploaded after onboarding is complete.</p>
                <p className="text-xs text-muted-foreground mt-1">You'll be able to upload ID, contracts, certificates, and more from the employee profile.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== ASSETS TAB ========== */}
        <TabsContent value="assets" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Monitor className="h-4 w-4 text-primary" />Tagged Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Monitor className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Assets can be assigned after the employee is onboarded.</p>
                <p className="text-xs text-muted-foreground mt-1">Go to Asset Management to assign devices and equipment.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Navigation Footer */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={goBack} disabled={currentTabIdx === 0}>
              <ArrowLeft className="h-4 w-4 mr-1" />Back
            </Button>
            <p className="text-xs text-muted-foreground">
              Step {currentTabIdx + 1} of {TABS.length} — {TABS[currentTabIdx]?.label}
            </p>
            <div className="flex items-center gap-2">
              {currentTabIdx < TABS.length - 1 && (
                <>
                  <Button variant="ghost" size="sm" onClick={skipTab} className="text-muted-foreground">
                    <SkipForward className="h-4 w-4 mr-1" />Skip
                  </Button>
                  <Button size="sm" onClick={goNext}>
                    Next<ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </>
              )}
              {currentTabIdx === TABS.length - 1 && (
                <Button size="sm" onClick={validateAndSubmit} className="bg-emerald-600 hover:bg-emerald-700 text-white">
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
