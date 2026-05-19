import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ActiveClientId, ClientScope } from '@common/decorators/client-scope.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { ZodValidationPipe } from '@common/pipes/zod-validation.pipe';
import { ClientScopeGuard } from '@modules/auth/guards/client-scope.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { PerformanceService } from './performance.service';
import {
  createAssessmentSchema,
  createCycleSchema,
  submitAssessmentSchema,
  updateCycleStatusSchema,
  upsertCalibrationSchema,
  upsertQuestionnaireSchema,
  type CreateAssessmentDto,
  type CreateCycleDto,
  type SubmitAssessmentDto,
  type UpdateCycleStatusDto,
  type UpsertCalibrationDto,
  type UpsertQuestionnaireDto,
} from './dto/performance.schemas';
import type { RequestUser } from '@common/types/jwt-payload';

@ApiTags('performance')
@ApiBearerAuth('access-token')
@UseGuards(ClientScopeGuard, RolesGuard)
@ClientScope()
@Controller('performance')
export class PerformanceController {
  constructor(private readonly perf: PerformanceService) {}

  // Cycles
  @Get('cycles')
  @Roles('super_admin', 'admin', 'hr', 'employee')
  listCycles(@ActiveClientId() clientId: string) {
    return this.perf.listCycles(clientId);
  }
  @Post('cycles')
  @Roles('super_admin', 'admin', 'hr')
  createCycle(
    @ActiveClientId() clientId: string,
    @Body(new ZodValidationPipe(createCycleSchema)) dto: CreateCycleDto,
  ) {
    return this.perf.createCycle(clientId, dto);
  }
  @Patch('cycles/:id/status')
  @Roles('super_admin', 'admin', 'hr')
  setCycleStatus(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateCycleStatusSchema)) dto: UpdateCycleStatusDto,
  ) {
    return this.perf.updateCycleStatus(clientId, id, dto);
  }

  // Questionnaires
  @Get('questionnaires')
  @Roles('super_admin', 'admin', 'hr', 'employee')
  listQuestionnaires(
    @ActiveClientId() clientId: string,
    @Query('cycleId', new ParseUUIDPipe()) cycleId: string,
  ) {
    return this.perf.listQuestionnaires(clientId, cycleId);
  }
  @Post('questionnaires')
  @Roles('super_admin', 'admin', 'hr')
  upsertQuestionnaire(
    @ActiveClientId() clientId: string,
    @Body(new ZodValidationPipe(upsertQuestionnaireSchema)) dto: UpsertQuestionnaireDto,
  ) {
    return this.perf.upsertQuestionnaire(clientId, dto);
  }

  // Assessments
  @Get('assessments')
  @Roles('super_admin', 'admin', 'hr', 'employee')
  listAssessments(
    @ActiveClientId() clientId: string,
    @Query('cycleId') cycleId?: string,
    @Query('reviewerId') reviewerId?: string,
  ) {
    return this.perf.listAssessments(clientId, cycleId, reviewerId);
  }
  @Post('assessments')
  @Roles('super_admin', 'admin', 'hr')
  createAssessment(
    @ActiveClientId() clientId: string,
    @Body(new ZodValidationPipe(createAssessmentSchema)) dto: CreateAssessmentDto,
  ) {
    return this.perf.createAssessment(clientId, dto);
  }
  @Post('assessments/:id/submit')
  @Roles('super_admin', 'admin', 'hr', 'employee')
  submitAssessment(
    @ActiveClientId() clientId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(submitAssessmentSchema)) dto: SubmitAssessmentDto,
  ) {
    return this.perf.submitAssessment(clientId, id, dto);
  }

  // Calibrations
  @Get('calibrations')
  @Roles('super_admin', 'admin', 'hr')
  listCalibrations(
    @ActiveClientId() clientId: string,
    @Query('cycleId', new ParseUUIDPipe()) cycleId: string,
  ) {
    return this.perf.listCalibrations(clientId, cycleId);
  }
  @Post('calibrations')
  @Roles('super_admin', 'admin')
  upsertCalibration(
    @ActiveClientId() clientId: string,
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(upsertCalibrationSchema)) dto: UpsertCalibrationDto,
  ) {
    return this.perf.upsertCalibration(clientId, user.id, dto);
  }
}
