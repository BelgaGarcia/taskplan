import { Injectable } from '@nestjs/common';
import { TaskOccurrenceStatus } from '../../generated/prisma/client';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

const dashboardRelations = {
  task: {
    include: {
      function: {
        select: {
          id: true,
          name: true,
          responsibleUserId: true,
          responsiblePositionId: true,
        },
      },
      responsiblePosition: true,
      responsibleUser: { select: { id: true, name: true, email: true } },
    },
  },
  responsibleUser: { select: { id: true, name: true, email: true } },
  executedByUser: { select: { id: true, name: true, email: true } },
} satisfies Prisma.TaskOccurrenceInclude;

type DashboardOccurrence = Prisma.TaskOccurrenceGetPayload<{
  include: typeof dashboardRelations;
}>;
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(user: JwtPayload) {
    const today = this.today();
    const [
      pending,
      inProgress,
      completed,
      failed,
      overdue,
      todayOccurrences,
      nextOccurrences,
    ] = await Promise.all([
      this.prisma.taskOccurrence.count({
        where: { status: TaskOccurrenceStatus.PENDING },
      }),
      this.prisma.taskOccurrence.count({
        where: { status: TaskOccurrenceStatus.IN_PROGRESS },
      }),
      this.prisma.taskOccurrence.count({
        where: { status: TaskOccurrenceStatus.COMPLETED },
      }),
      this.prisma.taskOccurrence.count({
        where: { status: TaskOccurrenceStatus.FAILED },
      }),
      this.prisma.taskOccurrence.count({
        where: {
          status: TaskOccurrenceStatus.PENDING,
          scheduledDate: { lt: today },
        },
      }),
      this.prisma.taskOccurrence.findMany({
        where: { scheduledDate: today },
        orderBy: { scheduledTime: 'asc' },
        include: dashboardRelations,
      }),
      this.prisma.taskOccurrence.findMany({
        where: {
          status: {
            in: [
              TaskOccurrenceStatus.PENDING,
              TaskOccurrenceStatus.IN_PROGRESS,
            ],
          },
          scheduledDate: { gte: today },
        },
        orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
        take: 10,
        include: dashboardRelations,
      }),
    ]);

    return {
      totals: { pending, inProgress, completed, failed, overdue },
      today: {
        date: today.toISOString().slice(0, 10),
        total: todayOccurrences.length,
        occurrences: todayOccurrences.map((item) => this.present(item, user)),
      },
      nextOccurrences: nextOccurrences.map((item) => this.present(item, user)),
    };
  }

  private present(occurrence: DashboardOccurrence, user: JwtPayload) {
    return {
      ...occurrence,
      overdue:
        occurrence.status === TaskOccurrenceStatus.PENDING &&
        occurrence.scheduledDate < this.today(),
      canOperate: this.canOperate(occurrence, user),
    };
  }

  private canOperate(occurrence: DashboardOccurrence, user: JwtPayload) {
    if (user.accessLevel === 'ADMIN') return true;
    const directUserId =
      occurrence.responsibleUserId ??
      occurrence.task.responsibleUserId ??
      occurrence.task.function.responsibleUserId;
    if (directUserId) return directUserId === user.sub;
    const positionId =
      occurrence.task.responsiblePositionId ??
      occurrence.task.function.responsiblePositionId;
    return !!user.positionId && positionId === user.positionId;
  }

  private today(): Date {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }
}
