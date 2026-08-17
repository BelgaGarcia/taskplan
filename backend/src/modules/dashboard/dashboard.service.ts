import { Injectable } from '@nestjs/common';
import { TaskOccurrenceStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
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
        where: {
          status: TaskOccurrenceStatus.PENDING,
        },
      }),

      this.prisma.taskOccurrence.count({
        where: {
          status: TaskOccurrenceStatus.IN_PROGRESS,
        },
      }),

      this.prisma.taskOccurrence.count({
        where: {
          status: TaskOccurrenceStatus.COMPLETED,
        },
      }),

      this.prisma.taskOccurrence.count({
        where: {
          status: TaskOccurrenceStatus.FAILED,
        },
      }),

      this.prisma.taskOccurrence.count({
        where: {
          status: TaskOccurrenceStatus.PENDING,
          scheduledDate: {
            lt: today,
          },
        },
      }),

      this.prisma.taskOccurrence.findMany({
        where: {
          scheduledDate: today,
        },
        orderBy: {
          scheduledTime: 'asc',
        },
        include: {
          task: {
            include: {
              function: true,
              responsiblePosition: true,
            },
          },
          responsibleUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),

      this.prisma.taskOccurrence.findMany({
        where: {
          status: {
            in: [
              TaskOccurrenceStatus.PENDING,
              TaskOccurrenceStatus.IN_PROGRESS,
            ],
          },
          scheduledDate: {
            gte: today,
          },
        },
        orderBy: [
          {
            scheduledDate: 'asc',
          },
          {
            scheduledTime: 'asc',
          },
        ],
        take: 10,
        include: {
          task: {
            include: {
              function: true,
              responsiblePosition: true,
            },
          },
          responsibleUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return {
      totals: {
        pending,
        inProgress,
        completed,
        failed,
        overdue,
      },

      today: {
        date: today.toISOString().slice(0, 10),
        total: todayOccurrences.length,
        occurrences: todayOccurrences,
      },

      nextOccurrences,
    };
  }

  private today(): Date {
    const now = new Date();

    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }
}
