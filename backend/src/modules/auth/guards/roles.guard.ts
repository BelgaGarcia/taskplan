import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ACCESS_LEVELS_KEY,
  type AccessLevel,
} from '../../../common/decorators/roles.decorator';
import type { AuthenticatedRequest } from './jwt-auth.guard';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredLevels = this.reflector.getAllAndOverride<AccessLevel[]>(
      ACCESS_LEVELS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredLevels?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuário autenticado não identificado.');
    }

    if (!requiredLevels.includes(user.accessLevel)) {
      throw new ForbiddenException(
        'Você não possui permissão para acessar este recurso.',
      );
    }

    return true;
  }
}
