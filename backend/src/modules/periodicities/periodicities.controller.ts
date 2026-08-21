import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreatePeriodicityDto } from './dto/create-periodicity.dto';
import { ListPeriodicitiesQueryDto } from './dto/list-periodicities-query.dto';
import { UpdatePeriodicityDto } from './dto/update-periodicity.dto';
import { PeriodicitiesService } from './periodicities.service';

@ApiTags('Periodicidades')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('periodicities')
export class PeriodicitiesController {
  constructor(private readonly periodicitiesService: PeriodicitiesService) {}

  @Post()
  @ApiOperation({
    summary: 'Cadastrar periodicidade',
  })
  create(@Body() dto: CreatePeriodicityDto) {
    return this.periodicitiesService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListPeriodicitiesQueryDto) {
    return this.periodicitiesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.periodicitiesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePeriodicityDto,
  ) {
    return this.periodicitiesService.update(id, dto);
  }

  @Patch(':id/reactivate')
  @ApiOperation({
    summary: 'Reativar periodicidade e gerar novamente a agenda futura',
  })
  reactivate(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.periodicitiesService.reactivate(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  deactivate(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.periodicitiesService.deactivate(id);
  }
}
