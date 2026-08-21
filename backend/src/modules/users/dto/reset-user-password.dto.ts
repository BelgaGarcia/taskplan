import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export enum PasswordResetMode {
  SET = 'SET',
  TEMPORARY = 'TEMPORARY',
}

export class ResetUserPasswordDto {
  @ApiProperty({ enum: PasswordResetMode })
  @IsEnum(PasswordResetMode)
  mode!: PasswordResetMode;

  @ApiPropertyOptional({
    example: 'SenhaForte123!',
    description: 'Obrigatória quando mode for SET.',
  })
  @ValidateIf((dto: ResetUserPasswordDto) => dto.mode === PasswordResetMode.SET)
  @IsString()
  @IsNotEmpty()
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
  password?: string;
}
