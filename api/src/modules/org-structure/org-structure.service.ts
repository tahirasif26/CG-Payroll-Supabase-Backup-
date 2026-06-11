import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import type {
  CreateDesignationDto,
  CreateNamedLookupDto,
  UpdateDesignationDto,
  UpdateNamedLookupDto,
} from './dto/org-structure.schemas';

/**
 * CRUD for the three per-tenant org-structure lookups:
 *   - Divisions  (name only)
 *   - Departments (name only)
 *   - Designations (name + numeric seniority level)
 *
 * Each table has a `(clientId, name)` unique constraint — duplicate inserts
 * surface as a 409 ConflictException so the wizard's toast can show a useful
 * message rather than "Internal server error".
 *
 * Deletes are hard deletes. Employees keep free-text snapshots of
 * department/designation strings (see Employee.department / .designation), so
 * removing a row here doesn't dangle any FK or corrupt historical records.
 */
@Injectable()
export class OrgStructureService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Divisions ────────────────────────────────────────────────────────

  listDivisions(clientId: string) {
    return this.prisma.division.findMany({
      where: { clientId },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  async createDivision(clientId: string, dto: CreateNamedLookupDto) {
    try {
      return await this.prisma.division.create({
        data: { clientId, name: dto.name, isActive: dto.isActive ?? true },
      });
    } catch (err) {
      throw this.translateUniqueViolation(err, 'Division', dto.name);
    }
  }

  async updateDivision(clientId: string, id: string, dto: UpdateNamedLookupDto) {
    await this.ensureDivisionInClient(clientId, id);
    try {
      return await this.prisma.division.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });
    } catch (err) {
      throw this.translateUniqueViolation(err, 'Division', dto.name ?? id);
    }
  }

  async deleteDivision(clientId: string, id: string) {
    await this.ensureDivisionInClient(clientId, id);
    return this.prisma.division.delete({ where: { id } });
  }

  // ─── Departments ──────────────────────────────────────────────────────

  listDepartments(clientId: string) {
    return this.prisma.department.findMany({
      where: { clientId },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  async createDepartment(clientId: string, dto: CreateNamedLookupDto) {
    try {
      return await this.prisma.department.create({
        data: { clientId, name: dto.name, isActive: dto.isActive ?? true },
      });
    } catch (err) {
      throw this.translateUniqueViolation(err, 'Department', dto.name);
    }
  }

  async updateDepartment(clientId: string, id: string, dto: UpdateNamedLookupDto) {
    await this.ensureDepartmentInClient(clientId, id);
    try {
      return await this.prisma.department.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });
    } catch (err) {
      throw this.translateUniqueViolation(err, 'Department', dto.name ?? id);
    }
  }

  async deleteDepartment(clientId: string, id: string) {
    await this.ensureDepartmentInClient(clientId, id);
    return this.prisma.department.delete({ where: { id } });
  }

  // ─── Designations ─────────────────────────────────────────────────────

  listDesignations(clientId: string) {
    return this.prisma.designation.findMany({
      where: { clientId },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  async createDesignation(clientId: string, dto: CreateDesignationDto) {
    try {
      return await this.prisma.designation.create({
        data: {
          clientId,
          name: dto.name,
          level: dto.level ?? null,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (err) {
      throw this.translateUniqueViolation(err, 'Designation', dto.name);
    }
  }

  async updateDesignation(
    clientId: string,
    id: string,
    dto: UpdateDesignationDto,
  ) {
    await this.ensureDesignationInClient(clientId, id);
    try {
      return await this.prisma.designation.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.level !== undefined ? { level: dto.level } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });
    } catch (err) {
      throw this.translateUniqueViolation(err, 'Designation', dto.name ?? id);
    }
  }

  async deleteDesignation(clientId: string, id: string) {
    await this.ensureDesignationInClient(clientId, id);
    return this.prisma.designation.delete({ where: { id } });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  private async ensureDivisionInClient(clientId: string, id: string) {
    const row = await this.prisma.division.findFirst({
      where: { id, clientId },
      select: { id: true },
    });
    if (!row) {
      throw new NotFoundException({
        code: 'DIVISION_NOT_FOUND',
        message: 'Division not found',
      });
    }
  }

  private async ensureDepartmentInClient(clientId: string, id: string) {
    const row = await this.prisma.department.findFirst({
      where: { id, clientId },
      select: { id: true },
    });
    if (!row) {
      throw new NotFoundException({
        code: 'DEPARTMENT_NOT_FOUND',
        message: 'Department not found',
      });
    }
  }

  private async ensureDesignationInClient(clientId: string, id: string) {
    const row = await this.prisma.designation.findFirst({
      where: { id, clientId },
      select: { id: true },
    });
    if (!row) {
      throw new NotFoundException({
        code: 'DESIGNATION_NOT_FOUND',
        message: 'Designation not found',
      });
    }
  }

  /** Prisma P2002 → 409 with the entity + name in the message. */
  private translateUniqueViolation(err: unknown, entity: string, name?: string) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return new ConflictException({
        code: `${entity.toUpperCase()}_NAME_TAKEN`,
        message: name
          ? `${entity} "${name}" already exists`
          : `${entity} with this name already exists`,
      });
    }
    return err;
  }
}
