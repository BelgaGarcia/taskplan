import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTaskDto) {
    await this.validateRelations(dto);

    const startDate = this.toDate(dto.startDate);
    const endDate = dto.endDate ? this.toDate(dto.endDate) : null;

    this.validateDateRange(startDate, endDate);

    return this.prisma.task.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        functionId: dto.functionId,
        periodicityId: dto.periodicityId,
        responsiblePositionId: dto.responsiblePositionId ?? null,
        responsibleUserId: dto.responsibleUserId ?? null,
        startDate,
        endDate,
        scheduledTime: dto.scheduledTime ?? null,
        estimatedDurationMinutes: dto.estimatedDurationMinutes ?? null,
        mandatory: dto.mandatory ?? true,
        active: dto.active ?? true,
        displayOrder: dto.displayOrder ?? 0,
        advanceOnNonBusinessDay: dto.advanceOnNonBusinessDay ?? true,
      },
      include: this.getRelations(),
    });
  }

  async findAll(query: ListTasksQueryDto) {
    const skip = (query.page - 1) * query.limit;
    const search = query.search?.trim();

    const where = {
      ...(query.active !== undefined ? { active: query.active } : {}),
      ...(query.functionId ? { functionId: query.functionId } : {}),
      ...(query.periodicityId ? { periodicityId: query.periodicityId } : {}),
      ...(query.responsiblePositionId
        ? {
            responsiblePositionId: query.responsiblePositionId,
          }
        : {}),
      ...(query.responsibleUserId
        ? {
            responsibleUserId: query.responsibleUserId,
          }
        : {}),
      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                description: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: [
          {
            displayOrder: 'asc',
          },
          {
            name: 'asc',
          },
        ],
        include: this.getRelations(),
      }),
      this.prisma.task.count({
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
    const task = await this.prisma.task.findUnique({
      where: {
        id,
      },
      include: {
        ...this.getRelations(),
        _count: {
          select: {
            occurrences: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Tarefa não encontrada.');
    }

    return task;
  }

  async update(id: string, dto: UpdateTaskDto) {
    const current = await this.findExisting(id);

    await this.validateRelations(dto);

    const startDate =
      dto.startDate !== undefined
        ? this.toDate(dto.startDate)
        : current.startDate;

    const endDate =
      dto.endDate !== undefined ? this.toDate(dto.endDate) : current.endDate;

    this.validateDateRange(startDate, endDate);

    return this.prisma.task.update({
      where: {
        id,
      },
      data: {
        ...(dto.name !== undefined && {
          name: dto.name.trim(),
        }),
        ...(dto.description !== undefined && {
          description: dto.description.trim() || null,
        }),
        ...(dto.functionId !== undefined && {
          functionId: dto.functionId,
        }),
        ...(dto.periodicityId !== undefined && {
          periodicityId: dto.periodicityId,
        }),
        ...(dto.responsiblePositionId !== undefined && {
          responsiblePositionId: dto.responsiblePositionId,
        }),
        ...(dto.responsibleUserId !== undefined && {
          responsibleUserId: dto.responsibleUserId,
        }),
        ...(dto.startDate !== undefined && {
          startDate,
        }),
        ...(dto.endDate !== undefined && {
          endDate,
        }),
        ...(dto.scheduledTime !== undefined && {
          scheduledTime: dto.scheduledTime,
        }),
        ...(dto.estimatedDurationMinutes !== undefined && {
          estimatedDurationMinutes: dto.estimatedDurationMinutes,
        }),
        ...(dto.mandatory !== undefined && {
          mandatory: dto.mandatory,
        }),
        ...(dto.active !== undefined && {
          active: dto.active,
        }),
        ...(dto.displayOrder !== undefined && {
          displayOrder: dto.displayOrder,
        }),
        ...(dto.advanceOnNonBusinessDay !== undefined && {
          advanceOnNonBusinessDay: dto.advanceOnNonBusinessDay,
        }),
      },
      include: this.getRelations(),
    });
  }

  async deactivate(id: string) {
    await this.findExisting(id);

    return this.prisma.task.update({
      where: {
        id,
      },
      data: {
        active: false,
      },
      include: this.getRelations(),
    });
  }

  private async validateRelations(dto: Partial<CreateTaskDto>): Promise<void> {
    if (dto.functionId) {
      const taskFunction = await this.prisma.taskFunction.findFirst({
        where: {
          id: dto.functionId,
          active: true,
        },
        select: {
          id: true,
        },
      });

      if (!taskFunction) {
        throw new NotFoundException('Função não encontrada ou inativa.');
      }
    }

    if (dto.periodicityId) {
      const periodicity = await this.prisma.periodicity.findFirst({
        where: {
          id: dto.periodicityId,
          active: true,
        },
        select: {
          id: true,
        },
      });

      if (!periodicity) {
        throw new NotFoundException('Periodicidade não encontrada ou inativa.');
      }
    }

    if (dto.responsiblePositionId) {
      const position = await this.prisma.position.findFirst({
        where: {
          id: dto.responsiblePositionId,
          active: true,
        },
        select: {
          id: true,
        },
      });

      if (!position) {
        throw new NotFoundException(
          'Cargo responsável não encontrado ou inativo.',
        );
      }
    }

    if (dto.responsibleUserId) {
      const user = await this.prisma.user.findFirst({
        where: {
          id: dto.responsibleUserId,
          active: true,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!user) {
        throw new NotFoundException(
          'Usuário responsável não encontrado ou inativo.',
        );
      }
    }
  }

  private async findExisting(id: string) {
    const task = await this.prisma.task.findUnique({
      where: {
        id,
      },
    });

    if (!task) {
      throw new NotFoundException('Tarefa não encontrada.');
    }

    return task;
  }

  private validateDateRange(startDate: Date, endDate: Date | null): void {
    if (endDate && endDate < startDate) {
      throw new BadRequestException(
        'A data final não pode ser anterior à data inicial.',
      );
    }
  }

  private toDate(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private getRelations() {
    return {
      function: true,
      periodicity: true,
      responsiblePosition: true,
      responsibleUser: {
        select: {
          id: true,
          name: true,
          email: true,
          active: true,
          positionId: true,
        },
      },
    } as const;
  }
}
