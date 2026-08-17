import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'admin@empresa.com.br',
  })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({
    example: 'TaskPlan123!',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}
