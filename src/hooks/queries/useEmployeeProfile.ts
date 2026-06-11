/**
 * Phase 3b-cutover: adapter over the new NestJS profile endpoints. Consumers
 * (MyProfilePage) keep the same `useEmployeeProfile` / `useUpdateEmployeeProfile`
 * import paths and snake_case shape so the 971-line page doesn't have to be
 * rewritten.
 *
 * Maps camelCase API responses ↔ snake_case UI shapes both directions.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  employeesApi,
  employeeKeys,
  isApiClientError,
  type EmployeeProfile,
  type UpdateEmployeeProfileRequest,
  type EducationRowInput,
} from "@/api";

// ─── Snake-case row shapes (matches what the existing UI reads) ─────────────

type EmployeeRow = {
  id: string;
  client_id: string;
  emp_id: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  email: string;
  personal_email: string | null;
  phone: string | null;
  personal_phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  marital_status: string | null;
  nationality: string | null;
  religion: string | null;
  department: string | null;
  designation: string | null;
  division: string | null;
  category: string | null;
  joining_date: string | null;
  probation_end_date: string | null;
  work_location_country: string | null;
  work_location_city: string | null;
  pay_currency: string | null;
  reports_to: string | null;
  payroll_setup_id: string | null;
  avatar_url: string | null;
  status: string;
};

type AddressRow = {
  id: string;
  employee_id: string;
  type: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
};

type BankRow = {
  id: string;
  employee_id: string;
  bank_name: string | null;
  bank_country: string | null;
  swift_code: string | null;
  iban: string | null;
  bank_currency: string | null;
  beneficiary_name: string | null;
  bank_address: string | null;
};

type EmergencyRow = {
  id: string;
  employee_id: string;
  name: string | null;
  relation: string | null;
  phone: string | null;
  email: string | null;
};

type EducationRow = {
  id: string;
  employee_id: string;
  institution: string | null;
  degree: string | null;
  field_of_study: string | null;
  start_year: number | null;
  end_year: number | null;
};

type CompensationRow = {
  id: string;
  employee_id: string;
  component_name: string;
  component_type: string;
  amount: number;
  currency: string | null;
  effective_from: string | null;
  effective_to: string | null;
};

export interface EmployeeProfilePayload {
  employee: EmployeeRow | null;
  address: AddressRow | null;
  bank: BankRow | null;
  emergency: EmergencyRow | null;
  education: EducationRow[];
  compensation: CompensationRow[];
  baseSalary: number;
}

// ─── camelCase → snake_case mappers ──────────────────────────────────────────

function toEmployeeRow(p: EmployeeProfile): EmployeeRow {
  return {
    id: p.id,
    client_id: p.clientId,
    emp_id: p.empId,
    first_name: p.firstName,
    last_name: p.lastName,
    middle_name: p.middleName,
    email: p.email,
    personal_email: p.personalEmail,
    phone: p.phone,
    personal_phone: p.personalPhone,
    date_of_birth: p.dateOfBirth,
    gender: p.gender,
    marital_status: p.maritalStatus,
    nationality: p.nationality,
    religion: p.religion,
    department: p.department,
    designation: p.designation,
    division: p.division,
    category: p.category,
    joining_date: p.joiningDate,
    probation_end_date: p.probationEndDate,
    work_location_country: p.workLocationCountry,
    work_location_city: p.workLocationCity,
    pay_currency: p.payCurrency,
    reports_to: p.reportsToId,
    payroll_setup_id: p.payrollSetupId,
    avatar_url: p.avatarUrl,
    status: p.status,
  };
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useEmployeeProfile(employeeId: string | undefined) {
  return useQuery({
    queryKey: employeeKeys.profile(employeeId ?? ""),
    enabled: !!employeeId,
    queryFn: async (): Promise<EmployeeProfilePayload> => {
      const p = await employeesApi.profile(employeeId!);

      const compRows: CompensationRow[] = p.compensation.map((c) => ({
        id: c.id,
        employee_id: c.employeeId,
        component_name: c.componentName,
        component_type: c.componentType,
        // BigInt minor units arrive as string; UI expects number for display.
        amount: Number(c.amount),
        currency: c.currency,
        effective_from: c.effectiveFrom,
        effective_to: c.effectiveTo,
      }));
      const baseRow = compRows.find((c) => c.component_type === "base");
      const baseSalary = baseRow
        ? baseRow.amount
        : compRows.reduce((s, c) => s + c.amount, 0);

      const a = p.addresses[0] ?? null;
      const b = p.bankDetails[0] ?? null;
      const e = p.emergencyContacts[0] ?? null;

      return {
        employee: toEmployeeRow(p),
        address: a
          ? {
              id: a.id,
              employee_id: a.employeeId,
              type: a.type,
              address_line1: a.addressLine1,
              address_line2: a.addressLine2,
              city: a.city,
              state: a.state,
              country: a.country,
              postal_code: a.postalCode,
            }
          : null,
        bank: b
          ? {
              id: b.id,
              employee_id: b.employeeId,
              bank_name: b.bankName,
              bank_country: b.bankCountry,
              swift_code: b.swiftCode,
              iban: b.iban,
              bank_currency: b.bankCurrency,
              beneficiary_name: b.beneficiaryName,
              bank_address: b.bankAddress,
            }
          : null,
        emergency: e
          ? {
              id: e.id,
              employee_id: e.employeeId,
              name: e.name,
              relation: e.relation,
              phone: e.phone,
              email: e.email,
            }
          : null,
        education: p.education.map((ed) => ({
          id: ed.id,
          employee_id: ed.employeeId,
          institution: ed.institution,
          degree: ed.degree,
          field_of_study: ed.fieldOfStudy,
          start_year: ed.startYear,
          end_year: ed.endYear,
        })),
        compensation: compRows,
        baseSalary,
      };
    },
    staleTime: 15_000,
  });
}

// ─── Update mutation ─────────────────────────────────────────────────────────

interface UpdateProfileInput {
  employeeId: string;
  bio?: {
    first_name?: string;
    last_name?: string;
    date_of_birth?: string | null;
    gender?: string | null;
    marital_status?: string | null;
    religion?: string | null;
    nationality?: string | null;
  };
  contact?: {
    personal_phone?: string | null;
    personal_email?: string | null;
  };
  emergency?: {
    name?: string;
    relation?: string;
    phone?: string;
    email?: string;
  };
  address?: {
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
  };
  bank?: {
    bank_name?: string;
    bank_country?: string;
    swift_code?: string;
    bank_address?: string;
    iban?: string;
    bank_currency?: string;
    beneficiary_name?: string;
  };
  education?: {
    id?: string;
    institution?: string;
    degree?: string;
    field_of_study?: string;
    start_year?: number | null;
  }[];
}

export function useUpdateEmployeeProfile() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      const { employeeId } = input;

      // 1. Bio + contact → PATCH /employees/:id
      const empUpdates: Record<string, unknown> = {};
      if (input.bio) {
        const { first_name, last_name, date_of_birth, gender, marital_status, religion, nationality } = input.bio;
        if (first_name !== undefined) empUpdates.firstName = first_name;
        if (last_name !== undefined) empUpdates.lastName = last_name;
        if (date_of_birth !== undefined) empUpdates.dateOfBirth = date_of_birth || null;
        if (gender !== undefined) empUpdates.gender = gender || null;
        if (marital_status !== undefined) empUpdates.maritalStatus = marital_status || null;
        if (religion !== undefined) empUpdates.religion = religion || null;
        if (nationality !== undefined) empUpdates.nationality = nationality || null;
      }
      if (input.contact) {
        if (input.contact.personal_phone !== undefined) empUpdates.personalPhone = input.contact.personal_phone || null;
        if (input.contact.personal_email !== undefined) empUpdates.personalEmail = input.contact.personal_email || null;
      }
      if (Object.keys(empUpdates).length > 0) {
        await employeesApi.update(employeeId, empUpdates);
      }

      // 2. Sub-records → PATCH /employees/:id/profile (transactional on the backend)
      const profilePatch: UpdateEmployeeProfileRequest = {};
      if (input.address) {
        profilePatch.address = {
          type: "current",
          addressLine1: input.address.address_line1 ?? null,
          addressLine2: input.address.address_line2 ?? null,
          city: input.address.city ?? null,
          state: input.address.state ?? null,
          country: input.address.country ?? null,
          postalCode: input.address.postal_code ?? null,
        };
      }
      if (input.bank) {
        profilePatch.bankDetails = {
          bankName: input.bank.bank_name ?? null,
          bankCountry: input.bank.bank_country ?? null,
          swiftCode: input.bank.swift_code ?? null,
          iban: input.bank.iban ?? null,
          bankCurrency: input.bank.bank_currency ?? null,
          beneficiaryName: input.bank.beneficiary_name ?? null,
          bankAddress: input.bank.bank_address ?? null,
        };
      }
      if (input.emergency) {
        profilePatch.emergencyContact = {
          name: input.emergency.name ?? null,
          relation: input.emergency.relation ?? null,
          phone: input.emergency.phone ?? null,
          email: input.emergency.email ?? null,
        };
      }
      if (input.education) {
        profilePatch.education = input.education
          .filter((e) => e.institution || e.degree || e.field_of_study)
          .map<EducationRowInput>((e) => ({
            institution: e.institution ?? null,
            degree: e.degree ?? null,
            fieldOfStudy: e.field_of_study ?? null,
            startYear: e.start_year ?? null,
          }));
      }
      if (Object.keys(profilePatch).length > 0) {
        await employeesApi.updateProfile(employeeId, profilePatch);
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: employeeKeys.profile(vars.employeeId) });
      qc.invalidateQueries({ queryKey: employeeKeys.detail(vars.employeeId) });
      qc.invalidateQueries({ queryKey: employeeKeys.all });
      toast({ title: "Saved", description: "Profile updated successfully." });
    },
    onError: (err) => {
      toast({
        title: "Save failed",
        description: isApiClientError(err) ? err.toToastMessage() : (err as Error).message,
        variant: "destructive",
      });
    },
  });
}
