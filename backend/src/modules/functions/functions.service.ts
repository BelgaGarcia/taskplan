import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateFunctionDto } from './dto/create-function.dto';
import { ListFunctionsQueryDto } from './dto/list-functions-query.dto';
import { UpdateFunctionDto } from './dto/update-function.dto';

@Injectable()
export class FunctionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFunctionDto) {
    const name = dto.name.trim();

    await this.ensureNameAvailable(name);
    await this.validateRelations(
      dto.responsiblePositionId,
      dto.responsibleUserId,
    );

    return this.prisma.taskFunction.create({
      data: {
        name,
        description: dto.description?.trim(),
        active: dto.active ?? true,
        responsiblePositionId: dto.responsiblePositionId ?? null,
        responsibleUserId: dto.responsibleUserId ?? null,
      },
      include: {
        responsiblePosition: true,
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
  }

  async findAll(query: ListFunctionsQueryDto) {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    const where = {
      ...(query.active !== undefined ? { active: query.active } : {}),
      ...(query.search
        ? {
            OR: [
              {
                name: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                description: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.taskFunction.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          name: 'asc',
        },
        include: {
          responsiblePosition: true,
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
      this.prisma.taskFunction.count({
        where,
      }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const taskFunction = await this.prisma.taskFunction.findUnique({
      where: {
        id,
      },
      include: {
        responsiblePosition: true,
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

    if (!taskFunction) {
      throw new NotFoundException('Função não encontrada.');
    }

    return taskFunction;
  }

  async update(id: string, dto: UpdateFunctionDto) {
    const current = await this.findOne(id);

    const name = dto.name !== undefined ? dto.name.trim() : current.name;

    if (
      dto.name !== undefined &&
      name.toLowerCase() !== current.name.toLowerCase()
    ) {
      await this.ensureNameAvailable(name, id);
    }

    await this.validateRelations(
      dto.responsiblePositionId,
      dto.responsibleUserId,
    );

    return this.prisma.taskFunction.update({
      where: {
        id,
      },
      data: {
        ...(dto.name !== undefined && {
          name,
        }),
        ...(dto.description !== undefined && {
          description: dto.description.trim(),
        }),
        ...(dto.active !== undefined && {
          active: dto.active,
        }),
        ...(dto.responsiblePositionId !== undefined && {
          responsiblePositionId: dto.responsiblePositionId,
        }),
        ...(dto.responsibleUserId !== undefined && {
          responsibleUserId: dto.responsibleUserId,
        }),
      },
      include: {
        responsiblePosition: true,
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
  }

  async deactivate(id: string) {
    await this.findOne(id);

    return this.prisma.taskFunction.update({
      where: {
        id,
      },
      data: {
        active: false,
      },
      include: {
        responsiblePosition: true,
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
  }

  private async ensureNameAvailable(
    name: string,
    ignoreId?: string,
  ): Promise<void> {
    const existing = await this.prisma.taskFunction.findFirst({
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
    });

    if (existing) {
      throw new ConflictException('Já existe uma função com o mesmo nome.');
    }
  }

  private async validateRelations(
    positionId?: string,
    userId?: string,
  ): Promise<void> {
    if (positionId) {
      const position = await this.prisma.position.findUnique({
        where: {
          id: positionId,
        },
      });

      if (!position || !position.active) {
        throw new NotFoundException(
          'Cargo responsável não encontrado ou inativo.',
        );
      }
    }

    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

      if (!user || !user.active || user.deletedAt) {
        throw new NotFoundException(
          'Usuário responsável não encontrado ou inativo.',
        );
      }
    }
  }
}
