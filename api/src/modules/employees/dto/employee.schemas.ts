import { z } from 'zod';
import { paginationQuerySchema } from '@common/dto/pagination.dto';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
  .optional()
  .nullable();

export const employeeStatusEnum = z.enum(['active', 'on_leave', 'separated', 'pending']);

export const listEmployeesQuerySchema = paginationQuerySchema.extend({
  status: employeeStatusEnum.optional(),
  department: z.string().trim().optional(),
  designation: z.string().trim().optional(),
  /** Restrict to reports of a given manager (employee id). */
  reportsTo: z.string().uuid().optional(),
});
export type ListEmployeesQuery = z.infer<typeof listEmployeesQuerySchema>;

export const createEmployeeSchema = z.object({
  /**
   * Human-readable employee code. Optional — the service auto-generates
   * `EMP-001`, `EMP-002` … per tenant when the caller doesn't supply one.
   */
  empId: z.string().trim().min(1).max(40).optional(),
  firstName: z.string().trim().min(1).max(80),
  middleName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email(),
  personalEmail: z.string().trim().toLowerCase().email().optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  personalPhone: z.string().trim().max(40).optional().nullable(),
  dateOfBirth: isoDate,
  gender: z.string().trim().max(20).optional().nullable(),
  maritalStatus: z.string().trim().max(20).optional().nullable(),
  nationality: z.string().trim().max(80).optional().nullable(),
  religion: z.string().trim().max(40).optional().nullable(),
  department: z.string().trim().max(120).optional().nullable(),
  designation: z.string().trim().max(120).optional().nullable(),
  division: z.string().trim().max(120).optional().nullable(),
  category: z.string().trim().max(120).optional().nullable(),
  joiningDate: isoDate,
  probationEndDate: isoDate,
  workLocationCountry: z.string().trim().max(80).optional().nullable(),
  workLocationCity: z.string().trim().max(120).optional().nullable(),
  payCurrency: z.string().trim().min(3).max(3).toUpperCase().optional().nullable(),
  reportsToId: z.string().uuid().optional().nullable(),
  /** Which PayrollSetup drives this employee's compensation calculations. */
  payrollSetupId: z.string().uuid().optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  status: employeeStatusEnum.optional(),
  /**
   * Send an invitation email to the new employee. When true the service:
   *   - forces `status: 'pending'` on the new row
   *   - creates an Invitation pointing at the employee's role
   *   - sends the accept-invite email via MailService
   * On accept, `InvitationsService.accept` links the user to this employee
   * and flips status back to `active`.
   */
  sendInvite: z.boolean().optional().default(false),
  /** Role id to assign on invitation accept (defaults to the system Employee role for the tenant). */
  inviteRoleId: z.string().uuid().optional().nullable(),
});
export type CreateEmployeeDto = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = createEmployeeSchema
  .partial()
  .omit({ empId: true, sendInvite: true, inviteRoleId: true });
export type UpdateEmployeeDto = z.infer<typeof updateEmployeeSchema>;

export const archiveEmployeeSchema = z.object({
  separationDate: isoDate,
  status: z.enum(['separated']).default('separated'),
});
export type ArchiveEmployeeDto = z.infer<typeof archiveEmployeeSchema>;

// ─── Phase 3b: sub-records ───────────────────────────────────────────────────

export const addressInputSchema = z.object({
  type: z.string().trim().max(40).optional().nullable(),
  addressLine1: z.string().trim().max(200).optional().nullable(),
  addressLine2: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  state: z.string().trim().max(120).optional().nullable(),
  country: z.string().trim().max(80).optional().nullable(),
  postalCode: z.string().trim().max(40).optional().nullable(),
});
export type AddressInput = z.infer<typeof addressInputSchema>;

export const bankDetailsInputSchema = z.object({
  bankName: z.string().trim().max(160).optional().nullable(),
  bankCountry: z.string().trim().max(80).optional().nullable(),
  swiftCode: z.string().trim().max(32).optional().nullable(),
  iban: z.string().trim().max(64).optional().nullable(),
  bankCurrency: z.string().trim().max(8).optional().nullable(),
  beneficiaryName: z.string().trim().max(160).optional().nullable(),
  bankAddress: z.string().trim().max(240).optional().nullable(),
  accountNumber: z.string().trim().max(64).optional().nullable(),
});
export type BankDetailsInput = z.infer<typeof bankDetailsInputSchema>;

export const emergencyContactInputSchema = z.object({
  name: z.string().trim().max(120).optional().nullable(),
  relation: z.string().trim().max(60).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  email: z.string().trim().toLowerCase().email().optional().nullable(),
});
export type EmergencyContactInput = z.infer<typeof emergencyContactInputSchema>;

export const educationRowSchema = z.object({
  institution: z.string().trim().max(200).optional().nullable(),
  degree: z.string().trim().max(120).optional().nullable(),
  fieldOfStudy: z.string().trim().max(120).optional().nullable(),
  startYear: z.coerce.number().int().min(1900).max(2200).optional().nullable(),
  endYear: z.coerce.number().int().min(1900).max(2200).optional().nullable(),
});
export type EducationRow = z.infer<typeof educationRowSchema>;

export const documentRowSchema = z.object({
  docType: z.string().trim().max(80).optional().nullable(),
  docNumber: z.string().trim().max(120).optional().nullable(),
  issueDate: isoDate,
  expiryDate: isoDate,
  fileUrl: z.string().trim().max(500).optional().nullable(),
  status: z.string().trim().max(40).optional().nullable(),
});
export type DocumentRow = z.infer<typeof documentRowSchema>;

export const compensationRowSchema = z.object({
  componentName: z.string().trim().min(1).max(120),
  componentType: z.string().trim().min(1).max(60), // base | allowance | bonus | deduction | ...
  /** Minor units (halalas / fils / cents). Accept string to dodge JS bigint serialization quirks. */
  amount: z.union([z.string(), z.number()]).transform((v) => BigInt(v)),
  currency: z.string().trim().max(8).optional().nullable(),
  effectiveFrom: isoDate,
  effectiveTo: isoDate,
});
export type CompensationRow = z.infer<typeof compensationRowSchema>;

/**
 * Bulk profile-data save. Each field is optional; only the keys present in the
 * request are mutated. Collections (education/documents/compensation) replace
 * the existing set; singletons (address/bank/emergency) upsert "the latest".
 */
export const updateProfileDataSchema = z.object({
  address: addressInputSchema.optional(),
  bankDetails: bankDetailsInputSchema.optional(),
  emergencyContact: emergencyContactInputSchema.optional(),
  education: z.array(educationRowSchema).optional(),
  documents: z.array(documentRowSchema).optional(),
  compensation: z.array(compensationRowSchema).optional(),
});
export type UpdateProfileDataDto = z.infer<typeof updateProfileDataSchema>;
