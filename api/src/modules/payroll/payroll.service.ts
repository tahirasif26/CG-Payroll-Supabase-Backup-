import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  EmployeeStatus,
  PayrollCalcType,
  PayrollComponentType,
  PayrollRunStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { ApprovalsService } from '@modules/approvals/approvals.service';
import { buildSkipTake } from '@common/dto/pagination.dto';
import {
  calculateLine,
  type CalcComponent,
  type CalcInput,
  type CalcTaxSlab,
} from './calculator';
import type {
  CreatePayrollRunDto,
  CreatePayrollSetupDto,
  ListPayrollRunsQuery,
  OneOffAdjustmentDto,
  UpdatePayrollSetupDto,
} from './dto/payroll.schemas';

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly approvals: ApprovalsService,
  ) {}

  // ─── Setups ───────────────────────────────────────────────────────────

  listSetups(clientId: string) {
    // Include components + taxRules so the FE list (which feeds both the edit
    // and view wizards) has everything to re-hydrate the form without a
    // second round-trip per row.
    return this.prisma.payrollSetup.findMany({
      where: { clientId },
      orderBy: { name: 'asc' },
      include: {
        components: { orderBy: { orderIndex: 'asc' } },
        taxRules: { orderBy: { orderIndex: 'asc' } },
      },
    });
  }

  findSetup(clientId: string, id: string) {
    return this.prisma.payrollSetup
      .findFirst({
        where: { id, clientId },
        include: {
          components: { orderBy: { orderIndex: 'asc' } },
          taxRules: { orderBy: { orderIndex: 'asc' } },
        },
      })
      .then((s) => {
        if (!s) throw notFound('Setup');
        return s;
      });
  }

  async createSetup(clientId: string, userId: string, dto: CreatePayrollSetupDto) {
    return this.prisma.$transaction(async (tx) => {
      const setup = await tx.payrollSetup.create({
        data: {
          clientId,
          createdByUserId: userId,
          name: dto.name,
          description: dto.description ?? null,
          country: dto.country,
          currency: dto.currency,
          payFrequency: dto.payFrequency,
          yearEndDate: dto.yearEndDate ? new Date(dto.yearEndDate) : null,
          options: dto.options as Prisma.InputJsonValue,
        },
      });
      if (dto.components.length > 0) {
        await tx.payrollSetupComponent.createMany({
          data: dto.components.map((c) => ({
            payrollSetupId: setup.id,
            clientId,
            name: c.name,
            type: c.type as PayrollComponentType,
            calculationType: c.calculationType as PayrollCalcType,
            value: c.value,
            formula: c.formula ?? null,
            orderIndex: c.orderIndex,
            isActive: c.isActive,
          })),
        });
      }
      if (dto.taxRules.length > 0) {
        await tx.payrollSetupTaxRule.createMany({
          data: dto.taxRules.map((t) => ({
            payrollSetupId: setup.id,
            clientId,
            slabName: t.slabName,
            incomeFromMinor: t.incomeFromMinor,
            incomeToMinor: t.incomeToMinor ?? null,
            rateBps: t.rateBps,
            orderIndex: t.orderIndex,
          })),
        });
      }
      return setup;
    });
  }

  async updateSetup(clientId: string, id: string, dto: UpdatePayrollSetupDto) {
    await this.findSetup(clientId, id);
    return this.prisma.$transaction(async (tx) => {
      const setup = await tx.payrollSetup.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.country !== undefined ? { country: dto.country } : {}),
          ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
          ...(dto.payFrequency !== undefined ? { payFrequency: dto.payFrequency } : {}),
          ...(dto.yearEndDate !== undefined
            ? { yearEndDate: dto.yearEndDate ? new Date(dto.yearEndDate) : null }
            : {}),
          ...(dto.options !== undefined ? { options: dto.options as Prisma.InputJsonValue } : {}),
        },
      });
      if (dto.components) {
        await tx.payrollSetupComponent.deleteMany({ where: { payrollSetupId: id } });
        if (dto.components.length > 0) {
          await tx.payrollSetupComponent.createMany({
            data: dto.components.map((c) => ({
              payrollSetupId: id,
              clientId,
              name: c.name,
              type: c.type as PayrollComponentType,
              calculationType: c.calculationType as PayrollCalcType,
              value: c.value,
              formula: c.formula ?? null,
              orderIndex: c.orderIndex,
              isActive: c.isActive,
            })),
          });
        }
      }
      if (dto.taxRules) {
        await tx.payrollSetupTaxRule.deleteMany({ where: { payrollSetupId: id } });
        if (dto.taxRules.length > 0) {
          await tx.payrollSetupTaxRule.createMany({
            data: dto.taxRules.map((t) => ({
              payrollSetupId: id,
              clientId,
              slabName: t.slabName,
              incomeFromMinor: t.incomeFromMinor,
              incomeToMinor: t.incomeToMinor ?? null,
              rateBps: t.rateBps,
              orderIndex: t.orderIndex,
            })),
          });
        }
      }
      return setup;
    });
  }

  /**
   * Hard delete. Refuses if any PayrollRun references this setup (those rows
   * carry historical payroll data that mustn't dangle). Cascade-deletes
   * components + tax rules via FK onDelete: Cascade.
   */
  async deleteSetup(clientId: string, id: string) {
    await this.findSetup(clientId, id);
    const runCount = await this.prisma.payrollRun.count({
      where: { clientId, payrollSetupId: id },
    });
    if (runCount > 0) {
      throw new BadRequestException({
        code: 'SETUP_HAS_RUNS',
        message:
          'This setup has payroll runs attached. Archive it instead so the run history stays intact.',
      });
    }
    await this.prisma.payrollSetup.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ─── Runs ─────────────────────────────────────────────────────────────

  async listRuns(clientId: string, query: ListPayrollRunsQuery) {
    const where: Prisma.PayrollRunWhereInput = {
      clientId,
      ...(query.setupId ? { payrollSetupId: query.setupId } : {}),
      ...(query.year ? { year: query.year } : {}),
      ...(query.status ? { status: query.status as PayrollRunStatus } : {}),
    };
    const { skip, take } = buildSkipTake(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.payrollRun.findMany({
        where,
        orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }],
        include: { setup: { select: { id: true, name: true, currency: true } } },
        skip,
        take,
      }),
      this.prisma.payrollRun.count({ where }),
    ]);
    return paginate(items, total, query);
  }

  async findRun(clientId: string, id: string) {
    const run = await this.prisma.payrollRun.findFirst({
      where: { id, clientId },
      include: {
        setup: { include: { components: true, taxRules: true } },
        lines: {
          include: {
            employee: { select: { id: true, empId: true, firstName: true, lastName: true } },
          },
          orderBy: { employee: { firstName: 'asc' } },
        },
        oneOffAdjustments: true,
      },
    });
    if (!run) throw notFound('Run');
    return run;
  }

  async createRun(clientId: string, userId: string, dto: CreatePayrollRunDto) {
    await this.findSetup(clientId, dto.payrollSetupId);
    const existing = await this.prisma.payrollRun.findFirst({
      where: { clientId, payrollSetupId: dto.payrollSetupId, month: dto.month, year: dto.year },
    });
    if (existing) {
      throw new BadRequestException({
        code: 'RUN_ALREADY_EXISTS',
        message: `A payroll run for ${dto.year}-${String(dto.month).padStart(2, '0')} already exists for this setup`,
      });
    }
    return this.prisma.payrollRun.create({
      data: {
        clientId,
        payrollSetupId: dto.payrollSetupId,
        month: dto.month,
        year: dto.year,
        createdByUserId: userId,
      },
    });
  }

  /**
   * Calculate (or re-calculate) all lines for a run. Idempotent on draft and
   * calculated runs; blocked once locked. Reads employee compensation, sums to
   * a "basic + allowances", applies the setup's components + tax slabs.
   */
  async calculateRun(clientId: string, runId: string) {
    const run = await this.findRun(clientId, runId);
    if (run.locked) {
      throw new BadRequestException({
        code: 'RUN_LOCKED',
        message: 'Locked runs cannot be recalculated',
      });
    }
    if (
      run.status !== PayrollRunStatus.draft &&
      run.status !== PayrollRunStatus.calculated
    ) {
      throw new BadRequestException({
        code: 'RUN_NOT_RECALCULABLE',
        message: 'Run is past the calculation stage',
      });
    }

    const employees = await this.prisma.employee.findMany({
      where: { clientId, status: EmployeeStatus.active },
      include: {
        compensation: { where: { effectiveTo: null } },
      },
    });

    const components: CalcComponent[] = run.setup.components.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type as 'earning' | 'deduction',
      calculationType: c.calculationType as 'fixed' | 'percentage' | 'formula',
      value: c.value,
      formula: c.formula,
      orderIndex: c.orderIndex,
    }));
    const taxSlabs: CalcTaxSlab[] = run.setup.taxRules.map((t) => ({
      incomeFromMinor: t.incomeFromMinor,
      incomeToMinor: t.incomeToMinor,
      rateBps: t.rateBps,
      orderIndex: t.orderIndex,
    }));

    const oneOffs = await this.prisma.payrollOneOffAdjustment.findMany({
      where: { payrollRunId: runId },
    });
    const oneOffByEmp = new Map<string, { benefits: bigint; deductions: bigint }>();
    for (const a of oneOffs) {
      const slot = oneOffByEmp.get(a.employeeId) ?? { benefits: BigInt(0), deductions: BigInt(0) };
      if (a.type === PayrollComponentType.earning) slot.benefits += a.amountMinor;
      else slot.deductions += a.amountMinor;
      oneOffByEmp.set(a.employeeId, slot);
    }

    // Active-loan EMIs (auto-deduct).
    const activeLoans = await this.prisma.loan.findMany({
      where: { clientId, status: 'active' },
      select: { employeeId: true, monthlyDeduction: true },
    });
    const emiByEmp = new Map<string, bigint>();
    for (const l of activeLoans) {
      emiByEmp.set(l.employeeId, (emiByEmp.get(l.employeeId) ?? BigInt(0)) + l.monthlyDeduction);
    }

    let totalGross = BigInt(0);
    let totalDed = BigInt(0);
    let totalNet = BigInt(0);
    let employeeCount = 0;

    await this.prisma.$transaction(async (tx) => {
      await tx.payrollLine.deleteMany({ where: { payrollRunId: runId } });

      for (const emp of employees) {
        const basicRow = emp.compensation.find((c) => c.componentType === 'base');
        const basicMinor = basicRow ? basicRow.amount : BigInt(0);
        const allowancesMinor = emp.compensation
          .filter((c) => c.componentType !== 'base')
          .reduce((s, c) => s + c.amount, BigInt(0));

        const oneOff = oneOffByEmp.get(emp.id) ?? { benefits: BigInt(0), deductions: BigInt(0) };
        const loanEmi = emiByEmp.get(emp.id) ?? BigInt(0);

        const input: CalcInput = {
          basicMinor,
          allowancesMinor,
          loanDeductionMinor: loanEmi,
          oneOffBenefitsMinor: oneOff.benefits,
          oneOffDeductionsMinor: oneOff.deductions,
          components,
          taxSlabs,
        };
        const result = calculateLine(input);

        await tx.payrollLine.create({
          data: {
            payrollRunId: runId,
            employeeId: emp.id,
            clientId,
            basicMinor: result.basicMinor,
            allowancesMinor: result.allowancesMinor,
            grossMinor: result.grossMinor,
            taxDeductionMinor: result.taxDeductionMinor,
            loanDeductionMinor: result.loanDeductionMinor,
            statutoryDeductionMinor: result.statutoryDeductionMinor,
            otherDeductionsMinor: result.otherDeductionsMinor,
            totalDeductionsMinor: result.totalDeductionsMinor,
            expenseReimbursementMinor: result.expenseReimbursementMinor,
            advanceGivenMinor: result.advanceGivenMinor,
            oneOffBenefitsMinor: result.oneOffBenefitsMinor,
            oneOffDeductionsMinor: result.oneOffDeductionsMinor,
            separationSettlementMinor: result.separationSettlementMinor,
            netPayMinor: result.netPayMinor,
            payCurrency: run.setup.currency,
            exchangeRate: '1',
            netInReportingCurrencyMinor: result.netPayMinor,
            snapshotData: {
              componentBreakdown: result.componentBreakdown.map((c) => ({
                id: c.id,
                name: c.name,
                type: c.type,
                amountMinor: c.amountMinor.toString(),
              })),
            } as Prisma.InputJsonValue,
          },
        });

        totalGross += result.grossMinor;
        totalDed += result.totalDeductionsMinor;
        totalNet += result.netPayMinor;
        employeeCount += 1;
      }

      await tx.payrollRun.update({
        where: { id: runId },
        data: {
          status: PayrollRunStatus.calculated,
          totalGrossMinor: totalGross,
          totalDeductionsMinor: totalDed,
          totalNetMinor: totalNet,
          employeeCount,
          runDate: new Date(),
        },
      });
    });

    return this.findRun(clientId, runId);
  }

  /**
   * Submit calculated run for approval. Routes through the approvals engine
   * using the snapshotted gross as the value-for-policy-match.
   */
  async submitForApproval(
    clientId: string,
    runId: string,
    requesterEmployeeId: string | null,
  ) {
    const run = await this.findRun(clientId, runId);
    if (run.status !== PayrollRunStatus.calculated) {
      throw new BadRequestException({
        code: 'NOT_CALCULATED',
        message: 'Run must be calculated before submitting for approval',
      });
    }
    if (!requesterEmployeeId) {
      throw new ForbiddenException({
        code: 'NO_EMPLOYEE_CONTEXT',
        message: 'Caller has no employee record in this client',
      });
    }
    await this.approvals.submitForApproval({
      clientId,
      module: 'payroll',
      entityId: runId,
      requesterEmployeeId,
      valueMinor: run.totalGrossMinor,
      valueUnit: run.setup.currency,
      title: `Payroll ${run.year}-${String(run.month).padStart(2, '0')}`,
    });
    return this.prisma.payrollRun.update({
      where: { id: runId },
      data: { status: PayrollRunStatus.pending_approval },
    });
  }

  /**
   * Mark run as approved (called either after approval engine finalises, or
   * via direct admin action for super-admins). Locks the run for tamper safety.
   */
  async finalizeApprove(clientId: string, runId: string, userId: string) {
    const run = await this.findRun(clientId, runId);
    if (run.status !== PayrollRunStatus.pending_approval && run.status !== PayrollRunStatus.calculated) {
      throw new BadRequestException({
        code: 'INVALID_STATE',
        message: 'Run is not in an approvable state',
      });
    }
    return this.prisma.payrollRun.update({
      where: { id: runId },
      data: {
        status: PayrollRunStatus.approved,
        approvedByUserId: userId,
        approvedAt: new Date(),
        locked: true,
        lockedByUserId: userId,
        lockedAt: new Date(),
      },
    });
  }

  async completeRun(clientId: string, runId: string) {
    const run = await this.findRun(clientId, runId);
    if (run.status !== PayrollRunStatus.approved) {
      throw new BadRequestException({
        code: 'NOT_APPROVED',
        message: 'Only approved runs can be marked completed',
      });
    }
    return this.prisma.payrollRun.update({
      where: { id: runId },
      data: { status: PayrollRunStatus.completed, completedAt: new Date() },
    });
  }

  // ─── One-off adjustments ──────────────────────────────────────────────

  async addOneOff(clientId: string, runId: string, userId: string, dto: OneOffAdjustmentDto) {
    const run = await this.findRun(clientId, runId);
    if (run.locked) {
      throw new BadRequestException({ code: 'RUN_LOCKED', message: 'Locked runs cannot be modified' });
    }
    return this.prisma.payrollOneOffAdjustment.create({
      data: {
        payrollRunId: runId,
        clientId,
        employeeId: dto.employeeId,
        name: dto.name,
        amountMinor: dto.amountMinor,
        type: dto.type as PayrollComponentType,
        createdByUserId: userId,
      },
    });
  }

  async removeOneOff(clientId: string, runId: string, oneOffId: string) {
    const run = await this.findRun(clientId, runId);
    if (run.locked) {
      throw new BadRequestException({ code: 'RUN_LOCKED', message: 'Locked runs cannot be modified' });
    }
    return this.prisma.payrollOneOffAdjustment.deleteMany({
      where: { id: oneOffId, payrollRunId: runId, clientId },
    });
  }

  // ─── Payslips ─────────────────────────────────────────────────────────

  async listMyPayslips(clientId: string, employeeId: string) {
    return this.prisma.payslip.findMany({
      where: { clientId, employeeId },
      include: { run: { select: { month: true, year: true, setup: { select: { name: true, currency: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────

function paginate<T>(items: T[], total: number, q: { page: number; pageSize: number }) {
  return {
    data: items,
    meta: {
      pagination: {
        page: q.page,
        pageSize: q.pageSize,
        total,
        totalPages: Math.ceil(total / q.pageSize),
      },
    },
  };
}
function notFound(what: string) {
  return new NotFoundException({
    code: `${what.toUpperCase()}_NOT_FOUND`,
    message: `${what} not found`,
  });
}
