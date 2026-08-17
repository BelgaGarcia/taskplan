export interface JwtPayload {
  sub: string;
  email: string;
  roleId: string;
  role: string;
}

export interface RefreshJwtPayload {
  sub: string;
  sid: string;
}
