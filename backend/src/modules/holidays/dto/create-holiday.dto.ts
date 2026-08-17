import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { HolidayType } from '../../../generated/prisma/client';

export class CreateHolidayDto {
  @ApiProperty({
    example: 'Natal',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiProperty({
    example: '2026-12-25',
  })
  @IsDateString()
  date!: string;

  @ApiProperty({
    enum: HolidayType,
    example: HolidayType.NATIONAL,
  })
  @IsEnum(HolidayType)
  type!: HolidayType;

  @ApiPropertyOptional({
    example: 'São Paulo',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  locality?: string;

  @ApiPropertyOptional({
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  recurringAnnual?: boolean;

  @ApiPropertyOptional({
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
