import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { ListPositionsQueryDto } from './dto/list-positions-query.dto';
import { UpdatePositionDto } from './dto/update-position.dto';

@Injectable()
export class PositionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPositionDto: CreatePositionDto) {
    const normalizedName = createPositionDto.name.trim();

    await this.ensureNameIsAvailable(normalizedName);

    return this.prisma.position.create({
      data: {
        name: normalizedName,
        description: createPositionDto.description?.trim() || null,
        active: createPositionDto.active ?? true,
      },
    });
  }

  async findAll(query: ListPositionsQueryDto) {
    const { page, limit, search, active } = query;
    const skip = (page - 1) * limit;
    const normalizedSearch = search?.trim();

    const where = {
      ...(active !== undefined ? { active } : {}),
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
                description: {
                  contains: normalizedSearch,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.position.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          name: 'asc',
        },
      }),
      this.prisma.position.count({ where }),
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
    const position = await this.prisma.position.findUnique({
      where: { id },
    });

    if (!position) {
      throw new NotFoundException('Cargo não encontrado.');
    }

    return position;
  }

  async update(id: string, updatePositionDto: UpdatePositionDto) {
    await this.findOne(id);

    const normalizedName = updatePositionDto.name?.trim();

    if (normalizedName) {
      await this.ensureNameIsAvailable(normalizedName, id);
    }

    return this.prisma.position.update({
      where: { id },
      data: {
        ...(normalizedName !== undefined ? { name: normalizedName } : {}),
        ...(updatePositionDto.description !== undefined
          ? {
              description: updatePositionDto.description?.trim() || null,
            }
          : {}),
        ...(updatePositionDto.active !== undefined
          ? { active: updatePositionDto.active }
          : {}),
      },
    });
  }

  async deactivate(id: string) {
    await this.findOne(id);

    const usersLinkedToPosition = await this.prisma.user.count({
      where: {
        positionId: id,
        active: true,
      },
    });

    if (usersLinkedToPosition > 0) {
      throw new ConflictException(
        'O cargo não pode ser inativado enquanto possuir usuários ativos vinculados.',
      );
    }

    return this.prisma.position.update({
      where: { id },
      data: {
        active: false,
      },
    });
  }

  async hardDelete(id: string, actorUserId: string) {
    const position = await this.findOne(id);
    const [users, functions, tasks, inheritances] =
      await this.prisma.$transaction([
        this.prisma.user.count({ where: { positionId: id } }),
        this.prisma.taskFunction.count({
          where: { responsiblePositionId: id },
        }),
        this.prisma.task.count({ where: { responsiblePositionId: id } }),
        this.prisma.positionInheritance.count({
          where: {
            OR: [{ positionId: id }, { inheritedPositionId: id }],
          },
        }),
      ]);

    if (users + functions + tasks + inheritances > 0) {
      throw new ConflictException(
        `O cargo não pode ser excluído definitivamente porque possui vínculos: ${users} usuário(s), ${functions} função(ões), ${tasks} tarefa(s) e ${inheritances} herança(s).`,
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      await transaction.position.delete({ where: { id } });
      await transaction.auditLog.create({
        data: {
          actorUserId,
          action: 'POSITION_HARD_DELETED',
          entityType: 'Position',
          entityId: id,
          metadata: { name: position.name },
        },
      });
      return { id };
    });
  }

  private async ensureNameIsAvailable(
    name: string,
    ignoredPositionId?: string,
  ): Promise<void> {
    const existingPosition = await this.prisma.position.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
        ...(ignoredPositionId
          ? {
              id: {
                not: ignoredPositionId,
              },
            }
          : {}),
      },
      select: {
        id: true,
      },
    });

    if (existingPosition) {
      throw new ConflictException('Já existe um cargo com esse nome.');
    }
  }
}
