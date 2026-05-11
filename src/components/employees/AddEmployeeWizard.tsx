import { useState, useCallback, useMemo, useEffect } from "react";
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
import { useCreateEmployee, useUpdateEmployee } from "@/hooks/queries/useEmployees";
import { useEmployeeProfile, useUpdateEmployeeProfile } from "@/hooks/queries/useEmployeeProfile";
import { useToast } from "@/hooks/use-toast";

import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClient } from "@/contexts/ClientContext";
import { COUNTRY_NAMES, CURRENCIES } from "@/lib/countries";

function computeEmpPrefix(name?: string | null): string {
  if (!name) return "EM";
  const cleaned = name.replace(/[^a-zA-Z]/g, "");
  if (!cleaned) return "EM";
  if (cleaned.length === 1) return (cleaned[0] + "X").toUpperCase();
  return cleaned.slice(0, 2).toUpperCase();
}
import {
  Check, AlertCircle, User, Briefcase, DollarSign, FileText, Monitor,
  ChevronLeft, Calculator, Settings, Phone, MapPin, CreditCard, GraduationCap, Heart,
  Plus, Trash2, Upload, ArrowRight, ArrowLeft, SkipForward
} from "lucide-react";
import type { Employee } from "@/types/hcm";
import { calcMonthlyTax } from "@/lib/taxSlabs";

interface AddEmployeeWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeCount: number;
  /** When provided, the wizard runs in EDIT mode and updates the existing employee. */
  editEmployeeId?: string;
  /** Optional: show "Initiate Separation" in header (edit mode only). */
  onInitiateSeparation?: () => void;
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
  { id: "documents", label: "Documents", icon: FileText },
  { id: "assets", label: "Assets", icon: Monitor },
];

const DEPARTMENTS = ["Assurance", "Tax", "Advisory", "Strategy", "Technology"];

export function AddEmployeeWizard({ open, onOpenChange, employeeCount, editEmployeeId, onInitiateSeparation }: AddEmployeeWizardProps) {
  const isEditMode = !!editEmployeeId;
  const { activeTypes } = useEmployeeTypes();
  const { setups } = usePayrollSetups();
  const { addEmployee, employees: allEmployees } = useEmployees();
  const createEmployee = useCreateEmployee();
  const updateEmployeeMut = useUpdateEmployee();
  const updateProfile = useUpdateEmployeeProfile();
  const { data: editProfile } = useEmployeeProfile(editEmployeeId);
  const { toast } = useToast();
  
  const { clientId } = useAuth();
  const { data: clientInfo } = useQuery({
    queryKey: ["client-name", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data } = await supabase.from("clients").select("company_name").eq("id", clientId).maybeSingle();
      return data;
    },
    enabled: !!clientId,
  });
  const empPrefix = computeEmpPrefix(clientInfo?.company_name);
  const activeSetups = setups.filter(s => s.status === "active");
  const activeEmps = allEmployees.filter(e => e.status !== "separated");

  const { client } = useClient();
  const defaultCountry = client.country ?? "";
  const defaultCurrency = client.currency ?? "";
  const buildInitialForm = (): FormData => ({
    ...INITIAL_FORM,
    country: defaultCountry,
    bankCountry: defaultCountry,
    workLocationCountry: defaultCountry,
    bankCurrency: defaultCurrency,
  });

  const [activeTab, setActiveTab] = useState("personal");
  const [form, setForm] = useState<FormData>(buildInitialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [education, setEducation] = useState<{ degree: string; institution: string; year: string; field: string }[]>([]);
  const [dependants, setDependants] = useState<{ name: string; relation: string; dateOfBirth: string }[]>([]);
  const [sendInvite, setSendInvite] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [resending, setResending] = useState(false);

  // Prefill form when editing an existing employee.
  useEffect(() => {
    if (!isEditMode || !editProfile?.employee) return;
    const e: any = editProfile.employee;
    const a: any = editProfile.address ?? {};
    const b: any = editProfile.bank ?? {};
    const em: any = editProfile.emergency ?? {};
    setForm({
      firstName: e.first_name ?? "",
      lastName: e.last_name ?? "",
      email: e.email ?? "",
      dateOfBirth: e.date_of_birth ?? "",
      gender: e.gender ?? "",
      maritalStatus: e.marital_status ?? "",
      religion: e.religion ?? "",
      nationality: e.nationality ?? "",
      personalPhone: e.personal_phone ?? e.phone ?? "",
      personalEmail: e.personal_email ?? "",
      emergencyName: em.name ?? "",
      emergencyRelation: em.relation ?? "",
      emergencyPhone: em.phone ?? "",
      emergencyEmail: em.email ?? "",
      addressLine1: a.address_line1 ?? "",
      addressLine2: a.address_line2 ?? "",
      city: a.city ?? "",
      state: a.state ?? "",
      country: a.country ?? "",
      postalCode: a.postal_code ?? "",
      bankName: b.bank_name ?? "",
      bankCountry: b.bank_country ?? "",
      swiftCode: b.swift_code ?? "",
      bankAddress: b.bank_address ?? "",
      iban: b.iban ?? "",
      bankCurrency: b.bank_currency ?? "",
      beneficiaryName: b.beneficiary_name ?? "",
      department: e.department ?? "",
      designation: e.designation ?? "",
      category: e.category ?? "",
      division: e.division ?? "",
      workEmail: e.work_email ?? e.email ?? "",
      workLocationCity: e.work_location_city ?? "",
      workLocationCountry: e.work_location_country ?? "",
      joiningDate: e.joining_date ?? "",
      reportsTo: e.reports_to ?? "",
      salary: editProfile?.baseSalary ? String(editProfile.baseSalary) : "",
      payrollSetupId: e.payroll_setup_id ?? "",
      bonus: "",
      allowances: "",
    });
    setEducation(
      (editProfile.education ?? []).map((ed: any) => ({
        degree: ed.degree ?? "",
        institution: ed.institution ?? "",
        year: ed.start_year != null ? String(ed.start_year) : "",
        field: ed.field_of_study ?? "",
      }))
    );
  }, [isEditMode, editProfile]);

  const selectedSetup = useMemo(() => activeSetups.find(s => s.id === form.payrollSetupId), [form.payrollSetupId, activeSetups]);

  // Per-component overrides for THIS employee. Keyed by component id.
  // mode tracks which field the user last edited so it stays stable when
  // the base salary changes (the other field re-derives).
  type CompOverride = { mode: "percent" | "value"; percent: number; value: number };
  const [overrides, setOverrides] = useState<Record<string, CompOverride>>({});

  // Reset overrides whenever the user picks a different payroll setup.
  useEffect(() => { setOverrides({}); }, [form.payrollSetupId]);

  const isBasicComp = (c: any) => c.id === "comp-basic-salary" || c.name === "Basic Salary";

  const getEffective = (comp: any, baseSalary: number): { percent: number; value: number } => {
    const o = overrides[comp.id];
    if (o) {
      if (o.mode === "percent") return { percent: o.percent, value: Math.round(baseSalary * o.percent / 100) };
      return { percent: baseSalary > 0 ? Number((o.value / baseSalary * 100).toFixed(2)) : 0, value: o.value };
    }
    if (comp.calculationType === "percentage") {
      return { percent: comp.value, value: Math.round(baseSalary * comp.value / 100) };
    }
    return { percent: baseSalary > 0 ? Number((comp.value / baseSalary * 100).toFixed(2)) : 0, value: comp.value };
  };

  const setOverridePercent = (compId: string, percent: number, baseSalary: number) =>
    setOverrides(prev => ({ ...prev, [compId]: { mode: "percent", percent, value: Math.round(baseSalary * percent / 100) } }));
  const setOverrideValue = (compId: string, value: number, baseSalary: number) =>
    setOverrides(prev => ({ ...prev, [compId]: { mode: "value", percent: baseSalary > 0 ? Number((value / baseSalary * 100).toFixed(2)) : 0, value } }));

  // Real-time salary calculation
  const salaryBreakdown = useMemo(() => {
    if (!selectedSetup || !form.salary || Number(form.salary) <= 0) return null;
    const baseSalary = Number(form.salary);
    const additions = selectedSetup.payslipComponents
      .filter(c => c.type === "earning" && c.status === "active" && !isBasicComp(c))
      .map(comp => {
        const { percent, value } = getEffective(comp, baseSalary);
        return { id: comp.id, name: comp.name, calculationType: comp.calculationType, percentage: percent, amount: value };
      });
    const deductions = selectedSetup.payslipComponents
      .filter(c => c.type === "deduction" && c.status === "active")
      .map(comp => {
        const { percent, value } = getEffective(comp, baseSalary);
        return { id: comp.id, name: comp.name, calculationType: comp.calculationType, percentage: percent, amount: value };
      });
    const totalAdditions = additions.reduce((s, c) => s + c.amount, 0);
    const totalDeductions = deductions.reduce((s, c) => s + c.amount, 0);
    const grossBeforeTax = baseSalary + totalAdditions;
    const taxBaseMonthly = (selectedSetup as any).taxBasis === "basic" ? baseSalary : grossBeforeTax;
    const taxAmount = calcMonthlyTax(selectedSetup, taxBaseMonthly);
    return {
      baseSalary, additions, deductions,
      totalAdditions, totalDeductions, taxAmount,
      grossTotal: grossBeforeTax,
      netSalary: grossBeforeTax - totalDeductions - taxAmount,
    };
  }, [selectedSetup, form.salary, overrides]);

  const updateField = useCallback((field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
  }, []);

  const validateAndSubmit = async () => {
    const allErrors: Partial<Record<keyof FormData, string>> = {};
    if (!form.firstName.trim()) allErrors.firstName = "Required";
    if (!form.lastName.trim()) allErrors.lastName = "Required";
    if (!form.email.trim()) { if (!isEditMode) allErrors.email = "Required"; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) allErrors.email = "Invalid email";
    if (!form.department) allErrors.department = "Required";
    if (!form.designation.trim()) allErrors.designation = "Required";
    if (!isEditMode && !form.category) allErrors.category = "Required";
    if (!isEditMode && (!form.salary || Number(form.salary) <= 0)) allErrors.salary = "Required";
    if (!isEditMode && !form.payrollSetupId) allErrors.payrollSetupId = "Required";

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
      empId: "", // assigned by DB trigger; legacy in-memory context only
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

    // Persist to Supabase first. Only update local UI context after a successful insert,
    // so failed creates don't leave a phantom employee in the list.
    setInviting(true);
    try {
      const inviteEmail = form.workEmail?.trim() || form.personalEmail?.trim() || form.email.trim();
      // Normalize sentinel "__none__" placeholder to undefined so we don't send it as a UUID.
      const reportsToId =
        form.reportsTo && form.reportsTo !== "__none__" ? form.reportsTo : undefined;

      if (isEditMode && editEmployeeId) {
        // EDIT — update employees row + sub-records via profile mutation.
        await updateEmployeeMut.mutateAsync({
          id: editEmployeeId,
          updates: {
            first_name: newEmp.firstName,
            last_name: newEmp.lastName,
            phone: form.personalPhone || null,
            department: form.department || null,
            designation: form.designation || null,
            category: form.category || null,
            division: form.division || null,
            joining_date: newEmp.joiningDate,
            work_location_country: form.workLocationCountry || null,
            work_location_city: form.workLocationCity || null,
            reports_to: reportsToId ?? null,
            payroll_setup_id: form.payrollSetupId || null,
          } as any,
        });
        await updateProfile.mutateAsync({
          employeeId: editEmployeeId,
          bio: {
            first_name: newEmp.firstName,
            last_name: newEmp.lastName,
            date_of_birth: form.dateOfBirth || null,
            gender: form.gender || null,
            marital_status: form.maritalStatus || null,
            religion: form.religion || null,
            nationality: form.nationality || null,
          },
          contact: {
            personal_phone: form.personalPhone || null,
            personal_email: form.personalEmail || null,
          },
          address: {
            address_line1: form.addressLine1, address_line2: form.addressLine2,
            city: form.city, state: form.state, country: form.country, postal_code: form.postalCode,
          },
          bank: {
            bank_name: form.bankName, bank_country: form.bankCountry, swift_code: form.swiftCode,
            iban: form.iban, bank_currency: form.bankCurrency, beneficiary_name: form.beneficiaryName,
            bank_address: form.bankAddress,
          },
          emergency: {
            name: form.emergencyName, relation: form.emergencyRelation,
            phone: form.emergencyPhone, email: form.emergencyEmail,
          },
          education: education.map(e => ({
            institution: e.institution, degree: e.degree, field_of_study: e.field,
            start_year: e.year ? Number(e.year) : null,
          })),
        });

        // Upsert base salary into employee_compensation
        if (form.salary && Number(form.salary) > 0 && clientId) {
          const baseAmount = Number(form.salary);
          const { data: existingComp } = await (supabase as any)
            .from("employee_compensation")
            .select("id")
            .eq("employee_id", editEmployeeId)
            .eq("component_type", "base")
            .is("effective_to", null)
            .maybeSingle();
          if (existingComp?.id) {
            await (supabase as any).from("employee_compensation")
              .update({ amount: baseAmount })
              .eq("id", existingComp.id);
          } else {
            await (supabase as any).from("employee_compensation").insert({
              employee_id: editEmployeeId,
              client_id: clientId,
              component_name: "Base Salary",
              component_type: "base",
              amount: baseAmount,
              effective_from: new Date().toISOString().split("T")[0],
            });
          }
        }

        toast({ title: "Employee updated", description: "Changes saved successfully." });
        resetAndClose();
      } else {
        const createResult = await createEmployee.mutateAsync({
          // emp_id is auto-generated by the DB trigger
          first_name: newEmp.firstName,
          last_name: newEmp.lastName,
          email: inviteEmail,
          phone: form.personalPhone || undefined,
          department: form.department || undefined,
          designation: form.designation || undefined,
          category: form.category || undefined,
          division: form.division || undefined,
          joining_date: newEmp.joiningDate,
          date_of_birth: form.dateOfBirth || undefined,
          gender: form.gender || undefined,
          marital_status: form.maritalStatus || undefined,
          nationality: form.nationality || undefined,
          religion: form.religion || undefined,
          work_location_country: form.workLocationCountry || undefined,
          work_location_city: form.workLocationCity || undefined,
          payroll_setup_id: form.payrollSetupId || undefined,
          reports_to: reportsToId,
          address: {
            address_line1: form.addressLine1, address_line2: form.addressLine2,
            city: form.city, state: form.state, country: form.country, postal_code: form.postalCode,
          },
          bank: {
            bank_name: form.bankName, bank_country: form.bankCountry, swift_code: form.swiftCode,
            iban: form.iban, bank_currency: form.bankCurrency, beneficiary_name: form.beneficiaryName,
            bank_address: form.bankAddress,
          },
          emergency_contact: {
            name: form.emergencyName, relation: form.emergencyRelation,
            phone: form.emergencyPhone, email: form.emergencyEmail,
          },
          education: education.map(e => ({
            institution: e.institution, degree: e.degree, field_of_study: e.field,
            start_year: e.year ? Number(e.year) : undefined,
          })),
          send_invite: sendInvite,
        });
        // Insert base salary into employee_compensation for the newly created employee
        const newEmpId = (createResult as any)?.employee?.id;
        if (newEmpId && form.salary && Number(form.salary) > 0 && clientId) {
          await (supabase as any).from("employee_compensation").insert({
            employee_id: newEmpId,
            client_id: clientId,
            component_name: "Base Salary",
            component_type: "base",
            amount: Number(form.salary),
            effective_from: new Date().toISOString().split("T")[0],
          });
        }
        addEmployee(newEmp);
        resetAndClose();
      }
    } catch (err) {
      // Toast already raised by the mutation's onError. Keep wizard open so user can fix & retry.
    } finally {
      setInviting(false);
    }
  };

  const resetAndClose = () => {
    setForm(buildInitialForm());
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
    : (isEditMode ? "Edit Employee" : "New Employee");
  const displaySub = [form.designation, form.department].filter(Boolean).join(" · ") || (isEditMode ? "Update employee details" : "Complete the form below to onboard");

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
        <div className="flex items-center gap-4">
          {!isEditMode && (
            <div className="flex items-center gap-2 mr-4">
              <Switch id="send-invite" checked={sendInvite} onCheckedChange={setSendInvite} />
              <Label htmlFor="send-invite" className="text-sm text-muted-foreground cursor-pointer">Send login invite</Label>
            </div>
          )}
          {isEditMode && form.email && (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                if (!clientId) return;
                setResending(true);
                try {
                  const { data, error } = await supabase.functions.invoke("resend-invite", {
                    body: { email: form.email, client_id: clientId },
                  });
                  const payload: any = data;
                  const errMsg: string = (error as any)?.message ?? payload?.error ?? "";
                  if (payload?.verified === true || /already verified/i.test(errMsg)) {
                    toast({ title: "Already verified", description: `${form.email} has already accepted the invite.` });
                  } else if (error) {
                    throw error;
                  } else if (payload?.error) {
                    throw new Error(payload.error);
                  } else {
                    toast({ title: "Invitation resent", description: `Invitation resent to ${form.email}.` });
                  }
                } catch (e: any) {
                  toast({ title: "Could not resend invite", description: e?.message ?? "Something went wrong", variant: "destructive" });
                } finally {
                  setResending(false);
                }
              }}
              disabled={resending}
            >
              {resending ? "Sending..." : "Resend Invitation Email"}
            </Button>
          )}
          {isEditMode && onInitiateSeparation && (
            <Button size="sm" variant="destructive" onClick={onInitiateSeparation}>
              Initiate Separation
            </Button>
          )}
          <Button size="sm" onClick={validateAndSubmit} disabled={inviting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Check className="h-4 w-4 mr-1" />
            {inviting
              ? (isEditMode ? "Saving..." : "Sending Invite...")
              : (isEditMode ? "Save Changes" : "Submit & Onboard")}
          </Button>
        </div>
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
                  <Select value={form.country || ""} onValueChange={v => updateField("country", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent className="max-h-72">{COUNTRY_NAMES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
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
                  <Select value={form.bankCountry || ""} onValueChange={v => updateField("bankCountry", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent className="max-h-72">{COUNTRY_NAMES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
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
                  <Select value={form.bankCurrency || ""} onValueChange={v => updateField("bankCurrency", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select currency" /></SelectTrigger>
                    <SelectContent className="max-h-72">{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
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
                  <Input value={`${empPrefix}-${String(employeeCount + 1).padStart(3, "0")}`} disabled className="h-8 text-sm bg-muted" />
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
                  <Select value={form.workLocationCountry || ""} onValueChange={v => updateField("workLocationCountry", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent className="max-h-72">{COUNTRY_NAMES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
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
                    <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">Basic Salary</span>
                        <Badge variant="outline" className="text-[10px] h-5">Base</Badge>
                      </div>
                      <span className="text-sm font-semibold">{salaryBreakdown.baseSalary.toLocaleString()} {selectedSetup.currency}</span>
                    </div>
                    {salaryBreakdown.additions.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Earnings</p>
                        <div className="bg-muted/30 rounded-lg overflow-hidden">
                          {salaryBreakdown.additions.map((item) => (
                            <div key={item.id} className="grid grid-cols-12 items-center gap-2 px-4 py-2.5 border-b border-border/50 last:border-0">
                              <span className="text-sm col-span-4 truncate">{item.name}</span>
                              <div className="col-span-3 flex items-center gap-1">
                                <Input
                                  type="number"
                                  className="h-7 text-xs"
                                  value={item.percentage || 0}
                                  onChange={e => setOverridePercent(item.id, Number(e.target.value), salaryBreakdown.baseSalary)}
                                />
                                <span className="text-xs text-muted-foreground">%</span>
                              </div>
                              <div className="col-span-4">
                                <Input
                                  type="number"
                                  className="h-7 text-xs"
                                  value={item.amount}
                                  onChange={e => setOverrideValue(item.id, Number(e.target.value), salaryBreakdown.baseSalary)}
                                />
                              </div>
                              <span className="text-xs font-semibold text-emerald-600 col-span-1 text-right">{selectedSetup.currency}</span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-500/10 font-semibold">
                            <span className="text-sm">Total Earnings</span>
                            <span className="text-sm text-emerald-600">+{salaryBreakdown.totalAdditions.toLocaleString()} {selectedSetup.currency}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {salaryBreakdown.deductions.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Deductions</p>
                        <div className="bg-muted/30 rounded-lg overflow-hidden">
                          {salaryBreakdown.deductions.map((item) => (
                            <div key={item.id} className="grid grid-cols-12 items-center gap-2 px-4 py-2.5 border-b border-border/50 last:border-0">
                              <span className="text-sm col-span-4 truncate">{item.name}</span>
                              <div className="col-span-3 flex items-center gap-1">
                                <Input
                                  type="number"
                                  className="h-7 text-xs"
                                  value={item.percentage || 0}
                                  onChange={e => setOverridePercent(item.id, Number(e.target.value), salaryBreakdown.baseSalary)}
                                />
                                <span className="text-xs text-muted-foreground">%</span>
                              </div>
                              <div className="col-span-4">
                                <Input
                                  type="number"
                                  className="h-7 text-xs"
                                  value={item.amount}
                                  onChange={e => setOverrideValue(item.id, Number(e.target.value), salaryBreakdown.baseSalary)}
                                />
                              </div>
                              <span className="text-xs font-semibold text-destructive col-span-1 text-right">{selectedSetup.currency}</span>
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
                    <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3 font-semibold">
                      <span className="text-sm">Gross Salary</span>
                      <span className="text-sm">{salaryBreakdown.grossTotal.toLocaleString()} {selectedSetup.currency}</span>
                    </div>
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
                <Button size="sm" onClick={validateAndSubmit} disabled={inviting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Check className="h-4 w-4 mr-1" />{isEditMode ? "Save Changes" : "Submit & Onboard"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
