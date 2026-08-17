import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({
    example: 'Conferir backup diário',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({
    example: 'Conferir execução e integridade do backup.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'ID da função vinculada.',
    format: 'uuid',
  })
  @IsUUID()
  functionId!: string;

  @ApiProperty({
    description: 'ID da periodicidade.',
    format: 'uuid',
  })
  @IsUUID()
  periodicityId!: string;

  @ApiPropertyOptional({
    description: 'ID do cargo responsável.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  responsiblePositionId?: string;

  @ApiPropertyOptional({
    description: 'ID do usuário responsável.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  responsibleUserId?: string;

  @ApiProperty({
    example: '2026-08-11',
  })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    example: '08:30',
    description: 'Horário no formato HH:mm.',
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'scheduledTime deve estar no formato HH:mm.',
  })
  scheduledTime?: string;

  @ApiPropertyOptional({
    example: 30,
    description: 'Duração estimada em minutos.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  estimatedDurationMinutes?: number;

  @ApiPropertyOptional({
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  mandatory?: boolean;

  @ApiPropertyOptional({
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({
    default: true,
    description:
      'Antecipar para dia útil anterior quando cair em fim de semana ou feriado.',
  })
  @IsOptional()
  @IsBoolean()
  advanceOnNonBusinessDay?: boolean;
}
