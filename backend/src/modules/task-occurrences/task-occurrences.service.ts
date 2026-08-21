import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  TaskOccurrenceResult,
  TaskOccurrenceStatus,
} from '../../generated/prisma/client';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CompleteOccurrenceDto } from './dto/complete-occurrence.dto';
import { ListOccurrencesQueryDto } from './dto/list-occurrences-query.dto';
import { RescheduleOccurrenceDto } from './dto/reschedule-occurrence.dto';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { PositionHierarchyService } from '../positions/position-hierarchy.service';

const occurrenceRelations = {
  task: {
    include: {
      function: {
        include: {
          responsiblePosition: true,
          responsibleUser: {
            select: { id: true, name: true, email: true, active: true },
          },
        },
      },
      periodicity: true,
      responsiblePosition: true,
      responsibleUser: {
        select: { id: true, name: true, email: true, active: true },
      },
    },
  },
  responsibleUser: {
    select: { id: true, name: true, email: true, active: true },
  },
  executedByUser: {
    select: { id: true, name: true, email: true, active: true },
  },
} satisfies Prisma.TaskOccurrenceInclude;

type OccurrenceWithRelations = Prisma.TaskOccurrenceGetPayload<{
  include: typeof occurrenceRelations;
}>;

@Injectable()
export class TaskOccurrencesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchy: PositionHierarchyService,
  ) {}

  async calendar(query: CalendarQueryDto, user: JwtPayload) {
    const from = this.toDate(query.from);
    const to = this.toDate(query.to);

    if (to < from) {
      throw new BadRequestException(
        'A data final não pode ser anterior à data inicial.',
      );
    }

    const occurrences = await this.prisma.taskOccurrence.findMany({
      where: await this.buildWhere(query, user, from, to),
      orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
      include: occurrenceRelations,
    });

    const items = await Promise.all(
      occurrences.map((occurrence) => this.present(occurrence, user)),
    );
    const grouped = new Map<string, typeof items>();

    for (const occurrence of items) {
      const date = occurrence.scheduledDate.toISOString().slice(0, 10);
      grouped.set(date, [...(grouped.get(date) ?? []), occurrence]);
    }

    return {
      from: query.from,
      to: query.to,
      total: items.length,
      days: Array.from(grouped.entries()).map(([date, dayOccurrences]) => ({
        date,
        total: dayOccurrences.length,
        pending: this.countStatus(dayOccurrences, TaskOccurrenceStatus.PENDING),
        inProgress: this.countStatus(
          dayOccurrences,
          TaskOccurrenceStatus.IN_PROGRESS,
        ),
        completed: this.countStatus(
          dayOccurrences,
          TaskOccurrenceStatus.COMPLETED,
        ),
        failed: this.countStatus(dayOccurrences, TaskOccurrenceStatus.FAILED),
        overdue: dayOccurrences.filter((item) => item.overdue).length,
        occurrences: dayOccurrences,
      })),
    };
  }

  async findAll(query: ListOccurrencesQueryDto, user: JwtPayload) {
    const from = query.from ? this.toDate(query.from) : undefined;
    const to = query.to ? this.toDate(query.to) : undefined;

    if (from && to && to < from) {
      throw new BadRequestException(
        'A data final não pode ser anterior à data inicial.',
      );
    }

    const where = await this.buildWhere(query, user, from, to);
    const skip = (query.page - 1) * query.limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.taskOccurrence.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
        include: occurrenceRelations,
      }),
      this.prisma.taskOccurrence.count({ where }),
    ]);

    return {
      data: await Promise.all(
        data.map((occurrence) => this.present(occurrence, user)),
      ),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(id: string, user?: JwtPayload) {
    const occurrence = await this.prisma.taskOccurrence.findUnique({
      where: { id },
      include: occurrenceRelations,
    });

    if (!occurrence) {
      throw new NotFoundException('Ocorrência não encontrada.');
    }

    if (user && !(await this.canOperate(occurrence, user))) {
      throw new ForbiddenException(
        'Você não é o responsável por esta ocorrência.',
      );
    }

    return this.present(occurrence, user);
  }

  async filterOptions() {
    const [functions, users] = await this.prisma.$transaction([
      this.prisma.taskFunction.findMany({
        where: { active: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.user.findMany({
        where: { active: true, deletedAt: null },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      functions,
      users,
      statuses: Object.values(TaskOccurrenceStatus),
    };
  }

  async start(id: string, user: JwtPayload) {
    const occurrence = await this.findForOperation(id);
    await this.assertCanOperate(occurrence, user);

    if (occurrence.status !== TaskOccurrenceStatus.PENDING) {
      throw new BadRequestException(
        'Somente ocorrências pendentes podem ser iniciadas.',
      );
    }

    const updated = await this.prisma.taskOccurrence.updateMany({
      where: {
        id,
        status: TaskOccurrenceStatus.PENDING,
      },
      data: {
        status: TaskOccurrenceStatus.IN_PROGRESS,
        startedAt: new Date(),
        executedByUserId: user.sub,
      },
    });

    if (updated.count !== 1) {
      throw new ConflictException(
        'A ocorrência foi alterada por outro usuário. Atualize a agenda e tente novamente.',
      );
    }

    await this.auditOperation(occurrence, user, 'OCCURRENCE_STARTED');

    return this.findOne(id, user);
  }

  async complete(id: string, dto: CompleteOccurrenceDto, user: JwtPayload) {
    const occurrence = await this.findForOperation(id);

    if (
      occurrence.status !== TaskOccurrenceStatus.IN_PROGRESS &&
      occurrence.status !== TaskOccurrenceStatus.PENDING
    ) {
      throw new BadRequestException(
        'A ocorrência não pode ser concluída no status atual.',
      );
    }

    if (occurrence.status === TaskOccurrenceStatus.PENDING) {
      await this.assertCanOperate(occurrence, user);
    } else if (
      !this.isAdmin(user) &&
      occurrence.executedByUserId !== user.sub
    ) {
      throw new ForbiddenException(
        'Somente o executor registrado pode concluir uma ocorrência já iniciada.',
      );
    }

    const now = new Date();
    const status =
      dto.result === TaskOccurrenceResult.ERROR
        ? TaskOccurrenceStatus.FAILED
        : dto.result === TaskOccurrenceResult.PARTIAL
          ? TaskOccurrenceStatus.IN_PROGRESS
          : TaskOccurrenceStatus.COMPLETED;
    const where: Prisma.TaskOccurrenceWhereInput = {
      id,
      status: occurrence.status,
    };

    if (
      occurrence.status === TaskOccurrenceStatus.IN_PROGRESS &&
      !this.isAdmin(user)
    ) {
      where.executedByUserId = user.sub;
    }

    const updated = await this.prisma.taskOccurrence.updateMany({
      where,
      data: {
        status,
        result: dto.result,
        completedAt: status === TaskOccurrenceStatus.IN_PROGRESS ? null : now,
        actualDurationMinutes: dto.actualDurationMinutes,
        notes: dto.notes?.trim() || null,
        ...(occurrence.status === TaskOccurrenceStatus.PENDING
          ? { startedAt: now, executedByUserId: user.sub }
          : {}),
      },
    });

    if (updated.count !== 1) {
      throw new ConflictException(
        'A ocorrência foi alterada por outro usuário. Atualize a agenda e tente novamente.',
      );
    }

    await this.auditOperation(occurrence, user, `OCCURRENCE_${dto.result}`);

    return this.findOne(id, user);
  }

  async reschedule(id: string, dto: RescheduleOccurrenceDto, user: JwtPayload) {
    const occurrence = await this.findForOperation(id);

    if (
      occurrence.status === TaskOccurrenceStatus.COMPLETED ||
      occurrence.status === TaskOccurrenceStatus.FAILED ||
      occurrence.status === TaskOccurrenceStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Ocorrências finalizadas não podem ser reagendadas.',
      );
    }

    await this.assertCanOperate(occurrence, user);

    if (
      occurrence.status === TaskOccurrenceStatus.IN_PROGRESS &&
      !this.isAdmin(user) &&
      occurrence.executedByUserId !== user.sub
    ) {
      throw new ForbiddenException(
        'Somente o executor registrado pode reagendar uma ocorrência já iniciada.',
      );
    }

    const updated = await this.prisma.taskOccurrence.update({
      where: { id },
      data: {
        scheduledDate: this.toDate(dto.scheduledDate),
        ...(dto.scheduledTime !== undefined
          ? { scheduledTime: dto.scheduledTime }
          : {}),
      },
      include: occurrenceRelations,
    });
    await this.auditOperation(occurrence, user, 'OCCURRENCE_RESCHEDULED');
    return this.present(updated, user);
  }

  async deleteForAdmin(
    id: string,
    scope: 'current' | 'future',
    user: JwtPayload,
  ) {
    if (!this.isAdmin(user)) {
      throw new ForbiddenException(
        'A exclusão física exige perfil administrador.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const occurrence = await tx.taskOccurrence.findUnique({
        where: { id },
        include: { task: true },
      });
      if (!occurrence) {
        throw new NotFoundException('Ocorrência não encontrada.');
      }

      let removedCount = 1;
      if (scope === 'future') {
        const removed = await tx.taskOccurrence.deleteMany({
          where: {
            taskId: occurrence.taskId,
            originalDate: { gte: occurrence.originalDate },
          },
        });
        removedCount = removed.count;

        const lastAllowedDate = new Date(occurrence.originalDate);
        lastAllowedDate.setUTCDate(lastAllowedDate.getUTCDate() - 1);
        await tx.task.update({
          where: { id: occurrence.taskId },
          data:
            lastAllowedDate < occurrence.task.startDate
              ? { active: false }
              : { endDate: lastAllowedDate },
        });
      } else {
        await tx.taskOccurrence.delete({ where: { id } });
        await tx.taskOccurrenceExclusion.upsert({
          where: {
            taskId_originalDate: {
              taskId: occurrence.taskId,
              originalDate: occurrence.originalDate,
            },
          },
          create: {
            taskId: occurrence.taskId,
            originalDate: occurrence.originalDate,
            createdByUserId: user.sub,
          },
          update: {},
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: user.sub,
          action: 'OCCURRENCE_PHYSICALLY_DELETED',
          entityType: 'TaskOccurrence',
          entityId: occurrence.id,
          metadata: {
            occurrenceId: occurrence.id,
            taskId: occurrence.taskId,
            originalDate: occurrence.originalDate.toISOString(),
            scheduledDate: occurrence.scheduledDate.toISOString(),
            scope,
            removedCount,
          },
        },
      });

      return { id, scope, removedCount };
    });
  }

  private async buildWhere(
    query: {
      taskId?: string;
      functionId?: string;
      responsibleUserId?: string;
      status?: TaskOccurrenceStatus;
      scope?: 'team' | 'mine';
    },
    user: JwtPayload,
    from?: Date,
    to?: Date,
  ): Promise<Prisma.TaskOccurrenceWhereInput> {
    const filters: Prisma.TaskOccurrenceWhereInput[] = [];

    if (query.taskId) filters.push({ taskId: query.taskId });
    if (query.functionId)
      filters.push({ task: { functionId: query.functionId } });
    if (query.responsibleUserId) {
      filters.push({ responsibleUserId: query.responsibleUserId });
    }
    if (query.status) filters.push({ status: query.status });
    if (from || to) {
      filters.push({
        scheduledDate: {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        },
      });
    }
    if (query.scope === 'mine' && !this.isAdmin(user)) {
      filters.push(await this.mineWhere(user));
    }

    return filters.length ? { AND: filters } : {};
  }

  private async mineWhere(
    user: JwtPayload,
  ): Promise<Prisma.TaskOccurrenceWhereInput> {
    const allowedPositionIds = user.positionId
      ? await this.hierarchy.getInheritedPositionIds(user.positionId)
      : [];
    const fallbackPositionFilters = allowedPositionIds.length
      ? [
          {
            responsibleUserId: null,
            task: {
              responsibleUserId: null,
              responsiblePositionId: { in: allowedPositionIds },
            },
          },
          {
            responsibleUserId: null,
            task: {
              responsibleUserId: null,
              responsiblePositionId: null,
              function: {
                responsibleUserId: null,
                responsiblePositionId: { in: allowedPositionIds },
              },
            },
          },
        ]
      : [];

    return {
      OR: [
        { responsibleUserId: user.sub },
        {
          responsibleUserId: null,
          task: { responsibleUserId: user.sub },
        },
        {
          responsibleUserId: null,
          task: {
            responsibleUserId: null,
            function: { responsibleUserId: user.sub },
          },
        },
        ...fallbackPositionFilters,
      ],
    };
  }

  private async findForOperation(id: string): Promise<OccurrenceWithRelations> {
    const occurrence = await this.prisma.taskOccurrence.findUnique({
      where: { id },
      include: occurrenceRelations,
    });

    if (!occurrence) {
      throw new NotFoundException('Ocorrência não encontrada.');
    }

    return occurrence;
  }

  private async present(
    occurrence: OccurrenceWithRelations,
    user?: JwtPayload,
  ) {
    return {
      ...occurrence,
      overdue:
        occurrence.status === TaskOccurrenceStatus.PENDING &&
        occurrence.scheduledDate < this.today(),
      canOperate: user ? await this.canOperate(occurrence, user) : false,
    };
  }

  private async canOperate(
    occurrence: OccurrenceWithRelations,
    user: JwtPayload,
  ) {
    if (this.isAdmin(user)) return true;

    const directUserId =
      occurrence.responsibleUserId ??
      occurrence.task.responsibleUserId ??
      occurrence.task.function.responsibleUserId;

    if (directUserId) return directUserId === user.sub;

    const responsiblePositionId =
      occurrence.task.responsiblePositionId ??
      occurrence.task.function.responsiblePositionId;

    if (!user.positionId || !responsiblePositionId) return false;
    const allowedPositionIds = await this.hierarchy.getInheritedPositionIds(
      user.positionId,
    );
    return allowedPositionIds.includes(responsiblePositionId);
  }

  private async assertCanOperate(
    occurrence: OccurrenceWithRelations,
    user: JwtPayload,
  ) {
    if (!(await this.canOperate(occurrence, user))) {
      throw new ForbiddenException(
        'Você não é o responsável por esta ocorrência.',
      );
    }
  }

  private isAdmin(user: JwtPayload): boolean {
    return user.accessLevel === 'ADMIN';
  }

  private countStatus(
    occurrences: Array<{ status: TaskOccurrenceStatus }>,
    status: TaskOccurrenceStatus,
  ) {
    return occurrences.filter((item) => item.status === status).length;
  }

  private toDate(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private today(): Date {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }

  private auditOperation(
    occurrence: OccurrenceWithRelations,
    user: JwtPayload,
    action: string,
  ) {
    return this.prisma.auditLog.create({
      data: {
        actorUserId: user.sub,
        action,
        entityType: 'TaskOccurrence',
        entityId: occurrence.id,
        metadata: {
          occurrenceId: occurrence.id,
          taskId: occurrence.taskId,
          actorPositionId: user.positionId ?? null,
          originalDate: occurrence.originalDate.toISOString(),
          scheduledDate: occurrence.scheduledDate.toISOString(),
        },
      },
    });
  }
}
