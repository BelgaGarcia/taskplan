export type AccessLevel = 'ADMIN' | 'OPERATOR';

export interface JwtPayload {
  sub: string;
  email: string;
  roleId: string;
  accessLevel: AccessLevel;
  positionId: string | null;
}

export interface RefreshJwtPayload {
  sub: string;
  sid: string;
}
