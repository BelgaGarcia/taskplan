import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const name = dto.name.trim();

    await this.ensureEmailIsAvailable(email);
    await this.validateRole(dto.roleId);

    if (dto.positionId) {
      await this.validatePosition(dto.positionId);
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        roleId: dto.roleId,
        positionId: dto.positionId ?? null,
        active: dto.active ?? true,
      },
      include: {
        role: true,
        position: true,
      },
    });

    return this.sanitize(user);
  }

  async findAll(query: ListUsersQueryDto) {
    const { page, limit, search, roleId, positionId, active } = query;
    const skip = (page - 1) * limit;
    const normalizedSearch = search?.trim();

    const where = {
      ...(active !== undefined ? { active } : {}),
      ...(roleId ? { roleId } : {}),
      ...(positionId ? { positionId } : {}),
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
                email: {
                  contains: normalizedSearch,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          name: 'asc',
        },
        include: {
          role: true,
          position: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: data.map((user) => this.sanitize(user)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        position: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return this.sanitize(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findExistingUser(id);

    const email = dto.email?.trim().toLowerCase();

    if (email) {
      await this.ensureEmailIsAvailable(email, id);
    }

    if (dto.roleId) {
      await this.validateRole(dto.roleId);
    }

    if (dto.positionId) {
      await this.validatePosition(dto.positionId);
    }

    const passwordHash = dto.password
      ? await argon2.hash(dto.password)
      : undefined;

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(passwordHash !== undefined ? { passwordHash } : {}),
        ...(dto.roleId !== undefined ? { roleId: dto.roleId } : {}),
        ...(dto.positionId !== undefined ? { positionId: dto.positionId } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
      include: {
        role: true,
        position: true,
      },
    });

    return this.sanitize(user);
  }

  async deactivate(id: string) {
    await this.findExistingUser(id);

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        active: false,
        deletedAt: new Date(),
      },
      include: {
        role: true,
        position: true,
      },
    });

    return this.sanitize(user);
  }

  private async validateRole(roleId: string): Promise<void> {
    const role = await this.prisma.role.findFirst({
      where: {
        id: roleId,
        active: true,
      },
      select: { id: true },
    });

    if (!role) {
      throw new NotFoundException(
        'Perfil de acesso não encontrado ou inativo.',
      );
    }
  }

  private async validatePosition(positionId: string): Promise<void> {
    const position = await this.prisma.position.findFirst({
      where: {
        id: positionId,
        active: true,
      },
      select: { id: true },
    });

    if (!position) {
      throw new NotFoundException('Cargo não encontrado ou inativo.');
    }
  }

  private async ensureEmailIsAvailable(
    email: string,
    ignoredUserId?: string,
  ): Promise<void> {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
        ...(ignoredUserId
          ? {
              id: {
                not: ignoredUserId,
              },
            }
          : {}),
      },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException(
        'Já existe um usuário cadastrado com esse e-mail.',
      );
    }
  }

  private async findExistingUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return user;
  }

  private sanitize<T extends { passwordHash: string }>(
    user: T,
  ): Omit<T, 'passwordHash'> {
    const safeUser = { ...user };

    delete (safeUser as Partial<T>).passwordHash;

    return safeUser;
  }
}
