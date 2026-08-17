import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from '../auth/guards/jwt-auth.guard';
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
@Controller('task-occurrences')
export class TaskOccurrencesController {
  constructor(
    private readonly service: TaskOccurrencesService,
    private readonly generator: OccurrenceGeneratorService,
  ) {}

  @Post('generate')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Gerar agenda de ocorrências (idempotente)' })
  generate(@Body() dto: GenerateOccurrencesDto) {
    return this.generator.generate(dto.from, dto.to);
  }

  @Get('filter-options')
  @ApiOperation({ summary: 'Listar opções leves dos filtros operacionais' })
  filterOptions() {
    return this.service.filterOptions();
  }

  @Get()
  @ApiOperation({ summary: 'Listar ocorrências da equipe ou do usuário' })
  findAll(
    @Query() query: ListOccurrencesQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.findAll(query, request.user!);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Consultar calendário agrupado por dia' })
  calendar(
    @Query() query: CalendarQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.calendar(query, request.user!);
  }

  @Get(':id')
  @ApiNotFoundResponse({ description: 'Ocorrência não encontrada.' })
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.findOne(id, request.user);
  }

  @Patch(':id/start')
  @ApiBadRequestResponse({ description: 'Transição ou dados inválidos.' })
  @ApiForbiddenResponse({
    description: 'Usuário não é responsável pela ocorrência.',
  })
  @ApiNotFoundResponse({ description: 'Ocorrência não encontrada.' })
  @ApiConflictResponse({ description: 'Ocorrência alterada por outra pessoa.' })
  @ApiOperation({ summary: 'Iniciar uma ocorrência atribuída' })
  start(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.start(id, request.user!);
  }

  @Patch(':id/complete')
  @ApiBadRequestResponse({ description: 'Transição ou dados inválidos.' })
  @ApiForbiddenResponse({
    description: 'Usuário não é responsável pela ocorrência.',
  })
  @ApiNotFoundResponse({ description: 'Ocorrência não encontrada.' })
  @ApiConflictResponse({ description: 'Ocorrência alterada por outra pessoa.' })
  @ApiOperation({ summary: 'Concluir uma ocorrência atribuída' })
  complete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CompleteOccurrenceDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.complete(id, dto, request.user!);
  }

  @Patch(':id/reschedule')
  @ApiBadRequestResponse({ description: 'Transição ou dados inválidos.' })
  @ApiForbiddenResponse({
    description: 'Usuário não é responsável pela ocorrência.',
  })
  @ApiNotFoundResponse({ description: 'Ocorrência não encontrada.' })
  @ApiConflictResponse({ description: 'Ocorrência alterada por outra pessoa.' })
  @ApiOperation({ summary: 'Reagendar uma ocorrência atribuída' })
  reschedule(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: RescheduleOccurrenceDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.service.reschedule(id, dto, request.user!);
  }
}
