import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({
    example: 'Administrador',
    description: 'Nome único do perfil de acesso.',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    example: 'Acesso completo ao sistema.',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({
    enum: ['ADMIN', 'OPERATOR'],
    default: 'OPERATOR',
    description: 'Nível estável usado pelo JWT e pelas autorizações.',
  })
  @IsOptional()
  @IsIn(['ADMIN', 'OPERATOR'])
  accessLevel?: 'ADMIN' | 'OPERATOR';

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
