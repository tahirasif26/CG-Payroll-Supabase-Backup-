import { Injectable, NotFoundException } from '@nestjs/common';
import { AssessmentStatus, AssessmentType, PerformanceCycleStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import type {
  CreateAssessmentDto,
  CreateCycleDto,
  SubmitAssessmentDto,
  UpdateCycleStatusDto,
  UpsertCalibrationDto,
  UpsertQuestionnaireDto,
} from './dto/performance.schemas';

@Injectable()
export class PerformanceService {
  constructor(private readonly prisma: PrismaService) {}

  // Cycles
  listCycles(clientId: string) {
    return this.prisma.performanceCycle.findMany({
      where: { clientId },
      orderBy: { startDate: 'desc' },
    });
  }
  createCycle(clientId: string, dto: CreateCycleDto) {
    return this.prisma.performanceCycle.create({
      data: { clientId, name: dto.name, startDate: new Date(dto.startDate), endDate: new Date(dto.endDate) },
    });
  }
  updateCycleStatus(clientId: string, id: string, dto: UpdateCycleStatusDto) {
    return this.prisma.performanceCycle.updateMany({
      where: { id, clientId },
      data: { status: dto.status as PerformanceCycleStatus },
    });
  }

  // Questionnaires
  listQuestionnaires(clientId: string, cycleId: string) {
    return this.prisma.performanceQuestionnaire.findMany({ where: { clientId, cycleId } });
  }
  upsertQuestionnaire(clientId: string, dto: UpsertQuestionnaireDto) {
    return this.prisma.performanceQuestionnaire.create({
      data: {
        clientId,
        cycleId: dto.cycleId,
        name: dto.name,
        questions: dto.questions as unknown as Prisma.InputJsonValue,
        audience: dto.audience ?? null,
      },
    });
  }

  // Assessments
  listAssessments(clientId: string, cycleId?: string, reviewerId?: string) {
    return this.prisma.performanceAssessment.findMany({
      where: { clientId, ...(cycleId ? { cycleId } : {}), ...(reviewerId ? { reviewerId } : {}) },
      include: { employee: { select: { id: true, firstName: true, lastName: true, empId: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
  createAssessment(clientId: string, dto: CreateAssessmentDto) {
    return this.prisma.performanceAssessment.create({
      data: {
        clientId,
        cycleId: dto.cycleId,
        employeeId: dto.employeeId,
        reviewerId: dto.reviewerId,
        type: dto.type as AssessmentType,
      },
    });
  }
  async submitAssessment(clientId: string, id: string, dto: SubmitAssessmentDto) {
    const a = await this.prisma.performanceAssessment.findFirst({ where: { id, clientId } });
    if (!a) throw new NotFoundException({ code: 'ASSESSMENT_NOT_FOUND', message: 'Assessment not found' });
    return this.prisma.performanceAssessment.update({
      where: { id },
      data: {
        responses: dto.responses as unknown as Prisma.InputJsonValue,
        rating: dto.rating?.toString(),
        status: AssessmentStatus.submitted,
        submittedAt: new Date(),
      },
    });
  }

  // Calibration
  listCalibrations(clientId: string, cycleId: string) {
    return this.prisma.performanceCalibration.findMany({ where: { clientId, cycleId } });
  }
  async upsertCalibration(clientId: string, userId: string, dto: UpsertCalibrationDto) {
    return this.prisma.performanceCalibration.upsert({
      where: { cycleId_employeeId: { cycleId: dto.cycleId, employeeId: dto.employeeId } },
      update: {
        calibratedRating: dto.calibratedRating.toString(),
        notes: dto.notes ?? null,
        calibratedByUserId: userId,
      },
      create: {
        clientId,
        cycleId: dto.cycleId,
        employeeId: dto.employeeId,
        calibratedRating: dto.calibratedRating.toString(),
        notes: dto.notes ?? null,
        calibratedByUserId: userId,
      },
    });
  }
}
