import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token da sessão.',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
