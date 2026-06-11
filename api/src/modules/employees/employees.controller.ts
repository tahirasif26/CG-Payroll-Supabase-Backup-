import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActiveClientId, ClientScope } from '@common/decorators/client-scope.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe';
import { ClientScopeGuard } from '@modules/auth/guards/client-scope.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { EmployeesService } from './employees.service';
import {
  archiveEmployeeSchema,
  createEmployeeSchema,
  listEmployeesQuerySchema,
  updateEmployeeSchema,
  updateProfileDataSchema,
  type ArchiveEmployeeDto,
  type CreateEmployeeDto,
  type ListEmployeesQuery,
  type UpdateEmployeeDto,
  type UpdateProfileDataDto,
} from './dto/employee.schemas';
import type { RequestUser } from '@common/types/jwt-payload';

@ApiTags('employees')
@ApiBearerAuth('access-token')
@UseGuards(ClientScopeGuard, RolesGuard)
@ClientScope()
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  /** Directory listing — visible to every authenticated member of the client. */
  @Get()
  @Roles('super_admin', 'admin', 'hr', 'employee')
  @ApiOperation({ summary: 'List employees in the active client' })
  list(
    @ActiveClientId() clientId: string,
    @Query(new ZodValidationPipe(listEmployeesQuerySchema)) query: ListEmployeesQuery,
  ) {
    return this.employees.list(clientId, query);
  }

  /**
   * Returns the Employee record linked to the current user. Convenience for
   * self-service pages so the FE doesn't have to round-trip through /users/me
   * to discover the employee id.
   */
  @Get('me')
  @Roles('super_admin', 'admin', 'hr', 'employee')
  @ApiOperation({ summary: "Get the current user's employee record" })
  findMine(@ActiveClientId() clientId: string, @CurrentUser() user: RequestUser) {
    return this.employees.findByUserId(clientId, user.id);
  }

  @Get(':id')
  @Roles('super_admin', 'admin', 'hr', 'employee')
  @ApiOperation({ summary: 'Get a single employee by id' })
  findOne(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.employees.findById(clientId, id);
  }

  @Get(':id/profile')
  @Roles('super_admin', 'admin', 'hr', 'employee')
  @ApiOperation({
    summary: 'Get an employee with all profile sub-records',
    description:
      'Returns the employee + latest address / bank / emergency contact, plus the full ' +
      'education / documents / active-compensation collections. Drives MyProfilePage and ' +
      'admin profile editors.',
  })
  findProfile(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.employees.findProfileById(clientId, id);
  }

  @Patch(':id/profile')
  @Roles('super_admin', 'admin', 'hr', 'employee')
  @ApiOperation({
    summary: 'Bulk-save profile sub-records (transactional)',
    description:
      'Each section is optional. Singletons (address/bank/emergency) upsert the latest row. ' +
      'Collections (education/documents/compensation) replace the current set; historic ' +
      'compensation rows (effectiveTo != null) are preserved as audit trail.',
  })
  updateProfile(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateProfileDataSchema)) dto: UpdateProfileDataDto,
  ) {
    return this.employees.updateProfileData(clientId, id, dto);
  }

  @Post()
  @Roles('super_admin', 'admin', 'hr')
  @ApiOperation({ summary: 'Create a new employee (admin / hr)' })
  create(
    @ActiveClientId() clientId: string,
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createEmployeeSchema)) dto: CreateEmployeeDto,
  ) {
    return this.employees.create(clientId, dto, user.id);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin', 'hr')
  @ApiOperation({ summary: 'Update an employee (admin / hr)' })
  update(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateEmployeeSchema)) dto: UpdateEmployeeDto,
  ) {
    return this.employees.update(clientId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles('super_admin', 'admin', 'hr')
  @ApiOperation({
    summary: 'Archive an employee — soft delete via status=separated',
    description:
      'Permanent deletion is not exposed. Full separation flow with settlement (EOSB, ' +
      'leave encashment, etc.) lands in the Separations module.',
  })
  archive(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(archiveEmployeeSchema.partial())) dto: ArchiveEmployeeDto,
  ) {
    return this.employees.archive(clientId, id, dto);
  }
}
