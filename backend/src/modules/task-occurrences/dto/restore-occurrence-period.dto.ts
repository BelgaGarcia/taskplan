import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsDateString } from 'class-validator';

export class RestoreOccurrencePeriodDto {
  @ApiProperty({ example: '2026-09-01' })
  @IsDateString()
  from!: string;

  @ApiProperty({ example: '2026-09-30' })
  @IsDateString()
  to!: string;

  @ApiProperty({
    example: true,
    description:
      'Confirma explicitamente a restauraÃ§Ã£o destrutiva do perÃ­odo informado.',
  })
  @Equals(true, { message: 'confirm deve ser true para restaurar o perÃ­odo.' })
  confirm!: boolean;
}
