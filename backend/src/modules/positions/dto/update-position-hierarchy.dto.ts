import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsUUID, ValidateNested } from 'class-validator';

export class PositionInheritanceDto {
  @IsUUID()
  positionId!: string;

  @IsUUID()
  inheritedPositionId!: string;
}

export class UpdatePositionHierarchyDto {
  @ApiProperty({ type: [PositionInheritanceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PositionInheritanceDto)
  inheritances!: PositionInheritanceDto[];
}
