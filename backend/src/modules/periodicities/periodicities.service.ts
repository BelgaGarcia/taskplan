import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { OccurrenceGeneratorService } from '../task-occurrences/occurrence-generator.service';
import { CreatePeriodicityDto } from './dto/create-periodicity.dto';
import { ListPeriodicitiesQueryDto } from './dto/list-periodicities-query.dto';
import { UpdatePeriodicityDto } from './dto/update-periodicity.dto';

interface PeriodicityConfiguration {
  type?: string;
  daysOfWeek?: number[] | null;
  dayOfMonth?: number | null;
  startDayOfMonth?: number | null;
  endDayOfMonth?: number | null;
  month?: number | null;
}

const REACTIVATION_HORIZON_DAYS = 90;

@Injectable()
export class PeriodicitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly generator: OccurrenceGeneratorService,
  ) {}

  async create(dto: CreatePeriodicityDto) {
    const name = dto.name.trim();

    await this.ensureNameAvailable(name);
    this.validateConfiguration(dto);

    return this.prisma.periodicity.create({
      data: {
        name,
        type: dto.type,
        interval: dto.interval ?? 1,
        daysOfWeek: dto.daysOfWeek ?? [],
        dayOfMonth: dto.dayOfMonth ?? null,
        startDayOfMonth: dto.startDayOfMonth ?? null,
        endDayOfMonth: dto.endDayOfMonth ?? null,
        month: dto.month ?? null,
        nonexistentDayRule: dto.nonexistentDayRule,
        active: dto.active ?? true,
      },
    });
  }

  async findAll(query: ListPeriodicitiesQueryDto) {
    const skip = (query.page - 1) * query.limit;

    const where = {
      ...(query.active !== undefined ? { active: query.active } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.search
        ? {
            name: {
              contains: query.search.trim(),
              mode: 'insensitive' as const,
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.periodicity.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: {
          name: 'asc',
        },
      }),
      this.prisma.periodicity.count({
        where,
      }),
    ]);

    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(id: string) {
    const periodicity = await this.prisma.periodicity.findUnique({
      where: {
        id,
      },
    });

    if (!periodicity) {
      throw new NotFoundException('Periodicidade não encontrada.');
    }

    return periodicity;
  }

  async update(id: string, dto: UpdatePeriodicityDto) {
    const current = await this.findOne(id);

    if (dto.name !== undefined) {
      const normalizedName = dto.name.trim();

      if (normalizedName.toLowerCase() !== current.name.toLowerCase()) {
        await this.ensureNameAvailable(normalizedName, id);
      }
    }

    this.validateConfiguration({
      ...current,
      ...dto,
    });

    const pendingFuture = await this.findPendingFutureOccurrences(id);
    const nextActive = dto.active ?? current.active;
    const data = {
      ...(dto.name !== undefined && {
        name: dto.name.trim(),
      }),

      ...(dto.type !== undefined && {
        type: dto.type,
      }),

      ...(dto.interval !== undefined && {
        interval: dto.interval,
      }),

      ...(dto.daysOfWeek !== undefined && {
        daysOfWeek: dto.daysOfWeek,
      }),

      ...(dto.dayOfMonth !== undefined && {
        dayOfMonth: dto.dayOfMonth,
      }),

      ...(dto.startDayOfMonth !== undefined && {
        startDayOfMonth: dto.startDayOfMonth,
      }),

      ...(dto.endDayOfMonth !== undefined && {
        endDayOfMonth: dto.endDayOfMonth,
      }),

      ...(dto.month !== undefined && {
        month: dto.month,
      }),

      ...(dto.nonexistentDayRule !== undefined && {
        nonexistentDayRule: dto.nonexistentDayRule,
      }),

      ...(dto.active !== undefined && {
        active: dto.active,
      }),
    };

    const updated = await this.prisma.$transaction(async (tx) => {
      const periodicity = await tx.periodicity.update({ where: { id }, data });
      await this.deletePendingFutureOccurrences(tx, id);
      return periodicity;
    });

    if (nextActive) {
      await this.regenerateMaterializedHorizon(pendingFuture);
    }

    return updated;
  }

  async deactivate(id: string) {
    await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      const periodicity = await tx.periodicity.update({
        where: { id },
        data: { active: false },
      });
      await this.deletePendingFutureOccurrences(tx, id);
      return periodicity;
    });
  }

  async reactivate(id: string) {
    const current = await this.findOne(id);

    if (current.active) {
      return current;
    }

    try {
      this.validateConfiguration(current);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new BadRequestException(
          `Não foi possível reativar a periodicidade: ${error.message}`,
        );
      }
      throw error;
    }

    const periodicity = await this.prisma.periodicity.update({
      where: { id },
      data: { active: true },
    });

    const tasks = await this.prisma.task.findMany({
      where: { periodicityId: id, active: true },
      select: { id: true },
    });
    const from = this.today();
    const to = new Date(from);
    to.setUTCDate(to.getUTCDate() + REACTIVATION_HORIZON_DAYS);

    await this.generator.generateForTasks(
      tasks.map((task) => task.id),
      from,
      to,
    );

    return periodicity;
  }

  private async ensureNameAvailable(
    name: string,
    ignoreId?: string,
  ): Promise<void> {
    const existing = await this.prisma.periodicity.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },

        ...(ignoreId
          ? {
              id: {
                not: ignoreId,
              },
            }
          : {}),
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      throw new ConflictException('Já existe uma periodicidade com esse nome.');
    }
  }

  private validateConfiguration(dto: PeriodicityConfiguration): void {
    if (
      (dto.type === 'SPECIFIC_WEEKDAYS' || dto.type === 'WEEKLY') &&
      (!dto.daysOfWeek || dto.daysOfWeek.length === 0)
    ) {
      throw new BadRequestException(
        'Periodicidade semanal exige ao menos um dia em daysOfWeek.',
      );
    }

    if (dto.type === 'SPECIFIC_MONTH_DAY' && !dto.dayOfMonth) {
      throw new BadRequestException(
        'Periodicidade por dia do mês exige dayOfMonth.',
      );
    }

    if (dto.type === 'ANNUAL' && !dto.month) {
      throw new BadRequestException(
        'Periodicidade anual exige o mês de referência.',
      );
    }

    if (dto.type === 'MONTHLY_DAY_RANGE') {
      const start = dto.startDayOfMonth;
      const end = dto.endDayOfMonth;
      if (!start || !end || start < 1 || start > 31 || end < 1 || end > 31) {
        throw new BadRequestException(
          'Faixa mensal exige startDayOfMonth e endDayOfMonth.',
        );
      }
      if (start > end) {
        throw new BadRequestException(
          'O dia inicial da faixa mensal não pode ser maior que o dia final.',
        );
      }
    }
  }

  private async findPendingFutureOccurrences(periodicityId: string) {
    return this.prisma.taskOccurrence.findMany({
      where: {
        status: 'PENDING',
        originalDate: { gte: this.today() },
        task: { periodicityId },
      },
      select: { taskId: true, originalDate: true },
    });
  }

  private deletePendingFutureOccurrences(
    tx: Pick<PrismaService, 'taskOccurrence'>,
    periodicityId: string,
  ) {
    return tx.taskOccurrence.deleteMany({
      where: {
        status: 'PENDING',
        originalDate: { gte: this.today() },
        task: { periodicityId },
      },
    });
  }

  private async regenerateMaterializedHorizon(
    occurrences: Array<{ taskId: string; originalDate: Date }>,
  ) {
    const horizons = new Map<string, Date>();
    for (const occurrence of occurrences) {
      const current = horizons.get(occurrence.taskId);
      if (!current || occurrence.originalDate > current) {
        horizons.set(occurrence.taskId, occurrence.originalDate);
      }
    }

    const from = this.today();
    for (const [taskId, to] of horizons) {
      await this.generator.generateForTasks([taskId], from, to);
    }
  }

  private today(): Date {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }
}
