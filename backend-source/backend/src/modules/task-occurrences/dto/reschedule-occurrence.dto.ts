import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, Matches } from 'class-validator';

export class RescheduleOccurrenceDto {
  @ApiProperty({
    example: '2026-08-20',
  })
  @IsDateString()
  scheduledDate!: string;

  @ApiPropertyOptional({
    example: '09:30',
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'scheduledTime deve estar no formato HH:mm.',
  })
  scheduledTime?: string;
}
