import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreatePeriodicityDto } from './dto/create-periodicity.dto';
import { ListPeriodicitiesQueryDto } from './dto/list-periodicities-query.dto';
import { UpdatePeriodicityDto } from './dto/update-periodicity.dto';

interface PeriodicityConfiguration {
  type?: string;
  daysOfWeek?: number[] | null;
  dayOfMonth?: number | null;
  month?: number | null;
}

@Injectable()
export class PeriodicitiesService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.periodicity.update({
      where: {
        id,
      },
      data: {
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

        ...(dto.month !== undefined && {
          month: dto.month,
        }),

        ...(dto.nonexistentDayRule !== undefined && {
          nonexistentDayRule: dto.nonexistentDayRule,
        }),

        ...(dto.active !== undefined && {
          active: dto.active,
        }),
      },
    });
  }

  async deactivate(id: string) {
    await this.findOne(id);

    return this.prisma.periodicity.update({
      where: {
        id,
      },
      data: {
        active: false,
      },
    });
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
      dto.type === 'SPECIFIC_WEEKDAYS' &&
      (!dto.daysOfWeek || dto.daysOfWeek.length === 0)
    ) {
      throw new BadRequestException(
        'Periodicidade por dias da semana exige daysOfWeek.',
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
  }
}
