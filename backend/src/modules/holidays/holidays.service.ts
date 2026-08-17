import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { ListHolidaysQueryDto } from './dto/list-holidays-query.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';

@Injectable()
export class HolidaysService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateHolidayDto) {
    const name = dto.name.trim();
    const date = this.toDatabaseDate(dto.date);
    const locality = dto.locality?.trim() || null;

    await this.ensureHolidayIsUnique({
      name,
      date,
      type: dto.type,
      locality,
    });

    return this.prisma.holiday.create({
      data: {
        name,
        date,
        type: dto.type,
        locality,
        recurringAnnual: dto.recurringAnnual ?? false,
        active: dto.active ?? true,
      },
    });
  }

  async findAll(query: ListHolidaysQueryDto) {
    const skip = (query.page - 1) * query.limit;

    const normalizedSearch = query.search?.trim();

    const where = {
      ...(query.active !== undefined ? { active: query.active } : {}),

      ...(query.type ? { type: query.type } : {}),

      ...(normalizedSearch
        ? {
            OR: [
              {
                name: {
                  contains: normalizedSearch,
                  mode: 'insensitive' as const,
                },
              },
              {
                locality: {
                  contains: normalizedSearch,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.holiday.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: {
          date: 'asc',
        },
      }),
      this.prisma.holiday.count({
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
    const holiday = await this.prisma.holiday.findUnique({
      where: {
        id,
      },
    });

    if (!holiday) {
      throw new NotFoundException('Feriado não encontrado.');
    }

    return holiday;
  }

  async update(id: string, dto: UpdateHolidayDto) {
    const current = await this.findOne(id);

    const name = dto.name !== undefined ? dto.name.trim() : current.name;

    const date =
      dto.date !== undefined ? this.toDatabaseDate(dto.date) : current.date;

    const type = dto.type !== undefined ? dto.type : current.type;

    const locality =
      dto.locality !== undefined
        ? dto.locality.trim() || null
        : current.locality;

    await this.ensureHolidayIsUnique(
      {
        name,
        date,
        type,
        locality,
      },
      id,
    );

    return this.prisma.holiday.update({
      where: {
        id,
      },
      data: {
        ...(dto.name !== undefined && {
          name,
        }),

        ...(dto.date !== undefined && {
          date,
        }),

        ...(dto.type !== undefined && {
          type,
        }),

        ...(dto.locality !== undefined && {
          locality,
        }),

        ...(dto.recurringAnnual !== undefined && {
          recurringAnnual: dto.recurringAnnual,
        }),

        ...(dto.active !== undefined && {
          active: dto.active,
        }),
      },
    });
  }

  async deactivate(id: string) {
    await this.findOne(id);

    return this.prisma.holiday.update({
      where: {
        id,
      },
      data: {
        active: false,
      },
    });
  }

  private async ensureHolidayIsUnique(
    holiday: {
      name: string;
      date: Date;
      type: CreateHolidayDto['type'];
      locality: string | null;
    },
    ignoreId?: string,
  ): Promise<void> {
    const existing = await this.prisma.holiday.findFirst({
      where: {
        date: holiday.date,
        type: holiday.type,

        name: {
          equals: holiday.name,
          mode: 'insensitive',
        },

        ...(holiday.locality
          ? {
              locality: {
                equals: holiday.locality,
                mode: 'insensitive',
              },
            }
          : {
              locality: null,
            }),

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
      throw new ConflictException('Este feriado já está cadastrado.');
    }
  }

  private toDatabaseDate(date: string): Date {
    return new Date(`${date}T00:00:00.000Z`);
  }
}
