import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { TaskOccurrenceStatus } from '../../../generated/prisma/client';

export class CalendarQueryDto {
  @ApiProperty({ example: '2026-08-01' })
  @IsDateString()
  from!: string;

  @ApiProperty({ example: '2026-08-31' })
  @IsDateString()
  to!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  taskId?: string;

  @ApiPropertyOptional({ description: 'Filtra pela função da tarefa.' })
  @IsOptional()
  @IsUUID()
  functionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  responsibleUserId?: string;

  @ApiPropertyOptional({ enum: TaskOccurrenceStatus })
  @IsOptional()
  @IsEnum(TaskOccurrenceStatus)
  status?: TaskOccurrenceStatus;

  @ApiPropertyOptional({ enum: ['team', 'mine'], default: 'team' })
  @IsOptional()
  @IsIn(['team', 'mine'])
  scope: 'team' | 'mine' = 'team';
}
