import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalHistoryAction,
  ApprovalModule,
  ApprovalType,
  AssignmentStatus,
  RequestApprovalStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { buildSkipTake } from '@common/dto/pagination.dto';
import type {
  CreateDelegationDto,
  CreateGroupDto,
  CreatePolicyDto,
  DecideRequestDto,
  ListRequestApprovalsQuery,
  UpdateGroupDto,
  UpdatePolicyDto,
} from './dto/approval.schemas';

/**
 * Approval engine. Ports the Supabase RLS helpers:
 *   - resolve_approval_group(client, category, value)
 *   - get_active_approvers(group_id)
 *   - can_act_on_request(user, request_approval_id)
 *
 * Domain modules (leave/expenses/etc.) call `submitForApproval()` when a
 * request is submitted. The engine resolves the matching policy, creates a
 * `RequestApproval` + assigns level-1 approvers, and notifies them. Each
 * approver decision rolls forward to the next level (sequential) or waits for
 * the remaining approvers in the same level (parallel/all_must/majority).
 */
@Injectable()
export class ApprovalsService {
  private readonly logger = new Logger(ApprovalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── Groups ───────────────────────────────────────────────────────────

  list(clientId: string) {
    return this.prisma.approvalGroup.findMany({
      where: { clientId },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      include: { members: { select: { employeeId: true } } },
    });
  }

  async createGroup(clientId: string, dto: CreateGroupDto) {
    return this.prisma.$transaction(async (tx) => {
      const group = await tx.approvalGroup.create({
        data: {
          clientId,
          name: dto.name,
          description: dto.description ?? null,
          approvalType: dto.approvalType as ApprovalType,
          maxLimitMinor: dto.maxLimitMinor ?? null,
          escalateAfterDays: dto.escalateAfterDays ?? null,
          escalateToGroupId: dto.escalateToGroupId ?? null,
        },
      });
      if (dto.memberEmployeeIds.length > 0) {
        await tx.approvalGroupMember.createMany({
          data: dto.memberEmployeeIds.map((employeeId) => ({
            groupId: group.id,
            employeeId,
            clientId,
          })),
        });
      }
      return group;
    });
  }

  async updateGroup(clientId: string, id: string, dto: UpdateGroupDto) {
    await this.ensureGroupInClient(clientId, id);
    return this.prisma.$transaction(async (tx) => {
      const group = await tx.approvalGroup.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.approvalType !== undefined
            ? { approvalType: dto.approvalType as ApprovalType }
            : {}),
          ...(dto.maxLimitMinor !== undefined ? { maxLimitMinor: dto.maxLimitMinor } : {}),
          ...(dto.escalateAfterDays !== undefined
            ? { escalateAfterDays: dto.escalateAfterDays }
            : {}),
          ...(dto.escalateToGroupId !== undefined
            ? { escalateToGroupId: dto.escalateToGroupId }
            : {}),
        },
      });
      if (dto.memberEmployeeIds) {
        await tx.approvalGroupMember.deleteMany({ where: { groupId: id } });
        if (dto.memberEmployeeIds.length > 0) {
          await tx.approvalGroupMember.createMany({
            data: dto.memberEmployeeIds.map((employeeId) => ({
              groupId: id,
              employeeId,
              clientId,
            })),
          });
        }
      }
      return group;
    });
  }

  async deleteGroup(clientId: string, id: string) {
    await this.ensureGroupInClient(clientId, id);
    return this.prisma.approvalGroup.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ─── Policies ─────────────────────────────────────────────────────────

  listPolicies(clientId: string, module?: ApprovalModule) {
    return this.prisma.approvalPolicy.findMany({
      where: { clientId, ...(module ? { module } : {}) },
      include: { levels: { orderBy: { levelOrder: 'asc' } }, group: true },
      orderBy: [{ module: 'asc' }, { sortOrder: 'asc' }, { minValueMinor: 'asc' }],
    });
  }

  async createPolicy(clientId: string, dto: CreatePolicyDto) {
    return this.prisma.$transaction(async (tx) => {
      const policy = await tx.approvalPolicy.create({
        data: {
          clientId,
          module: dto.module as ApprovalModule,
          category: dto.category ?? null,
          minValueMinor: dto.minValueMinor,
          maxValueMinor: dto.maxValueMinor ?? null,
          groupId: dto.groupId ?? null,
          sortOrder: dto.sortOrder,
          isActive: dto.isActive,
        },
      });
      if (dto.levels.length > 0) {
        await tx.approvalPolicyLevel.createMany({
          data: dto.levels.map((l) => ({ ...l, policyId: policy.id })),
        });
      }
      return policy;
    });
  }

  async updatePolicy(clientId: string, id: string, dto: UpdatePolicyDto) {
    const existing = await this.prisma.approvalPolicy.findFirst({
      where: { id, clientId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException({ code: 'POLICY_NOT_FOUND', message: 'Policy not found' });

    return this.prisma.$transaction(async (tx) => {
      const p = await tx.approvalPolicy.update({
        where: { id },
        data: {
          ...(dto.module !== undefined ? { module: dto.module as ApprovalModule } : {}),
          ...(dto.category !== undefined ? { category: dto.category } : {}),
          ...(dto.minValueMinor !== undefined ? { minValueMinor: dto.minValueMinor } : {}),
          ...(dto.maxValueMinor !== undefined ? { maxValueMinor: dto.maxValueMinor } : {}),
          ...(dto.groupId !== undefined ? { groupId: dto.groupId } : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });
      if (dto.levels) {
        await tx.approvalPolicyLevel.deleteMany({ where: { policyId: id } });
        if (dto.levels.length > 0) {
          await tx.approvalPolicyLevel.createMany({
            data: dto.levels.map((l) => ({ ...l, policyId: id })),
          });
        }
      }
      return p;
    });
  }

  // ─── Delegations ──────────────────────────────────────────────────────

  listDelegations(clientId: string) {
    return this.prisma.approvalDelegation.findMany({
      where: { clientId },
      orderBy: { startDate: 'desc' },
    });
  }

  createDelegation(clientId: string, createdByUserId: string, dto: CreateDelegationDto) {
    return this.prisma.approvalDelegation.create({
      data: {
        clientId,
        createdByUserId,
        fromEmployeeId: dto.fromEmployeeId,
        toEmployeeId: dto.toEmployeeId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        fallbackEmployeeId: dto.fallbackEmployeeId ?? null,
        reason: dto.reason ?? null,
      },
    });
  }

  async revokeDelegation(clientId: string, id: string) {
    const d = await this.prisma.approvalDelegation.findFirst({
      where: { id, clientId },
      select: { id: true },
    });
    if (!d) throw new NotFoundException({ code: 'DELEGATION_NOT_FOUND', message: 'Delegation not found' });
    return this.prisma.approvalDelegation.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /** Bulk expire delegations whose endDate is in the past. Called from cron in Phase 8. */
  async expireDelegations() {
    const result = await this.prisma.approvalDelegation.updateMany({
      where: { isActive: true, endDate: { lt: new Date() } },
      data: { isActive: false },
    });
    return { expired: result.count };
  }

  // ─── Engine: resolve, submit, decide, can-act ─────────────────────────

  /**
   * Mirror of Supabase `resolve_approval_group`. Returns the most specific
   * policy that matches (module + value range + optional category match).
   */
  async resolvePolicy(input: {
    clientId: string;
    module: ApprovalModule;
    category?: string | null;
    valueMinor: bigint;
  }) {
    const policies = await this.prisma.approvalPolicy.findMany({
      where: {
        clientId: input.clientId,
        module: input.module,
        isActive: true,
        minValueMinor: { lte: input.valueMinor },
        OR: [
          { maxValueMinor: null },
          { maxValueMinor: { gte: input.valueMinor } },
        ],
      },
      include: { levels: { orderBy: { levelOrder: 'asc' } } },
      orderBy: [{ sortOrder: 'asc' }, { minValueMinor: 'desc' }],
    });
    // Prefer category match if present.
    if (input.category) {
      const matched = policies.find((p) => p.category === input.category);
      if (matched) return matched;
    }
    return policies.find((p) => p.category === null) ?? policies[0] ?? null;
  }

  /**
   * Mirror of `get_active_approvers`. Returns the employees who should currently
   * receive assignment for the group, after delegation routing on the given date.
   */
  async getActiveApprovers(input: {
    clientId: string;
    groupId: string;
    onDate?: Date;
  }): Promise<Array<{ employeeId: string; viaDelegation: boolean }>> {
    const onDate = input.onDate ?? new Date();
    const members = await this.prisma.approvalGroupMember.findMany({
      where: { groupId: input.groupId, clientId: input.clientId },
      select: { employeeId: true },
    });
    if (members.length === 0) return [];

    const delegations = await this.prisma.approvalDelegation.findMany({
      where: {
        clientId: input.clientId,
        isActive: true,
        startDate: { lte: onDate },
        endDate: { gte: onDate },
        fromEmployeeId: { in: members.map((m) => m.employeeId) },
      },
      select: { fromEmployeeId: true, toEmployeeId: true },
    });
    const delegateOf = new Map(delegations.map((d) => [d.fromEmployeeId, d.toEmployeeId]));

    return members.map((m) => {
      const to = delegateOf.get(m.employeeId);
      return to
        ? { employeeId: to, viaDelegation: true }
        : { employeeId: m.employeeId, viaDelegation: false };
    });
  }

  /**
   * Entry point called by domain modules when a request is submitted. Creates
   * a RequestApproval + level-1 assignments + notifies approvers.
   * Idempotent on (module, entityId) — re-submitting an existing pending row is a no-op.
   */
  async submitForApproval(input: {
    clientId: string;
    module: ApprovalModule;
    entityId: string;
    requesterEmployeeId: string;
    valueMinor: bigint;
    valueUnit?: string;
    category?: string | null;
    title?: string;
  }) {
    const existing = await this.prisma.requestApproval.findUnique({
      where: { module_entityId: { module: input.module, entityId: input.entityId } },
    });
    if (existing && existing.status === RequestApprovalStatus.pending) return existing;

    const policy = await this.resolvePolicy({
      clientId: input.clientId,
      module: input.module,
      category: input.category,
      valueMinor: input.valueMinor,
    });
    if (!policy) {
      throw new BadRequestException({
        code: 'NO_MATCHING_POLICY',
        message: `No approval policy matched module=${input.module} value=${input.valueMinor}`,
      });
    }

    const firstLevel = policy.levels[0] ?? null;
    const groupId = firstLevel?.groupId ?? policy.groupId;
    if (!groupId) {
      throw new BadRequestException({
        code: 'POLICY_MISCONFIGURED',
        message: 'Matched policy has neither levels nor a fallback group',
      });
    }

    const approvers = await this.getActiveApprovers({ clientId: input.clientId, groupId });
    if (approvers.length === 0) {
      throw new BadRequestException({
        code: 'EMPTY_APPROVAL_GROUP',
        message: 'No active approvers in the matched group',
      });
    }

    const request = await this.prisma.$transaction(async (tx) => {
      const created = existing
        ? await tx.requestApproval.update({
            where: { id: existing.id },
            data: { status: RequestApprovalStatus.pending, currentLevel: 1, currentGroupId: groupId },
          })
        : await tx.requestApproval.create({
            data: {
              clientId: input.clientId,
              module: input.module,
              entityId: input.entityId,
              policyId: policy.id,
              requesterEmployeeId: input.requesterEmployeeId,
              valueMinor: input.valueMinor,
              valueUnit: input.valueUnit ?? 'AED',
              currentLevel: 1,
              currentGroupId: groupId,
            },
          });

      await tx.requestAssignment.createMany({
        data: approvers.map((a) => ({
          requestApprovalId: created.id,
          levelOrder: 1,
          groupId,
          employeeId: a.employeeId,
          viaDelegation: a.viaDelegation,
        })),
      });

      return created;
    });

    // Fire notifications — best-effort.
    await this.notifyAssignees(request.id, input.clientId, input.title ?? `${input.module} request`);

    return request;
  }

  /**
   * Approver acts on a request. Validates that they have a pending assignment
   * at the current level, records history, and rolls forward.
   */
  async decide(
    clientId: string,
    requestApprovalId: string,
    actor: { userId: string; employeeId: string | null },
    dto: DecideRequestDto,
  ) {
    const request = await this.prisma.requestApproval.findFirst({
      where: { id: requestApprovalId, clientId },
      include: {
        currentGroup: true,
        assignments: {
          where: { levelOrder: { gte: 1 } },
        },
        policy: { include: { levels: { orderBy: { levelOrder: 'asc' } } } },
      },
    });
    if (!request) throw new NotFoundException({ code: 'REQUEST_NOT_FOUND', message: 'Request not found' });
    if (request.status !== RequestApprovalStatus.pending) {
      throw new BadRequestException({
        code: 'REQUEST_NOT_PENDING',
        message: 'Request is not pending',
      });
    }
    if (!actor.employeeId) {
      throw new ForbiddenException({
        code: 'NO_EMPLOYEE_CONTEXT',
        message: 'Caller has no employee record in this client and cannot act',
      });
    }

    const currentLevel = request.currentLevel;
    const myAssignment = request.assignments.find(
      (a) =>
        a.levelOrder === currentLevel &&
        a.employeeId === actor.employeeId &&
        a.status === AssignmentStatus.pending,
    );
    if (!myAssignment) {
      throw new ForbiddenException({
        code: 'NOT_AN_ASSIGNED_APPROVER',
        message: 'You are not currently assigned to this request',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.requestAssignment.update({
        where: { id: myAssignment.id },
        data: { status: AssignmentStatus.acted, actedAt: new Date() },
      });
      await tx.requestApprovalHistory.create({
        data: {
          requestApprovalId,
          levelOrder: currentLevel,
          action:
            dto.decision === 'approve'
              ? ApprovalHistoryAction.approve
              : ApprovalHistoryAction.reject,
          actorUserId: actor.userId,
          actorEmployeeId: actor.employeeId,
          groupId: request.currentGroupId,
          comment: dto.comment,
        },
      });

      // Reject path → finalize immediately.
      if (dto.decision === 'reject') {
        return tx.requestApproval.update({
          where: { id: requestApprovalId },
          data: { status: RequestApprovalStatus.rejected, finalizedAt: new Date() },
        });
      }

      // Approve path — determine whether the level is satisfied.
      const levelAssignments = await tx.requestAssignment.findMany({
        where: { requestApprovalId, levelOrder: currentLevel },
      });
      const acted = levelAssignments.filter((a) => a.status === AssignmentStatus.acted).length;
      const total = levelAssignments.length;
      const approvalType = request.currentGroup?.approvalType ?? ApprovalType.any_one;

      const levelSatisfied =
        approvalType === ApprovalType.any_one
          ? acted >= 1
          : approvalType === ApprovalType.all_must
            ? acted >= total
            : acted * 2 > total; // majority

      if (!levelSatisfied) {
        // Wait for remaining approvers at this level.
        return tx.requestApproval.findUniqueOrThrow({ where: { id: requestApprovalId } });
      }

      // Mark unacted assignments at this level as skipped.
      await tx.requestAssignment.updateMany({
        where: {
          requestApprovalId,
          levelOrder: currentLevel,
          status: AssignmentStatus.pending,
        },
        data: { status: AssignmentStatus.skipped },
      });

      // Advance to next level if any; else finalize approve.
      const nextLevel = request.policy?.levels.find((l) => l.levelOrder === currentLevel + 1);
      if (!nextLevel) {
        return tx.requestApproval.update({
          where: { id: requestApprovalId },
          data: { status: RequestApprovalStatus.approved, finalizedAt: new Date() },
        });
      }

      const nextApprovers = await this.getActiveApprovers({
        clientId,
        groupId: nextLevel.groupId,
      });
      await tx.requestAssignment.createMany({
        data: nextApprovers.map((a) => ({
          requestApprovalId,
          levelOrder: nextLevel.levelOrder,
          groupId: nextLevel.groupId,
          employeeId: a.employeeId,
          viaDelegation: a.viaDelegation,
        })),
      });
      await tx.requestApprovalHistory.create({
        data: {
          requestApprovalId,
          levelOrder: currentLevel + 1,
          action: ApprovalHistoryAction.system_advance,
          comment: `Advanced to level ${currentLevel + 1}`,
          groupId: nextLevel.groupId,
        },
      });
      return tx.requestApproval.update({
        where: { id: requestApprovalId },
        data: { currentLevel: nextLevel.levelOrder, currentGroupId: nextLevel.groupId },
      });
    });
  }

  /** Mirror of `can_act_on_request`. */
  async canAct(userId: string, requestApprovalId: string): Promise<boolean> {
    const emp = await this.prisma.employee.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (!emp) return false;
    const req = await this.prisma.requestApproval.findUnique({
      where: { id: requestApprovalId },
      select: { currentLevel: true, status: true },
    });
    if (!req || req.status !== RequestApprovalStatus.pending) return false;
    const pending = await this.prisma.requestAssignment.findFirst({
      where: {
        requestApprovalId,
        levelOrder: req.currentLevel,
        employeeId: emp.id,
        status: AssignmentStatus.pending,
      },
      select: { id: true },
    });
    return !!pending;
  }

  // ─── Listing ──────────────────────────────────────────────────────────

  async listRequests(
    clientId: string,
    callerEmployeeId: string | null,
    query: ListRequestApprovalsQuery,
  ) {
    const scope = query.scope ?? 'pending';
    const baseWhere: Prisma.RequestApprovalWhereInput = {
      clientId,
      ...(query.module ? { module: query.module as ApprovalModule } : {}),
      ...(query.status ? { status: query.status as RequestApprovalStatus } : {}),
    };
    let where: Prisma.RequestApprovalWhereInput = baseWhere;
    if (scope === 'mine' && callerEmployeeId) {
      where = { ...baseWhere, requesterEmployeeId: callerEmployeeId };
    } else if (scope === 'pending' && callerEmployeeId) {
      where = {
        ...baseWhere,
        status: RequestApprovalStatus.pending,
        assignments: {
          some: {
            employeeId: callerEmployeeId,
            status: AssignmentStatus.pending,
          },
        },
      };
    }

    const { skip, take } = buildSkipTake(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.requestApproval.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          requester: { select: { firstName: true, lastName: true, empId: true } },
          currentGroup: { select: { id: true, name: true } },
        },
        skip,
        take,
      }),
      this.prisma.requestApproval.count({ where }),
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

  async findRequest(clientId: string, id: string) {
    const r = await this.prisma.requestApproval.findFirst({
      where: { id, clientId },
      include: {
        requester: true,
        currentGroup: true,
        policy: { include: { levels: true } },
        history: { orderBy: { createdAt: 'asc' } },
        assignments: { orderBy: [{ levelOrder: 'asc' }, { createdAt: 'asc' }] },
      },
    });
    if (!r) throw new NotFoundException({ code: 'REQUEST_NOT_FOUND', message: 'Request not found' });
    return r;
  }

  // ─── Internal ─────────────────────────────────────────────────────────

  private async ensureGroupInClient(clientId: string, id: string) {
    const g = await this.prisma.approvalGroup.findFirst({
      where: { id, clientId },
      select: { id: true },
    });
    if (!g) throw new NotFoundException({ code: 'GROUP_NOT_FOUND', message: 'Approval group not found' });
  }

  private async notifyAssignees(requestApprovalId: string, clientId: string, title: string) {
    try {
      const assignments = await this.prisma.requestAssignment.findMany({
        where: { requestApprovalId, status: AssignmentStatus.pending },
        include: { employee: { select: { userId: true } } },
      });
      const userIds = Array.from(
        new Set(assignments.map((a) => a.employee.userId).filter((u): u is string => !!u)),
      );
      for (const userId of userIds) {
        await this.notifications.create({
          clientId,
          userId,
          title: `Approval pending: ${title}`,
          body: 'A new request is awaiting your action.',
          category: 'approval_pending',
          severity: 'info',
          entityType: 'request_approval',
          entityId: requestApprovalId,
        });
      }
    } catch (err) {
      this.logger.warn(
        `Failed to send approval notifications: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
