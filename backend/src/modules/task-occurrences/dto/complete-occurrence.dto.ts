import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { TaskOccurrenceResult } from '../../../generated/prisma/client';

export class CompleteOccurrenceDto {
  @ApiProperty({
    enum: TaskOccurrenceResult,
  })
  @IsEnum(TaskOccurrenceResult)
  result!: TaskOccurrenceResult;

  @ApiPropertyOptional({
    example: 25,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  actualDurationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
