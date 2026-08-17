import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'João da Silva',
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiProperty({
    example: 'joao.silva@empresa.com.br',
  })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({
    example: 'SenhaForte123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/[A-Z]/, {
    message: 'A senha deve possuir pelo menos uma letra maiúscula.',
  })
  @Matches(/[a-z]/, {
    message: 'A senha deve possuir pelo menos uma letra minúscula.',
  })
  @Matches(/[0-9]/, {
    message: 'A senha deve possuir pelo menos um número.',
  })
  password!: string;

  @ApiProperty({
    description: 'ID do perfil de acesso.',
    format: 'uuid',
  })
  @IsUUID()
  roleId!: string;

  @ApiPropertyOptional({
    description: 'ID do cargo.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  positionId?: string;

  @ApiPropertyOptional({
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
