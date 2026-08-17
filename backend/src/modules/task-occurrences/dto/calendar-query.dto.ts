import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { TaskOccurrenceStatus } from '../../../generated/prisma/client';

export class CalendarQueryDto {
  @ApiProperty({
    example: '2026-08-01',
  })
  @IsDateString()
  from!: string;

  @ApiProperty({
    example: '2026-08-31',
  })
  @IsDateString()
  to!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  taskId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  responsibleUserId?: string;

  @ApiPropertyOptional({
    enum: TaskOccurrenceStatus,
  })
  @IsOptional()
  @IsEnum(TaskOccurrenceStatus)
  status?: TaskOccurrenceStatus;
}
