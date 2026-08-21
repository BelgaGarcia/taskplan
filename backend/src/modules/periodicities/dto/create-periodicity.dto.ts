import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  NonexistentDayRule,
  PeriodicityType,
} from '../../../generated/prisma/client';

export class CreatePeriodicityDto {
  @ApiProperty({
    example: 'Mensal',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    enum: PeriodicityType,
    example: PeriodicityType.MONTHLY,
  })
  @IsEnum(PeriodicityType)
  type!: PeriodicityType;

  @ApiPropertyOptional({
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  interval?: number;

  @ApiPropertyOptional({
    example: [1, 3, 5],
    description: '1=segunda ... 7=domingo',
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  daysOfWeek?: number[];

  @ApiPropertyOptional({
    example: 15,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @ApiPropertyOptional({
    example: 10,
    description:
      'Dia inicial da faixa mensal (obrigatório para MONTHLY_DAY_RANGE).',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  startDayOfMonth?: number;

  @ApiPropertyOptional({
    example: 17,
    description:
      'Dia final da faixa mensal (obrigatório para MONTHLY_DAY_RANGE).',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  endDayOfMonth?: number;

  @ApiPropertyOptional({
    example: 12,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({
    enum: NonexistentDayRule,
    default: NonexistentDayRule.PREVIOUS_DAY,
  })
  @IsOptional()
  @IsEnum(NonexistentDayRule)
  nonexistentDayRule?: NonexistentDayRule;

  @ApiPropertyOptional({
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
