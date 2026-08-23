import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class ClearMonthQueryDto {
  @ApiProperty({ example: '2026-08' })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'month deve estar no formato YYYY-MM.',
  })
  month!: string;
}
