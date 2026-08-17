import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class GenerateOccurrencesDto {
  @ApiProperty({
    example: '2026-08-11',
  })
  @IsDateString()
  from!: string;

  @ApiProperty({
    example: '2026-08-31',
  })
  @IsDateString()
  to!: string;
}
