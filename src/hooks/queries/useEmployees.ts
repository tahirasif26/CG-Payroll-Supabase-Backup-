/**
 * Phase 4-cutover shim. Wraps the NestJS @/api employees hooks but preserves
 * the legacy snake_case row shape and the exported signatures consumed by
 * various pages.
 */
import {
  useEmployees as useEmployeesApi,
  useEmployee as useEmployeeApi,
  useCreateEmployee as useCreateEmployeeApi,
  useUpdateEmployee as useUpdateEmployeeApi,
  useArchiveEmployee,
  type EmployeeDirectoryItem,
  type Employee as ApiEmployee,
} from "@/api";

export interface EmployeeFilters {
  status?: string;
  department?: string;
  search?: string;
}

export interface EmployeeRow {
  id: string;
  client_id: string;
  emp_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  department: string | null;
  designation: string | null;
  joining_date: string | null;
  status: string;
  avatar_url: string | null;
  date_of_birth: string | null;
  category: string | null;
  work_location_country: string | null;
  pay_currency: string | null;
  reports_to: string | null;
}

export interface CreateEmployeeInput {
  emp_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  department?: string | null;
  designation?: string | null;
  joining_date?: string | null;
  status?: string;
  category?: string | null;
  work_location_country?: string | null;
  pay_currency?: string | null;
}

function dirToRow(d: EmployeeDirectoryItem): EmployeeRow {
  return {
    id: d.id,
    client_id: d.clientId,
    emp_id: d.empId,
    first_name: d.firstName,
    last_name: d.lastName,
    email: d.email,
    phone: d.phone,
    department: d.department,
    designation: d.designation,
    joining_date: d.joiningDate,
    status: d.status,
    avatar_url: d.avatarUrl,
    date_of_birth: null,
    category: d.category,
    work_location_country: d.workLocationCountry,
    pay_currency: d.payCurrency,
    reports_to: d.reportsToId,
  };
}

function fullToRow(e: ApiEmployee): EmployeeRow {
  return {
    id: e.id,
    client_id: e.clientId,
    emp_id: e.empId,
    first_name: e.firstName,
    last_name: e.lastName,
    email: e.email,
    phone: e.phone,
    department: e.department,
    designation: e.designation,
    joining_date: e.joiningDate,
    status: e.status,
    avatar_url: e.avatarUrl,
    date_of_birth: e.dateOfBirth,
    category: e.category,
    work_location_country: e.workLocationCountry,
    pay_currency: e.payCurrency,
    reports_to: e.reportsToId,
  };
}

export function useEmployees(filters?: EmployeeFilters) {
  const q = useEmployeesApi({
    pageSize: 500,
    status: filters?.status as never,
    department: filters?.department,
    search: filters?.search,
  });
  return {
    ...q,
    data: (q.data?.data ?? []).map(dirToRow),
  };
}

export function useEmployee(id: string | undefined) {
  const q = useEmployeeApi(id);
  return {
    ...q,
    data: q.data ? fullToRow(q.data as unknown as ApiEmployee) : undefined,
  };
}

export function useCreateEmployee() {
  const m = useCreateEmployeeApi();
  return {
    ...m,
    mutate: (input: CreateEmployeeInput) =>
      m.mutate({
        empId: input.emp_id,
        firstName: input.first_name,
        lastName: input.last_name,
        email: input.email,
        phone: input.phone ?? null,
        department: input.department ?? null,
        designation: input.designation ?? null,
        joiningDate: input.joining_date ?? null,
        status: (input.status ?? "active") as never,
        category: input.category ?? null,
        workLocationCountry: input.work_location_country ?? null,
        payCurrency: input.pay_currency ?? null,
      }),
    mutateAsync: async (input: CreateEmployeeInput) =>
      m.mutateAsync({
        empId: input.emp_id,
        firstName: input.first_name,
        lastName: input.last_name,
        email: input.email,
        phone: input.phone ?? null,
        department: input.department ?? null,
        designation: input.designation ?? null,
        joiningDate: input.joining_date ?? null,
        status: (input.status ?? "active") as never,
        category: input.category ?? null,
        workLocationCountry: input.work_location_country ?? null,
        payCurrency: input.pay_currency ?? null,
      }),
  };
}

export function useUpdateEmployee() {
  const m = useUpdateEmployeeApi();
  const buildBody = (patch: Partial<EmployeeRow>) => ({
    firstName: patch.first_name,
    lastName: patch.last_name,
    email: patch.email ?? undefined,
    phone: patch.phone ?? undefined,
    department: patch.department ?? undefined,
    designation: patch.designation ?? undefined,
    joiningDate: patch.joining_date ?? undefined,
    status: patch.status as never,
    category: patch.category ?? undefined,
    workLocationCountry: patch.work_location_country ?? undefined,
    payCurrency: patch.pay_currency ?? undefined,
  });
  return {
    ...m,
    mutate: ({ id, patch }: { id: string; patch: Partial<EmployeeRow> }) =>
      m.mutate({ id, body: buildBody(patch) }),
    mutateAsync: async ({ id, patch }: { id: string; patch: Partial<EmployeeRow> }) =>
      m.mutateAsync({ id, body: buildBody(patch) }),
  };
}

export function useDeactivateEmployee() {
  const m = useArchiveEmployee();
  return {
    ...m,
    mutate: (id: string) => m.mutate({ id }),
    mutateAsync: async (id: string) => m.mutateAsync({ id }),
  };
}
