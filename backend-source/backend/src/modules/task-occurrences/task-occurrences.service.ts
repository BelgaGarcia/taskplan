import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  TaskOccurrenceResult,
  TaskOccurrenceStatus,
} from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CompleteOccurrenceDto } from './dto/complete-occurrence.dto';
import { ListOccurrencesQueryDto } from './dto/list-occurrences-query.dto';
import { RescheduleOccurrenceDto } from './dto/reschedule-occurrence.dto';
import { CalendarQueryDto } from './dto/calendar-query.dto';
@Injectable()
export class TaskOccurrencesService {
  constructor(private readonly prisma: PrismaService) {}
  async calendar(query: CalendarQueryDto) {
    const from = this.toDate(query.from);
    const to = this.toDate(query.to);

    if (to < from) {
      throw new BadRequestException(
        'A data final não pode ser anterior à data inicial.',
      );
    }

    const occurrences = await this.prisma.taskOccurrence.findMany({
      where: {
        scheduledDate: {
          gte: from,
          lte: to,
        },
        ...(query.taskId ? { taskId: query.taskId } : {}),
        ...(query.responsibleUserId
          ? {
              responsibleUserId: query.responsibleUserId,
            }
          : {}),
        ...(query.status ? { status: query.status } : {}),
      },

      orderBy: [
        {
          scheduledDate: 'asc',
        },
        {
          scheduledTime: 'asc',
        },
      ],

      include: {
        task: {
          include: {
            function: true,
            periodicity: true,
            responsiblePosition: true,
          },
        },

        responsibleUser: {
          select: {
            id: true,
            name: true,
            email: true,
            active: true,
          },
        },
      },
    });

    const today = this.today();

    const items = occurrences.map((occurrence) => ({
      ...occurrence,
      overdue:
        occurrence.status === TaskOccurrenceStatus.PENDING &&
        occurrence.scheduledDate < today,
    }));

    const grouped = new Map<string, typeof items>();

    for (const occurrence of items) {
      const date = occurrence.scheduledDate.toISOString().slice(0, 10);

      const current = grouped.get(date) ?? [];

      current.push(occurrence);
      grouped.set(date, current);
    }

    return {
      from: query.from,
      to: query.to,
      total: items.length,

      days: Array.from(grouped.entries()).map(([date, occurrences]) => ({
        date,
        total: occurrences.length,

        pending: occurrences.filter(
          (item) => item.status === TaskOccurrenceStatus.PENDING,
        ).length,

        inProgress: occurrences.filter(
          (item) => item.status === TaskOccurrenceStatus.IN_PROGRESS,
        ).length,

        completed: occurrences.filter(
          (item) => item.status === TaskOccurrenceStatus.COMPLETED,
        ).length,

        failed: occurrences.filter(
          (item) => item.status === TaskOccurrenceStatus.FAILED,
        ).length,

        overdue: occurrences.filter((item) => item.overdue).length,

        occurrences,
      })),
    };
  }
  async findAll(query: ListOccurrencesQueryDto) {
    const skip = (query.page - 1) * query.limit;

    const from = query.from ? this.toDate(query.from) : undefined;

    const to = query.to ? this.toDate(query.to) : undefined;

    const where = {
      ...(query.taskId ? { taskId: query.taskId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.responsibleUserId
        ? {
            responsibleUserId: query.responsibleUserId,
          }
        : {}),
      ...(from || to
        ? {
            scheduledDate: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.taskOccurrence.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: [
          {
            scheduledDate: 'asc',
          },
          {
            scheduledTime: 'asc',
          },
        ],
        include: {
          task: {
            include: {
              function: true,
              periodicity: true,
              responsiblePosition: true,
            },
          },
          responsibleUser: {
            select: {
              id: true,
              name: true,
              email: true,
              active: true,
            },
          },
        },
      }),
      this.prisma.taskOccurrence.count({
        where,
      }),
    ]);

    const today = this.today();

    return {
      data: data.map((item) => ({
        ...item,
        overdue:
          item.status === TaskOccurrenceStatus.PENDING &&
          item.scheduledDate < today,
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(id: string) {
    const occurrence = await this.prisma.taskOccurrence.findUnique({
      where: {
        id,
      },
      include: {
        task: {
          include: {
            function: true,
            periodicity: true,
            responsiblePosition: true,
          },
        },
        responsibleUser: {
          select: {
            id: true,
            name: true,
            email: true,
            active: true,
          },
        },
      },
    });

    if (!occurrence) {
      throw new NotFoundException('Ocorrência não encontrada.');
    }

    return {
      ...occurrence,
      overdue:
        occurrence.status === TaskOccurrenceStatus.PENDING &&
        occurrence.scheduledDate < this.today(),
    };
  }

  async start(id: string) {
    const occurrence = await this.findExisting(id);

    if (occurrence.status !== TaskOccurrenceStatus.PENDING) {
      throw new BadRequestException(
        'Somente ocorrências pendentes podem ser iniciadas.',
      );
    }

    return this.prisma.taskOccurrence.update({
      where: {
        id,
      },
      data: {
        status: TaskOccurrenceStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
    });
  }

  async complete(id: string, dto: CompleteOccurrenceDto) {
    const occurrence = await this.findExisting(id);

    if (
      occurrence.status !== TaskOccurrenceStatus.IN_PROGRESS &&
      occurrence.status !== TaskOccurrenceStatus.PENDING
    ) {
      throw new BadRequestException(
        'A ocorrência não pode ser concluída no status atual.',
      );
    }

    const status =
      dto.result === TaskOccurrenceResult.ERROR
        ? TaskOccurrenceStatus.FAILED
        : TaskOccurrenceStatus.COMPLETED;

    return this.prisma.taskOccurrence.update({
      where: {
        id,
      },
      data: {
        status,
        result: dto.result,
        completedAt: new Date(),
        actualDurationMinutes: dto.actualDurationMinutes,
        notes: dto.notes?.trim(),
        ...(occurrence.startedAt
          ? {}
          : {
              startedAt: new Date(),
            }),
      },
    });
  }

  async reschedule(id: string, dto: RescheduleOccurrenceDto) {
    const occurrence = await this.findExisting(id);

    if (
      occurrence.status === TaskOccurrenceStatus.COMPLETED ||
      occurrence.status === TaskOccurrenceStatus.FAILED ||
      occurrence.status === TaskOccurrenceStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Ocorrências finalizadas não podem ser reagendadas.',
      );
    }

    return this.prisma.taskOccurrence.update({
      where: {
        id,
      },
      data: {
        scheduledDate: this.toDate(dto.scheduledDate),
        ...(dto.scheduledTime !== undefined
          ? {
              scheduledTime: dto.scheduledTime,
            }
          : {}),
      },
    });
  }

  private async findExisting(id: string) {
    const occurrence = await this.prisma.taskOccurrence.findUnique({
      where: {
        id,
      },
    });

    if (!occurrence) {
      throw new NotFoundException('Ocorrência não encontrada.');
    }

    return occurrence;
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
}
