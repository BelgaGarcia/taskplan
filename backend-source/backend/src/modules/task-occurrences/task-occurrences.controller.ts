import {
  Body,
  Controller,
  Get,
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
import { CompleteOccurrenceDto } from './dto/complete-occurrence.dto';
import { GenerateOccurrencesDto } from './dto/generate-occurrences.dto';
import { ListOccurrencesQueryDto } from './dto/list-occurrences-query.dto';
import { RescheduleOccurrenceDto } from './dto/reschedule-occurrence.dto';
import { OccurrenceGeneratorService } from './occurrence-generator.service';
import { TaskOccurrencesService } from './task-occurrences.service';
import { CalendarQueryDto } from './dto/calendar-query.dto';
@ApiTags('Ocorrências de tarefas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Administrador')
@Controller('task-occurrences')
export class TaskOccurrencesController {
  constructor(
    private readonly service: TaskOccurrencesService,
    private readonly generator: OccurrenceGeneratorService,
  ) {}

  @Post('generate')
  @ApiOperation({
    summary: 'Gerar ocorrências de tarefas',
  })
  generate(@Body() dto: GenerateOccurrencesDto) {
    return this.generator.generate(dto.from, dto.to);
  }

  @Get()
  findAll(@Query() query: ListOccurrencesQueryDto) {
    return this.service.findAll(query);
  }
  @Get('calendar')
  @ApiOperation({
    summary: 'Consultar calendário de ocorrências',
  })
  calendar(@Query() query: CalendarQueryDto) {
    return this.service.calendar(query);
  }
  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe())
    id: string,
  ) {
    return this.service.findOne(id);
  }

  @Patch(':id/start')
  start(
    @Param('id', new ParseUUIDPipe())
    id: string,
  ) {
    return this.service.start(id);
  }

  @Patch(':id/complete')
  complete(
    @Param('id', new ParseUUIDPipe())
    id: string,
    @Body() dto: CompleteOccurrenceDto,
  ) {
    return this.service.complete(id, dto);
  }

  @Patch(':id/reschedule')
  reschedule(
    @Param('id', new ParseUUIDPipe())
    id: string,
    @Body() dto: RescheduleOccurrenceDto,
  ) {
    return this.service.reschedule(id, dto);
  }
}
