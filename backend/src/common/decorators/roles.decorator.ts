import { SetMetadata } from '@nestjs/common';

export type AccessLevel = 'ADMIN' | 'OPERATOR';

export const ACCESS_LEVELS_KEY = 'access-levels';

/**
 * Declares stable authorization levels. The persisted role name remains a
 * display value and is never used as an authorization decision.
 */
export const Roles = (...levels: AccessLevel[]) =>
  SetMetadata(ACCESS_LEVELS_KEY, levels);
