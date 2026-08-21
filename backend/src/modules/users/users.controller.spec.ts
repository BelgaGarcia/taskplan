import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UsersController } from './users.controller';

describe('UsersController password reset authorization', () => {
  it('denies password reset to an authenticated non-admin user', () => {
    const guard = new RolesGuard(new Reflector());
    const context = {
      getHandler: () => () => undefined,
      getClass: () => UsersController,
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            sub: 'operator-id',
            accessLevel: 'OPERATOR',
          },
        }),
      }),
    };

    expect(() => guard.canActivate(context as never)).toThrow(
      ForbiddenException,
    );
  });
});
