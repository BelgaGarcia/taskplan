import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class ListOccurrenceExclusionsQueryDto {
  @ApiProperty({ example: '2026-09-01' })
  @IsDateString()
  from!: string;

  @ApiProperty({ example: '2026-09-30' })
  @IsDateString()
  to!: string;
}
