import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ListPositionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'infra',
    description: 'Pesquisa por nome ou descrição.',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Filtra cargos ativos ou inativos.',
  })
  @IsOptional()
  @Transform(({ value }): boolean | undefined => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;

    return value as boolean | undefined;
  })
  @IsBoolean()
  active?: boolean;
}
