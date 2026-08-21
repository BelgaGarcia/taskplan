/* Mocked Prisma methods intentionally cross an untyped third-party boundary. */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import * as argon2 from 'argon2';
import { PasswordResetMode } from './dto/reset-user-password.dto';
import { UsersService } from './users.service';

jest.mock('argon2', () => ({
  hash: jest.fn(),
}));

describe('UsersService', () => {
  const actor = {
    sub: 'admin-id',
    email: 'admin@example.com',
    roleId: 'role-admin',
    accessLevel: 'ADMIN' as const,
    positionId: null,
  };
  const user = {
    id: 'user-id',
    name: 'Usuário',
    email: 'user@example.com',
    passwordHash: 'old-hash',
    active: true,
    roleId: 'role-user',
    positionId: null,
    mustChangePassword: false,
    role: { id: 'role-user', name: 'Operador', accessLevel: 'OPERATOR' },
    position: null,
  };

  const createService = () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
        update: jest.fn().mockResolvedValue(user),
      },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-id' }) },
      $transaction: jest.fn(async (callback) => callback(prisma)),
    };
    const redis = {
      invalidateUserSessions: jest.fn().mockResolvedValue(2),
    };
    return {
      prisma,
      redis,
      service: new UsersService(prisma as never, redis as never),
    };
  };

  beforeEach(() => {
    jest.mocked(argon2.hash).mockResolvedValue('new-hash');
  });

  it('resets a password, invalidates active sessions and records the administrator', async () => {
    const { prisma, redis, service } = createService();

    const result = await service.resetPassword(
      user.id,
      { mode: PasswordResetMode.SET, password: 'NovaSenha123!' },
      actor,
    );

    expect(redis.invalidateUserSessions).toHaveBeenCalledWith(user.id);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          passwordHash: 'new-hash',
          mustChangePassword: false,
        }),
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorUserId: actor.sub,
          action: 'USER_PASSWORD_RESET',
          entityId: user.id,
          metadata: expect.objectContaining({
            resetMode: PasswordResetMode.SET,
            invalidatedSessions: 2,
          }),
        }),
      }),
    );
    expect(result).toEqual(expect.objectContaining({ invalidatedSessions: 2 }));
    expect(result).not.toHaveProperty('temporaryPassword');
  });

  it('returns a temporary password only once and forces its replacement at login', async () => {
    const { prisma, service } = createService();

    const result = await service.resetPassword(
      user.id,
      { mode: PasswordResetMode.TEMPORARY },
      actor,
    );

    expect(result.temporaryPassword).toMatch(/^Tp!A1/);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ mustChangePassword: true }),
      }),
    );
  });
});
