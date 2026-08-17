import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateFunctionDto {
  @ApiProperty({
    example: 'Fechamento financeiro',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({
    example: 'Responsável pelo processo de fechamento financeiro.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'ID do cargo responsável.',
  })
  @IsOptional()
  @IsUUID()
  responsiblePositionId?: string;

  @ApiPropertyOptional({
    description: 'ID do usuário responsável.',
  })
  @IsOptional()
  @IsUUID()
  responsibleUserId?: string;
}
