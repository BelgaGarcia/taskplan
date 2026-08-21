import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class DeleteOccurrenceDto {
  @ApiPropertyOptional({ enum: ['current', 'future'], default: 'current' })
  @IsOptional()
  @IsIn(['current', 'future'])
  scope: 'current' | 'future' = 'current';
}
