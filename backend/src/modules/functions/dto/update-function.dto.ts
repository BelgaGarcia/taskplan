import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { CreateFunctionDto } from './create-function.dto';

export class UpdateFunctionDto extends PartialType(
  OmitType(CreateFunctionDto, [
    'responsiblePositionId',
    'responsibleUserId',
  ] as const),
) {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  responsiblePositionId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  responsibleUserId?: string | null;
}
