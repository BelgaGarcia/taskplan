import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../database/prisma/prisma.service';
import { RedisService } from '../../database/redis/redis.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import type {
  JwtPayload,
  RefreshJwtPayload,
} from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
      include: {
        role: true,
        position: true,
      },
    });

    if (!user || !user.active || user.deletedAt) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    if (!user.role.active) {
      throw new UnauthorizedException(
        'O perfil de acesso do usuário está inativo.',
      );
    }

    const passwordMatches = await argon2.verify(
      user.passwordHash,
      dto.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    return this.createSessionResponse(user);
  }

  async refresh(refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);

    const sessionKey = this.getSessionKey(payload.sid);

    const storedSession = await this.redisService.get(sessionKey);

    if (!storedSession) {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }

    const session = JSON.parse(storedSession) as {
      userId: string;
      tokenHash: string;
    };

    if (session.userId !== payload.sub) {
      await this.redisService.delete(sessionKey);

      throw new UnauthorizedException('Sessão inválida.');
    }

    if (!this.compareHash(refreshToken, session.tokenHash)) {
      await this.redisService.delete(sessionKey);

      throw new UnauthorizedException('Refresh token inválido.');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
      include: {
        role: true,
        position: true,
      },
    });

    if (!user || !user.active || user.deletedAt || !user.role.active) {
      await this.redisService.delete(sessionKey);

      throw new UnauthorizedException('Usuário ou perfil de acesso inativo.');
    }

    // Rotação do refresh token.
    // A sessão anterior é removida antes da criação
    // de uma nova sessão.
    await this.redisService.delete(sessionKey);

    return this.createSessionResponse(user);
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = await this.verifyRefreshToken(refreshToken);

      await this.redisService.delete(this.getSessionKey(payload.sid));
    } catch {
      // Logout idempotente:
      // token inválido ou expirado não gera erro
      // para o cliente.
    }
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, position: true },
    });

    if (!user || !user.active || user.deletedAt || !user.role.active) {
      throw new UnauthorizedException('Usuário ou perfil de acesso inativo.');
    }

    const currentPasswordMatches = await argon2.verify(
      user.passwordHash,
      dto.currentPassword,
    );
    if (!currentPasswordMatches) {
      throw new UnauthorizedException('A senha atual informada é inválida.');
    }

    if (await argon2.verify(user.passwordHash, dto.newPassword)) {
      throw new BadRequestException(
        'A nova senha deve ser diferente da senha atual.',
      );
    }

    const passwordHash = await argon2.hash(dto.newPassword);
    const invalidatedSessions = await this.redisService.invalidateUserSessions(
      user.id,
    );
    const updated = await this.prisma.$transaction(async (tx) => {
      const changedUser = await tx.user.update({
        where: { id: user.id },
        data: { passwordHash, mustChangePassword: false },
        include: { role: true, position: true },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: 'USER_PASSWORD_CHANGED',
          entityType: 'User',
          entityId: user.id,
          metadata: { invalidatedSessions },
        },
      });
      return changedUser;
    });

    return this.createSessionResponse(updated);
  }

  private async createSessionResponse(user: {
    id: string;
    name: string;
    email: string;
    active: boolean;
    roleId: string;
    positionId: string | null;
    mustChangePassword: boolean;
    role: { accessLevel: JwtPayload['accessLevel'] } & Record<string, unknown>;
    position: Record<string, unknown> | null;
  }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      accessLevel: user.role.accessLevel,
      positionId: user.positionId,
    };
    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = await this.createRefreshSession(user.id);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn:
        this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        active: user.active,
        mustChangePassword: user.mustChangePassword,
        role: user.role,
        position: user.position,
      },
    };
  }

  private async createRefreshSession(userId: string): Promise<string> {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!secret) {
      throw new Error(
        'A variável de ambiente JWT_REFRESH_SECRET não foi definida.',
      );
    }

    const ttl =
      Number(
        this.configService.get<string>('JWT_REFRESH_EXPIRES_IN_SECONDS'),
      ) || 604800;

    const sessionId = randomUUID();

    const payload: RefreshJwtPayload = {
      sub: userId,
      sid: sessionId,
    };

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret,
      expiresIn: ttl,
    });

    const session = {
      userId,
      tokenHash: this.hashToken(refreshToken),
    };

    await this.redisService.set(
      this.getSessionKey(sessionId),
      JSON.stringify(session),
      ttl,
    );

    return refreshToken;
  }

  private async verifyRefreshToken(
    refreshToken: string,
  ): Promise<RefreshJwtPayload> {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!secret) {
      throw new Error(
        'A variável de ambiente JWT_REFRESH_SECRET não foi definida.',
      );
    }

    try {
      return await this.jwtService.verifyAsync<RefreshJwtPayload>(
        refreshToken,
        {
          secret,
        },
      );
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado.');
    }
  }

  private getSessionKey(sessionId: string): string {
    return `auth:session:${sessionId}`;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private compareHash(token: string, storedHash: string): boolean {
    const currentHash = Buffer.from(this.hashToken(token), 'hex');

    const expectedHash = Buffer.from(storedHash, 'hex');

    if (currentHash.length !== expectedHash.length) {
      return false;
    }

    return timingSafeEqual(currentHash, expectedHash);
  }
}
