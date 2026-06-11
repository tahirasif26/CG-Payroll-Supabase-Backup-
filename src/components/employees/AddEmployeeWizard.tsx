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
import { useRoles, useAssignEmployeeRole } from "@/hooks/queries/useRoles";
import { useToast } from "@/hooks/use-toast";

import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import {
  employeeKeys,
  employeesApi,
  useAssignAsset,
  useDepartments,
  useDesignations,
  useDivisions,
  useInvitations,
  useResendInvitation,
} from "@/api";
import { useClient } from "@/contexts/ClientContext";
import { COUNTRY_NAMES, CURRENCIES } from "@/lib/countries";
import { useAssets, useAssetCategories } from "@/hooks/queries/useAssets";
import { Checkbox } from "@/components/ui/checkbox";
import { Search } from "lucide-react";

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
import { matchTaxSlab } from "@/lib/taxSlabs";

export type EmployeeWizardMode = "create" | "edit" | "view";

interface AddEmployeeWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeCount: number;
  /** When provided, the wizard runs in EDIT mode and updates the existing employee. */
  editEmployeeId?: string;
  /**
   * - `create` (default): blank form, calls createEmployee on save.
   * - `edit`: form prefilled from `editEmployeeId`, calls updateEmployee on save.
   * - `view`: form prefilled from `editEmployeeId`, every input disabled, no save buttons.
   * If `editEmployeeId` is set and `mode` is omitted, defaults to `edit`.
   */
  mode?: EmployeeWizardMode;
  /** Optional: show "Initiate Separation" in header (edit mode only). */
  onInitiateSeparation?: () => void;
}

interface FormData {
  // Personal > Basic
  firstName: string; lastName: string; email: string; dateOfBirth: string;
  gender: string; maritalStatus: string; nationality: string;
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
  roleId: string;
  // Compensation
  salary: string; payrollSetupId: string; bonus: string; allowances: string;
}

const INITIAL_FORM: FormData = {
  firstName: "", lastName: "", email: "", dateOfBirth: "",
  gender: "", maritalStatus: "", nationality: "",
  personalPhone: "", personalEmail: "",
  emergencyName: "", emergencyRelation: "", emergencyPhone: "", emergencyEmail: "",
  addressLine1: "", addressLine2: "", city: "", state: "", country: "", postalCode: "",
  bankName: "", bankCountry: "", swiftCode: "", bankAddress: "", iban: "", bankCurrency: "", beneficiaryName: "",
  department: "", designation: "", category: "", division: "",
  workEmail: "", workLocationCity: "", workLocationCountry: "", joiningDate: "",
  reportsTo: "",
  roleId: "",
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

export function AddEmployeeWizard({
  open,
  onOpenChange,
  employeeCount,
  editEmployeeId,
  mode,
  onInitiateSeparation,
}: AddEmployeeWizardProps) {
  // `mode` resolution: explicit prop wins; otherwise derive from `editEmployeeId`.
  // View mode is opt-in — never derived implicitly so the existing edit-from-row
  // call sites (which don't pass `mode`) keep behaving as before.
  const resolvedMode: EmployeeWizardMode = mode ?? (editEmployeeId ? "edit" : "create");
  const isEditMode = resolvedMode === "edit";
  const isViewMode = resolvedMode === "view";
  const { activeTypes } = useEmployeeTypes();
  const { setups } = usePayrollSetups();
  const { addEmployee, employees: allEmployees } = useEmployees();
  const createEmployee = useCreateEmployee();
  const updateEmployeeMut = useUpdateEmployee();
  const updateProfile = useUpdateEmployeeProfile();
  const { data: editProfile } = useEmployeeProfile(editEmployeeId);
  const { toast } = useToast();
  
  const { clientId } = useAuth();
  // ClientContext provides the company name + country/currency — no need to
  // round-trip to the backend for `company_name` separately.
  const { client } = useClient();
  const empPrefix = computeEmpPrefix(client.companyName);
  /**
   * The employee ID shown in the Work Information tab. Derived from the
   * tenant's prefix + (count + 1), so the user sees what they're going to
   * get. We send this verbatim to the backend on create — the uniqueness
   * check on (clientId, empId) still defends against rare race conditions
   * where two admins onboard at the same instant.
   */
  const displayedEmpId = useMemo(
    () => `${empPrefix}-${String(employeeCount + 1).padStart(3, "0")}`,
    [empPrefix, employeeCount],
  );
  // Every saved setup is selectable — there's no active/inactive flag.
  const activeSetups = setups;
  const activeEmps = allEmployees.filter(e => e.status !== "separated");
  const { data: roles = [] } = useRoles(clientId ?? null);

  // Org-structure dropdowns — served by the NestJS backend
  // (`/divisions`, `/departments`, `/designations`).
  const { data: dbDepartments = [] } = useDepartments();
  const { data: dbDesignations = [] } = useDesignations();
  const { data: dbDivisionsRaw = [] } = useDivisions();
  const dbDivisions = dbDivisionsRaw.filter((d) => d.isActive !== false);
  const assignRole = useAssignEmployeeRole();
  const defaultEmployeeRole = useMemo(
    () => roles.find(r => r.is_system && r.name.toLowerCase() === "employee"),
    [roles]
  );

  // Invitation list — used by the "Resend invite" button so we can look up the
  // pending invitation id for the candidate email and call the NestJS resend
  // endpoint (the legacy Supabase edge function is gone).
  const { data: invitations = [] } = useInvitations();
  const resendInvitation = useResendInvitation();
  const assignAsset = useAssignAsset();

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
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [assetSearch, setAssetSearch] = useState("");
  const [assetCategoryFilter, setAssetCategoryFilter] = useState<string>("all");
  const { data: availableAssets = [] } = useAssets({ status: "available" });
  const { data: assetCategoriesList = [] } = useAssetCategories();
  const qc = useQueryClient();

  const filteredAvailableAssets = useMemo(() => {
    const q = assetSearch.trim().toLowerCase();
    return (availableAssets as any[]).filter((a) => {
      if (a.employee_id) return false;
      if (assetCategoryFilter !== "all" && a.category_id !== assetCategoryFilter) return false;
      if (!q) return true;
      return (
        (a.name ?? "").toLowerCase().includes(q) ||
        (a.asset_tag ?? "").toLowerCase().includes(q) ||
        (a.asset_categories?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [availableAssets, assetSearch, assetCategoryFilter]);

  const toggleAsset = (id: string) =>
    setSelectedAssetIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // Prefill form when editing OR viewing an existing employee. View mode
  // needs the same hydration; the difference is just that every input below
  // is rendered inside a disabled fieldset.
  useEffect(() => {
    if ((!isEditMode && !isViewMode) || !editProfile?.employee) return;
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
      roleId: e.role_id ?? "",
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
  }, [isEditMode, isViewMode, editProfile]);

  // Default new employees to the system "Employee" role once roles load.
  useEffect(() => {
    if (isEditMode) return;
    if (!form.roleId && defaultEmployeeRole) {
      setForm(f => ({ ...f, roleId: defaultEmployeeRole.id }));
    }
  }, [isEditMode, defaultEmployeeRole, form.roleId]);

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
    const totalAdditions = additions.reduce((s, c) => s + c.amount, 0);
    const grossBeforeTax = baseSalary + totalAdditions;
    const taxBaseMonthly = (selectedSetup as any).taxBasis === "basic" ? baseSalary : grossBeforeTax;
    const matched = matchTaxSlab(selectedSetup, taxBaseMonthly);
    const legacyTaxName = ((selectedSetup as any).taxComponentName ?? "").trim().toLowerCase();

    const rawDeductions = selectedSetup.payslipComponents
      .filter(c => c.type === "deduction" && c.status === "active");
    const slabNameLower = (matched?.slabName ?? "").trim().toLowerCase();
    const isTaxRow = (c: any) => {
      if (c.formula === "tax_slabs") return true;
      const n = (c.name ?? "").trim().toLowerCase();
      return !!n && (n === legacyTaxName || (slabNameLower && n === slabNameLower));
    };
    const taxRowId = rawDeductions.find(isTaxRow)?.id;

    const taxComponentName = ((selectedSetup as any).taxComponentName ?? "").trim();
    let taxRowEmitted = false;
    const deductions = (rawDeductions
      .filter(c => !(isTaxRow(c) && c.id !== taxRowId))
      .map(comp => {
        if (comp.id === taxRowId) {
          if (!matched) { taxRowEmitted = true; return null; }
          taxRowEmitted = true;
          const o = overrides[comp.id];
          const amt = o ? (o.mode === "value" ? o.value : Math.round(baseSalary * o.percent / 100)) : matched.amount;
          const pct = o && o.mode === "percent" ? o.percent : matched.percentage;
          const label = (comp.name && comp.name.trim()) || taxComponentName || matched.slabName;
          return { id: comp.id, name: label, calculationType: "formula" as const, percentage: pct, amount: amt };
        }
        const { percent, value } = getEffective(comp, baseSalary);
        return { id: comp.id, name: comp.name, calculationType: comp.calculationType, percentage: percent, amount: value };
      })
      .filter(Boolean) as Array<{ id: string; name: string; calculationType: any; percentage: number; amount: number }>);
    if (matched && !taxRowEmitted) {
      const o = overrides["__income_tax__"];
      const amt = o ? (o.mode === "value" ? o.value : Math.round(baseSalary * o.percent / 100)) : matched.amount;
      const pct = o && o.mode === "percent" ? o.percent : matched.percentage;
      const label = taxComponentName || matched.slabName;
      deductions.push({ id: "__income_tax__", name: label, calculationType: "formula" as const, percentage: pct, amount: amt });
    }

    const totalDeductions = deductions.reduce((s, c) => s + c.amount, 0);
    return {
      baseSalary, additions, deductions,
      totalAdditions, totalDeductions, taxAmount: 0,
      grossTotal: grossBeforeTax,
      netSalary: grossBeforeTax - totalDeductions,
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
    if (!form.workEmail.trim()) allErrors.workEmail = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.workEmail)) allErrors.workEmail = "Invalid email";
    if (!form.department) allErrors.department = "Required";
    if (!form.designation.trim()) allErrors.designation = "Required";
    if (!isEditMode && !form.category) allErrors.category = "Required";
    if (!isEditMode && (!form.salary || Number(form.salary) <= 0)) allErrors.salary = "Required";
    if (!isEditMode && !form.payrollSetupId) allErrors.payrollSetupId = "Required";

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      if (allErrors.firstName || allErrors.lastName || allErrors.email) setActiveTab("personal");
      else if (allErrors.workEmail || allErrors.department || allErrors.designation || allErrors.category) setActiveTab("work");
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

        // Sync base salary via the employee-profile compensation array. The
        // backend treats a `componentType === "base"` row as the canonical
        // basic-pay record, closing out any previous open row.
        if (form.salary && Number(form.salary) > 0 && editEmployeeId) {
          await employeesApi.updateProfile(editEmployeeId, {
            compensation: [
              {
                componentName: "Base Salary",
                componentType: "base",
                amount: Number(form.salary),
                effectiveFrom: new Date().toISOString().split("T")[0],
              },
            ],
          });
        }

        // Sync permission role (employees.role_id + user_roles).
        if (form.roleId && clientId) {
          const targetRole = roles.find(r => r.id === form.roleId);
          if (targetRole) {
            try {
              await assignRole.mutateAsync({
                employee_id: editEmployeeId,
                role_id: targetRole.id,
                client_id: clientId,
                role_name: targetRole.name,
                user_id: (editProfile?.employee as any)?.user_id ?? null,
              });
            } catch { /* toast handled in hook */ }
          }
        }

        toast({ title: "Employee updated", description: "Changes saved successfully." });
        resetAndClose();
      } else {
        // Step 1 — create the employee row. The backend auto-generates `empId`
        // when omitted, and (when `send_invite` is true) atomically mints an
        // invitation row + emails the accept-link. The row stays in `pending`
        // status until the invitee accepts → InvitationsService flips it to
        // `active` and links the new user. `address` / `bank` / `emergency` /
        // `education` / `compensation` go through the profile endpoint in
        // step 2; sending them here would have been silently dropped.
        const createResult = await createEmployee.mutateAsync({
          // Send the displayed prefixed id (e.g. CA-005) so what the user sees
          // in the form is what lands in the DB. The backend's uniqueness
          // check still defends against concurrent onboards racing on the
          // same suffix.
          emp_id: displayedEmpId,
          first_name: newEmp.firstName,
          last_name: newEmp.lastName,
          email: inviteEmail,
          phone: form.personalPhone || undefined,
          personal_phone: form.personalPhone || undefined,
          personal_email: form.personalEmail || undefined,
          department: form.department || undefined,
          designation: form.designation || undefined,
          category: form.category || undefined,
          division: form.division || undefined,
          joining_date: newEmp.joiningDate,
          date_of_birth: form.dateOfBirth || undefined,
          gender: form.gender || undefined,
          marital_status: form.maritalStatus || undefined,
          nationality: form.nationality || undefined,
          work_location_country: form.workLocationCountry || undefined,
          work_location_city: form.workLocationCity || undefined,
          reports_to: reportsToId,
          payroll_setup_id: form.payrollSetupId || undefined,
          send_invite: sendInvite,
          invite_role_id: form.roleId || undefined,
        });

        // Step 2 — push every sub-record group in one `updateProfile` so the
        // row, address, bank, emergency, education and base salary all land
        // in the same transaction (the backend wraps them).
        const newEmpId = (createResult as any)?.employee?.id ?? (createResult as any)?.id;
        if (newEmpId) {
          const today = new Date().toISOString().split("T")[0];
          const hasSalary = !!form.salary && Number(form.salary) > 0;
          await employeesApi.updateProfile(newEmpId, {
            address: {
              addressLine1: form.addressLine1 || null,
              addressLine2: form.addressLine2 || null,
              city: form.city || null,
              state: form.state || null,
              country: form.country || null,
              postalCode: form.postalCode || null,
            },
            bankDetails: {
              bankName: form.bankName || null,
              bankCountry: form.bankCountry || null,
              swiftCode: form.swiftCode || null,
              iban: form.iban || null,
              bankCurrency: form.bankCurrency || null,
              beneficiaryName: form.beneficiaryName || null,
              bankAddress: form.bankAddress || null,
            },
            emergencyContact: {
              name: form.emergencyName || null,
              relation: form.emergencyRelation || null,
              phone: form.emergencyPhone || null,
              email: form.emergencyEmail || null,
            },
            education: education.map((e) => ({
              institution: e.institution || null,
              degree: e.degree || null,
              fieldOfStudy: e.field || null,
              startYear: e.year ? Number(e.year) : null,
            })),
            ...(hasSalary
              ? {
                  compensation: [
                    {
                      componentName: "Base Salary",
                      componentType: "base",
                      amount: Number(form.salary),
                      effectiveFrom: today,
                    },
                  ],
                }
              : {}),
          });
        }
        if (newEmpId && selectedAssetIds.length > 0) {
          // Each asset is assigned individually through the assets endpoint —
          // collect the errors instead of failing the entire onboarding so a
          // bad asset id doesn't roll back the employee record.
          const today = new Date().toISOString().split("T")[0];
          let assetErr: { message?: string } | null = null;
          for (const assetId of selectedAssetIds) {
            try {
              await assignAsset.mutateAsync({
                id: assetId,
                body: { assignedToId: newEmpId, assignedDate: today },
              });
            } catch (e) {
              assetErr = (e as { error?: { message?: string }; message?: string })?.error
                ?? (e as { message?: string });
            }
          }
          if (assetErr) {
            toast({ title: "Asset assignment failed", description: assetErr.message ?? "Unknown error", variant: "destructive" });
          } else {
            qc.invalidateQueries({ queryKey: ["assets"] });
          }
        }
        // Sync permission role for the newly created employee.
        if (newEmpId && form.roleId && clientId) {
          const targetRole = roles.find(r => r.id === form.roleId);
          if (targetRole) {
            const newUserId = (createResult as any)?.employee?.user_id ?? null;
            try {
              await assignRole.mutateAsync({
                employee_id: newEmpId,
                role_id: targetRole.id,
                client_id: clientId,
                role_name: targetRole.name,
                user_id: newUserId,
              });
            } catch { /* toast handled in hook */ }
          }
        }
        // NOTE: do NOT call addEmployee(newEmp) here — createEmployee.mutateAsync above
        // already inserts the employee row in the DB and invalidates the employees query.
        // Calling addEmployee would insert a SECOND row using form.email (personal),
        // creating a duplicate when work/personal emails differ.
        // Force-refetch the employees list (and any cached single-employee
        // queries) so the newly-created row appears in the directory even
        // though the global QueryClient has `refetchOnMount: false`.
        await qc.invalidateQueries({ queryKey: employeeKeys.all, refetchType: "all" });
        qc.invalidateQueries({ queryKey: ["invitations"] });

        // Surface invitation delivery state. `invitation: null` means the
        // admin chose not to send. `emailSent: false` means the row was saved
        // but the mail provider rejected — admin can resend from the wizard's
        // edit mode.
        const invitation = (createResult as { invitation?: { id: string; emailSent: boolean } | null })?.invitation;
        if (sendInvite) {
          if (invitation?.emailSent) {
            toast({
              title: "Employee added — invitation sent",
              description: `${inviteEmail} will receive an accept-invite email shortly.`,
            });
          } else if (invitation && !invitation.emailSent) {
            toast({
              variant: "destructive",
              title: "Employee added — email delivery failed",
              description: `The invitation row was saved but the mail provider rejected the send. Use the Resend button on the employee detail to retry.`,
            });
          } else {
            toast({ title: "Employee added" });
          }
        } else {
          toast({ title: "Employee added" });
        }
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
    setSelectedAssetIds([]);
    setAssetSearch("");
    setAssetCategoryFilter("all");
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
    : isViewMode
      ? "Employee Profile"
      : isEditMode
        ? "Edit Employee"
        : "New Employee";
  const displaySub = [form.designation, form.department].filter(Boolean).join(" · ") || (
    isViewMode
      ? "Read-only employee profile"
      : isEditMode
        ? "Update employee details"
        : "Complete the form below to onboard"
  );

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
                  // Find the pending invitation for this email in this tenant.
                  // The backend's resend endpoint takes the invitation id; if
                  // there's no pending row the user has already accepted.
                  const match = invitations.find(
                    (inv) =>
                      inv.email?.toLowerCase() === form.email.toLowerCase() &&
                      inv.status === "pending",
                  );
                  if (!match) {
                    const accepted = invitations.find(
                      (inv) =>
                        inv.email?.toLowerCase() === form.email.toLowerCase() &&
                        inv.status === "accepted",
                    );
                    if (accepted) {
                      toast({ title: "Already verified", description: `${form.email} has already accepted the invite.` });
                    } else {
                      toast({ title: "No pending invitation", description: `No pending invite found for ${form.email}.`, variant: "destructive" });
                    }
                    return;
                  }
                  await resendInvitation.mutateAsync(match.id);
                  toast({ title: "Invitation resent", description: `Invitation resent to ${form.email}.` });
                } catch (e: unknown) {
                  const message =
                    (e as { error?: { message?: string } })?.error?.message ??
                    (e as { message?: string })?.message ??
                    "Something went wrong";
                  toast({ title: "Could not resend invite", description: message, variant: "destructive" });
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
          {isViewMode ? (
            <Button size="sm" variant="outline" onClick={resetAndClose}>
              Close
            </Button>
          ) : (
            <Button size="sm" onClick={validateAndSubmit} disabled={inviting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Check className="h-4 w-4 mr-1" />
              {inviting
                ? (isEditMode ? "Saving..." : "Sending Invite...")
                : (isEditMode ? "Save Changes" : "Submit & Onboard")}
            </Button>
          )}
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
        {/*
         * In view mode, wrap every TabsContent in a `<fieldset disabled>` so
         * native HTML disables all inputs/selects/switches/buttons inside the
         * tabs panels. The TabsList sits OUTSIDE the fieldset so the user can
         * still navigate between tabs to inspect saved data.
         */}
        <fieldset disabled={isViewMode} className="m-0 p-0 border-0 min-w-0">
          <legend className="sr-only">Employee details</legend>

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
                  <Input value={displayedEmpId} disabled className="h-8 text-sm bg-muted" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Work Email <span className="text-destructive">*</span></p>
                  <Input value={form.workEmail} onChange={e => updateField("workEmail", e.target.value)} placeholder="employee@cg.com" className={cn("h-8 text-sm", errors.workEmail && "border-destructive")} />
                  {renderError("workEmail")}
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
                    <SelectTrigger className={cn("h-8 text-sm", errors.department && "border-destructive")}><SelectValue placeholder={dbDepartments.length ? "Select..." : "Add in HR Settings"} /></SelectTrigger>
                    <SelectContent>{dbDepartments.map((d: any) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                  {renderError("department")}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Designation <span className="text-destructive">*</span></p>
                  <Select value={form.designation} onValueChange={v => updateField("designation", v)}>
                    <SelectTrigger className={cn("h-8 text-sm", errors.designation && "border-destructive")}><SelectValue placeholder={dbDesignations.length ? "Select..." : "Add in HR Settings"} /></SelectTrigger>
                    <SelectContent>{dbDesignations.map((d: any) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                  {renderError("designation")}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Division</p>
                  <Select value={form.division || "__none__"} onValueChange={v => updateField("division", v === "__none__" ? "" : v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder={dbDivisions.length ? "Select..." : "Add in HR Settings"} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {dbDivisions.map((d: any) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
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
                  <p className="text-xs text-muted-foreground">Permission Role</p>
                  <Select value={form.roleId} onValueChange={v => updateField("roleId", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select role..." /></SelectTrigger>
                    <SelectContent>
                      {roles.map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
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
                        <div className="grid grid-cols-12 items-center gap-2 px-4 py-2.5 border-b border-border/50">
                          <span className="text-sm col-span-4 truncate font-medium">Basic Salary</span>
                          <div className="col-span-3 flex items-center gap-1">
                            <Badge variant="outline" className="text-[10px] h-5">Earnings</Badge>
                          </div>
                          <div className="col-span-4 text-sm font-semibold text-right">
                            {salaryBreakdown.baseSalary.toLocaleString()}
                          </div>
                          <span className="text-xs font-semibold text-emerald-600 col-span-1 text-right">{selectedSetup.currency}</span>
                        </div>
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
        <TabsContent value="assets" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-primary" />
                  Assign Assets {isEditMode ? "" : "(optional)"}
                </CardTitle>
                <Badge variant="secondary">{filteredAvailableAssets.length} available</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {isEditMode ? (
                <p className="text-sm text-muted-foreground">Manage assets from the Asset Management module.</p>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, tag, or category..."
                        value={assetSearch}
                        onChange={(e) => setAssetSearch(e.target.value)}
                        className="pl-8 h-9"
                      />
                    </div>
                    <Select value={assetCategoryFilter} onValueChange={setAssetCategoryFilter}>
                      <SelectTrigger className="w-full sm:w-56 h-9">
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All categories</SelectItem>
                        {(assetCategoriesList as any[]).map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {filteredAvailableAssets.length === 0 ? (
                    <div className="text-center py-8 border rounded-md">
                      <Monitor className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {(availableAssets as any[]).length === 0
                          ? "No available assets in inventory."
                          : "No assets match your filters."}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        You can assign assets later from Asset Management.
                      </p>
                    </div>
                  ) : (
                    <div className="border rounded-md max-h-96 overflow-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background">
                          <TableRow>
                            <TableHead className="w-10"></TableHead>
                            <TableHead>Tag</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Condition</TableHead>
                            <TableHead>Location</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAvailableAssets.map((a: any) => {
                            const checked = selectedAssetIds.includes(a.id);
                            return (
                              <TableRow
                                key={a.id}
                                onClick={() => toggleAsset(a.id)}
                                className={cn("cursor-pointer", checked && "bg-primary/5")}
                              >
                                <TableCell>
                                  <Checkbox checked={checked} onCheckedChange={() => toggleAsset(a.id)} />
                                </TableCell>
                                <TableCell className="font-mono text-xs">{a.asset_tag}</TableCell>
                                <TableCell className="font-medium">{a.name}</TableCell>
                                <TableCell className="text-muted-foreground">{a.asset_categories?.name ?? "—"}</TableCell>
                                <TableCell className="text-muted-foreground">{a.asset_conditions?.name ?? "—"}</TableCell>
                                <TableCell className="text-muted-foreground">{a.asset_locations?.name ?? "—"}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  <div className="rounded-md border bg-muted/30 p-3">
                    <p className="text-sm font-medium mb-1">
                      Assets to assign ({selectedAssetIds.length})
                    </p>
                    {selectedAssetIds.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No assets selected. You can assign assets now or later from Asset Management.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedAssetIds.map((id) => {
                          const a = (availableAssets as any[]).find((x) => x.id === id);
                          if (!a) return null;
                          return (
                            <Badge key={id} variant="secondary" className="gap-1">
                              {a.asset_tag} · {a.name}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        </fieldset>
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
                  {!isViewMode && (
                    <Button variant="ghost" size="sm" onClick={skipTab} className="text-muted-foreground">
                      <SkipForward className="h-4 w-4 mr-1" />Skip
                    </Button>
                  )}
                  <Button size="sm" onClick={goNext}>
                    Next<ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </>
              )}
              {currentTabIdx === TABS.length - 1 && (
                isViewMode ? (
                  <Button size="sm" variant="outline" onClick={resetAndClose}>
                    Close
                  </Button>
                ) : (
                  <Button size="sm" onClick={validateAndSubmit} disabled={inviting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Check className="h-4 w-4 mr-1" />{isEditMode ? "Save Changes" : "Submit & Onboard"}
                  </Button>
                )
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
