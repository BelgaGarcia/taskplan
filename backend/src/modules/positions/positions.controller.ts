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
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreatePositionDto } from './dto/create-position.dto';
import { ListPositionsQueryDto } from './dto/list-positions-query.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { PositionsService } from './positions.service';

@ApiTags('Cargos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Administrador')
@Controller('positions')
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar um cargo' })
  @ApiCreatedResponse({ description: 'Cargo cadastrado com sucesso.' })
  @ApiConflictResponse({
    description: 'Já existe um cargo com o mesmo nome.',
  })
  create(@Body() createPositionDto: CreatePositionDto) {
    return this.positionsService.create(createPositionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar cargos' })
  findAll(@Query() query: ListPositionsQueryDto) {
    return this.positionsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar um cargo' })
  @ApiNotFoundResponse({ description: 'Cargo não encontrado.' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.positionsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar um cargo' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updatePositionDto: UpdatePositionDto,
  ) {
    return this.positionsService.update(id, updatePositionDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inativar um cargo' })
  deactivate(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.positionsService.deactivate(id);
  }
}
