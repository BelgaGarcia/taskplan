import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { ListRolesQueryDto } from './dto/list-roles-query.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createRoleDto: CreateRoleDto) {
    const normalizedName = createRoleDto.name.trim();

    await this.ensureNameIsAvailable(normalizedName);

    return this.prisma.role.create({
      data: {
        name: normalizedName,
        description: createRoleDto.description?.trim() || null,
        active: createRoleDto.active ?? true,
      },
    });
  }

  async findAll(query: ListRolesQueryDto) {
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
      this.prisma.role.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          name: 'asc',
        },
      }),
      this.prisma.role.count({ where }),
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
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('Perfil de acesso não encontrado.');
    }

    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto) {
    await this.findOne(id);

    const normalizedName = updateRoleDto.name?.trim();

    if (normalizedName) {
      await this.ensureNameIsAvailable(normalizedName, id);
    }

    return this.prisma.role.update({
      where: { id },
      data: {
        ...(normalizedName !== undefined ? { name: normalizedName } : {}),
        ...(updateRoleDto.description !== undefined
          ? {
              description: updateRoleDto.description.trim() || null,
            }
          : {}),
        ...(updateRoleDto.active !== undefined
          ? { active: updateRoleDto.active }
          : {}),
      },
    });
  }

  async deactivate(id: string) {
    await this.findOne(id);

    const usersLinkedToRole = await this.prisma.user.count({
      where: {
        roleId: id,
        active: true,
      },
    });

    if (usersLinkedToRole > 0) {
      throw new ConflictException(
        'O perfil não pode ser inativado enquanto possuir usuários ativos vinculados.',
      );
    }

    return this.prisma.role.update({
      where: { id },
      data: {
        active: false,
      },
    });
  }

  private async ensureNameIsAvailable(
    name: string,
    ignoredRoleId?: string,
  ): Promise<void> {
    const existingRole = await this.prisma.role.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
        ...(ignoredRoleId
          ? {
              id: {
                not: ignoredRoleId,
              },
            }
          : {}),
      },
      select: {
        id: true,
      },
    });

    if (existingRole) {
      throw new ConflictException(
        'Já existe um perfil de acesso com esse nome.',
      );
    }
  }
}
