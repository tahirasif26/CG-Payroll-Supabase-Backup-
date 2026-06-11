import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AppRole, EmployeeStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { InvitationsService } from '@modules/invitations/invitations.service';
import type { PaginationMeta } from '@common/dto/api-response.dto';
import { buildSkipTake } from '@common/dto/pagination.dto';
import type {
  ArchiveEmployeeDto,
  CreateEmployeeDto,
  ListEmployeesQuery,
  UpdateEmployeeDto,
  UpdateProfileDataDto,
} from './dto/employee.schemas';

/**
 * Field set returned from list endpoints. Kept lean so directory pages don't
 * accidentally fetch large blobs (avatar urls remain; richer sub-record loads
 * are explicit via findById).
 */
const directorySelect = {
  id: true,
  clientId: true,
  empId: true,
  firstName: true,
  middleName: true,
  lastName: true,
  email: true,
  phone: true,
  department: true,
  designation: true,
  division: true,
  category: true,
  joiningDate: true,
  workLocationCity: true,
  workLocationCountry: true,
  avatarUrl: true,
  status: true,
  reportsToId: true,
  payrollSetupId: true,
  payCurrency: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.EmployeeSelect;

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly invitations: InvitationsService,
  ) {}

  async list(
    clientId: string,
    query: ListEmployeesQuery,
  ): Promise<{ data: Prisma.EmployeeGetPayload<{ select: typeof directorySelect }>[]; meta: { pagination: PaginationMeta } }> {
    const where: Prisma.EmployeeWhereInput = {
      clientId,
      ...(query.status ? { status: query.status as EmployeeStatus } : {}),
      ...(query.department
        ? { department: { equals: query.department, mode: 'insensitive' } }
        : {}),
      ...(query.designation
        ? { designation: { equals: query.designation, mode: 'insensitive' } }
        : {}),
      ...(query.reportsTo ? { reportsToId: query.reportsTo } : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { empId: { contains: query.search, mode: 'insensitive' } },
              { department: { contains: query.search, mode: 'insensitive' } },
              { designation: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy = buildOrderBy(query.sortBy, query.sortDir);
    const { skip, take } = buildSkipTake(query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.employee.findMany({ where, orderBy, skip, take, select: directorySelect }),
      this.prisma.employee.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          total,
          totalPages: Math.ceil(total / query.pageSize),
        },
      },
    };
  }

  async findById(clientId: string, id: string) {
    const emp = await this.prisma.employee.findFirst({
      where: { id, clientId },
      include: {
        reportsTo: { select: directorySelect },
        directReports: { select: directorySelect },
      },
    });
    if (!emp) throw notFound();
    return emp;
  }

  /**
   * Eager-load the employee with every sub-record needed by the profile page.
   * Singleton sub-records (address / bank / emergency) take "the latest" — this
   * matches the existing FE behavior in [useEmployeeProfile](src/hooks/queries/useEmployeeProfile.ts)
   * which fetched only the most-recent row of each.
   */
  async findProfileById(clientId: string, id: string) {
    const emp = await this.prisma.employee.findFirst({
      where: { id, clientId },
      include: {
        reportsTo: { select: directorySelect },
        addresses: { orderBy: { createdAt: 'desc' }, take: 1 },
        bankDetails: { orderBy: { createdAt: 'desc' }, take: 1 },
        emergencyContacts: { orderBy: { createdAt: 'desc' }, take: 1 },
        education: { orderBy: [{ endYear: 'desc' }, { startYear: 'desc' }] },
        documents: { orderBy: { createdAt: 'desc' } },
        compensation: {
          where: { effectiveTo: null },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!emp) throw notFound();
    return emp;
  }

  /** Resolves the Employee record linked to the current user, scoped to a client. */
  async findByUserId(clientId: string, userId: string) {
    const emp = await this.prisma.employee.findFirst({
      where: { clientId, userId },
      include: {
        reportsTo: { select: directorySelect },
      },
    });
    if (!emp) throw notFound();
    return emp;
  }

  async create(
    clientId: string,
    dto: CreateEmployeeDto,
    invitedByUserId?: string | null,
  ) {
    // Auto-generate empId when the wizard didn't supply one. Falls back to
    // (clientId, empId) uniqueness check below so racing creates still get a
    // friendly error rather than a raw P2022.
    const empId = dto.empId ?? (await this.nextEmpId(clientId));

    const existing = await this.prisma.employee.findFirst({
      where: { clientId, empId },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException({
        code: 'EMP_ID_TAKEN',
        message: `An employee with code "${empId}" already exists`,
      });
    }

    // Strip the invitation-control flags before handing the rest to Prisma —
    // those aren't columns on `employees`.
    const { sendInvite, inviteRoleId, ...rowDto } = dto;

    const employee = await this.prisma.employee.create({
      data: {
        ...rowDto,
        empId,
        clientId,
        // If we're sending an invite, the row starts in `pending` until the
        // employee accepts and a User gets linked. Otherwise honour the
        // caller's status (default to `active` via the Prisma column default).
        status: sendInvite ? EmployeeStatus.pending : (rowDto.status as EmployeeStatus | undefined),
        dateOfBirth: parseDate(rowDto.dateOfBirth),
        joiningDate: parseDate(rowDto.joiningDate),
        probationEndDate: parseDate(rowDto.probationEndDate),
        avatarUrl: rowDto.avatarUrl ?? null,
      },
    });

    let invitationId: string | null = null;
    let inviteEmailSent = true;
    if (sendInvite) {
      try {
        // Resolve the role to attach to the invitation. Prefer the caller's
        // choice; otherwise pick the tenant's system `Employee` role.
        let roleId = inviteRoleId ?? null;
        if (!roleId) {
          const sysEmployeeRole = await this.prisma.role.findFirst({
            where: { clientId, appRole: AppRole.employee, isSystem: true },
            select: { id: true },
          });
          roleId = sysEmployeeRole?.id ?? null;
        }

        const inv = await this.invitations.create({
          dto: {
            email: employee.email,
            appRole: AppRole.employee,
            roleId: roleId ?? undefined,
            firstName: employee.firstName,
            lastName: employee.lastName,
            empId: employee.empId,
            department: employee.department ?? undefined,
            designation: employee.designation ?? undefined,
          },
          clientId,
          invitedByUserId: invitedByUserId ?? null,
        });
        invitationId = inv.id;
      } catch (err) {
        // Don't roll back the employee — the admin can resend the invite
        // from the employee detail view. Surface the failure so the FE can
        // show a warning toast.
        inviteEmailSent = false;
        this.logger.error(
          `Employee ${employee.id} created but invitation send failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return { employee, invitation: invitationId ? { id: invitationId, emailSent: inviteEmailSent } : null };
  }

  /**
   * Best-effort fallback empId used only when the FE doesn't supply one.
   * Scans every employee row in the tenant for a `<prefix>-<digits>$` suffix
   * and picks `max(suffix) + 1`. Walking ALL rows (instead of trusting
   * alphabetical-desc ordering on `empId`) means a mixed dataset like
   * `EMP-001`, `EMP-002`, `EMP-CA-001` doesn't fool the suffix detector into
   * resetting to `001`.
   *
   * Not transactional — two concurrent creates can still collide on the
   * unique `(clientId, empId)` constraint; the caller catches that 409.
   */
  private async nextEmpId(clientId: string): Promise<string> {
    const rows = await this.prisma.employee.findMany({
      where: { clientId },
      select: { empId: true },
    });
    let maxSuffix = 0;
    for (const r of rows) {
      const m = r.empId?.match(/-(\d+)$/);
      if (m) {
        const n = Number(m[1]);
        if (Number.isFinite(n) && n > maxSuffix) maxSuffix = n;
      }
    }
    return `EMP-${String(maxSuffix + 1).padStart(3, '0')}`;
  }

  async update(clientId: string, id: string, dto: UpdateEmployeeDto) {
    await this.ensureExists(clientId, id);
    return this.prisma.employee.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.dateOfBirth !== undefined ? { dateOfBirth: parseDate(dto.dateOfBirth) } : {}),
        ...(dto.joiningDate !== undefined ? { joiningDate: parseDate(dto.joiningDate) } : {}),
        ...(dto.probationEndDate !== undefined
          ? { probationEndDate: parseDate(dto.probationEndDate) }
          : {}),
      },
    });
  }

  /**
   * Soft archival via status change. The real "separation" flow lands in
   * Phase 7 with EOSB settlement; this is the bare-bones admin escape hatch.
   */
  async archive(clientId: string, id: string, dto: ArchiveEmployeeDto) {
    await this.ensureExists(clientId, id);
    return this.prisma.employee.update({
      where: { id },
      data: {
        status: EmployeeStatus.separated,
        separationDate: parseDate(dto.separationDate) ?? new Date(),
      },
    });
  }

  private async ensureExists(clientId: string, id: string) {
    const exists = await this.prisma.employee.findFirst({
      where: { id, clientId },
      select: { id: true },
    });
    if (!exists) throw notFound();
  }

  /**
   * Transactionally save all six profile sub-records. Strategy mirrors the
   * existing FE upsert behavior:
   *   - singletons (address / bank / emergency) → upsert the latest row
   *   - collections (education / documents / compensation) → delete-then-insert
   *
   * Each section is optional; only sections present in the DTO are touched.
   */
  async updateProfileData(clientId: string, id: string, dto: UpdateProfileDataDto) {
    await this.ensureExists(clientId, id);

    await this.prisma.$transaction(async (tx) => {
      // ── address (singleton: keep one row) ─────────────────────────────
      if (dto.address) {
        const current = await tx.employeeAddress.findFirst({
          where: { employeeId: id, clientId },
          orderBy: { createdAt: 'desc' },
        });
        if (current) {
          await tx.employeeAddress.update({
            where: { id: current.id },
            data: dto.address,
          });
        } else {
          await tx.employeeAddress.create({
            data: { ...dto.address, employeeId: id, clientId },
          });
        }
      }

      // ── bank details (singleton) ──────────────────────────────────────
      if (dto.bankDetails) {
        const current = await tx.employeeBankDetails.findFirst({
          where: { employeeId: id, clientId },
          orderBy: { createdAt: 'desc' },
        });
        if (current) {
          await tx.employeeBankDetails.update({
            where: { id: current.id },
            data: dto.bankDetails,
          });
        } else {
          await tx.employeeBankDetails.create({
            data: { ...dto.bankDetails, employeeId: id, clientId },
          });
        }
      }

      // ── emergency contact (singleton) ─────────────────────────────────
      if (dto.emergencyContact) {
        const current = await tx.employeeEmergencyContact.findFirst({
          where: { employeeId: id, clientId },
          orderBy: { createdAt: 'desc' },
        });
        if (current) {
          await tx.employeeEmergencyContact.update({
            where: { id: current.id },
            data: dto.emergencyContact,
          });
        } else {
          await tx.employeeEmergencyContact.create({
            data: { ...dto.emergencyContact, employeeId: id, clientId },
          });
        }
      }

      // ── education (collection: replace) ───────────────────────────────
      if (dto.education) {
        await tx.employeeEducation.deleteMany({
          where: { employeeId: id, clientId },
        });
        const rows = dto.education
          .filter((e) => e.institution || e.degree || e.fieldOfStudy)
          .map((e) => ({ ...e, employeeId: id, clientId }));
        if (rows.length > 0) {
          await tx.employeeEducation.createMany({ data: rows });
        }
      }

      // ── documents (collection: replace) ───────────────────────────────
      if (dto.documents) {
        await tx.employeeDocument.deleteMany({
          where: { employeeId: id, clientId },
        });
        const rows = dto.documents
          .filter((d) => d.docType || d.docNumber || d.fileUrl)
          .map((d) => ({
            ...d,
            employeeId: id,
            clientId,
            issueDate: parseDate(d.issueDate),
            expiryDate: parseDate(d.expiryDate),
          }));
        if (rows.length > 0) {
          await tx.employeeDocument.createMany({ data: rows });
        }
      }

      // ── compensation (collection: replace active components) ──────────
      if (dto.compensation) {
        // Only replace the active set (effectiveTo IS NULL). Historic rows
        // with an effectiveTo date are preserved as the audit trail.
        await tx.employeeCompensation.deleteMany({
          where: { employeeId: id, clientId, effectiveTo: null },
        });
        const rows = dto.compensation.map((c) => ({
          ...c,
          employeeId: id,
          clientId,
          effectiveFrom: parseDate(c.effectiveFrom),
          effectiveTo: parseDate(c.effectiveTo),
        }));
        if (rows.length > 0) {
          await tx.employeeCompensation.createMany({ data: rows });
        }
      }
    });

    return this.findProfileById(clientId, id);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────

const SORTABLE = new Set<keyof Prisma.EmployeeOrderByWithRelationInput>([
  'firstName',
  'lastName',
  'empId',
  'department',
  'designation',
  'joiningDate',
  'createdAt',
  'updatedAt',
  'status',
]);

function buildOrderBy(
  sortBy: string | undefined,
  sortDir: 'asc' | 'desc',
): Prisma.EmployeeOrderByWithRelationInput | Prisma.EmployeeOrderByWithRelationInput[] {
  if (sortBy && SORTABLE.has(sortBy as keyof Prisma.EmployeeOrderByWithRelationInput)) {
    return { [sortBy]: sortDir } as Prisma.EmployeeOrderByWithRelationInput;
  }
  return [{ firstName: 'asc' }, { lastName: 'asc' }];
}

function parseDate(input: string | null | undefined): Date | null | undefined {
  if (input === undefined) return undefined;
  if (input === null || input === '') return null;
  return new Date(input);
}

function notFound() {
  return new NotFoundException({ code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found' });
}
