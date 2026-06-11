import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ActiveClientId, ClientScope } from '@common/decorators/client-scope.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe';
import { ClientScopeGuard } from '@modules/auth/guards/client-scope.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { OrgStructureService } from './org-structure.service';
import {
  createDesignationSchema,
  createNamedLookupSchema,
  updateDesignationSchema,
  updateNamedLookupSchema,
  type CreateDesignationDto,
  type CreateNamedLookupDto,
  type UpdateDesignationDto,
  type UpdateNamedLookupDto,
} from './dto/org-structure.schemas';

@ApiTags('org-structure')
@ApiBearerAuth('access-token')
@UseGuards(ClientScopeGuard, RolesGuard)
@ClientScope()
@Controller()
export class OrgStructureController {
  constructor(private readonly org: OrgStructureService) {}

  // ─── Divisions ────────────────────────────────────────────────────────

  @Get('divisions')
  @Roles('super_admin', 'admin', 'hr', 'employee')
  listDivisions(@ActiveClientId() clientId: string) {
    return this.org.listDivisions(clientId);
  }

  @Post('divisions')
  @Roles('super_admin', 'admin', 'hr')
  createDivision(
    @ActiveClientId() clientId: string,
    @Body(new ZodValidationPipe(createNamedLookupSchema)) dto: CreateNamedLookupDto,
  ) {
    return this.org.createDivision(clientId, dto);
  }

  @Patch('divisions/:id')
  @Roles('super_admin', 'admin', 'hr')
  updateDivision(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateNamedLookupSchema)) dto: UpdateNamedLookupDto,
  ) {
    return this.org.updateDivision(clientId, id, dto);
  }

  @Delete('divisions/:id')
  @Roles('super_admin', 'admin', 'hr')
  deleteDivision(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.org.deleteDivision(clientId, id);
  }

  // ─── Departments ──────────────────────────────────────────────────────

  @Get('departments')
  @Roles('super_admin', 'admin', 'hr', 'employee')
  listDepartments(@ActiveClientId() clientId: string) {
    return this.org.listDepartments(clientId);
  }

  @Post('departments')
  @Roles('super_admin', 'admin', 'hr')
  createDepartment(
    @ActiveClientId() clientId: string,
    @Body(new ZodValidationPipe(createNamedLookupSchema)) dto: CreateNamedLookupDto,
  ) {
    return this.org.createDepartment(clientId, dto);
  }

  @Patch('departments/:id')
  @Roles('super_admin', 'admin', 'hr')
  updateDepartment(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateNamedLookupSchema)) dto: UpdateNamedLookupDto,
  ) {
    return this.org.updateDepartment(clientId, id, dto);
  }

  @Delete('departments/:id')
  @Roles('super_admin', 'admin', 'hr')
  deleteDepartment(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.org.deleteDepartment(clientId, id);
  }

  // ─── Designations ─────────────────────────────────────────────────────

  @Get('designations')
  @Roles('super_admin', 'admin', 'hr', 'employee')
  listDesignations(@ActiveClientId() clientId: string) {
    return this.org.listDesignations(clientId);
  }

  @Post('designations')
  @Roles('super_admin', 'admin', 'hr')
  createDesignation(
    @ActiveClientId() clientId: string,
    @Body(new ZodValidationPipe(createDesignationSchema)) dto: CreateDesignationDto,
  ) {
    return this.org.createDesignation(clientId, dto);
  }

  @Patch('designations/:id')
  @Roles('super_admin', 'admin', 'hr')
  updateDesignation(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateDesignationSchema)) dto: UpdateDesignationDto,
  ) {
    return this.org.updateDesignation(clientId, id, dto);
  }

  @Delete('designations/:id')
  @Roles('super_admin', 'admin', 'hr')
  deleteDesignation(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.org.deleteDesignation(clientId, id);
  }
}
