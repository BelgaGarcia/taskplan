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
import { CreateFunctionDto } from './dto/create-function.dto';
import { ListFunctionsQueryDto } from './dto/list-functions-query.dto';
import { UpdateFunctionDto } from './dto/update-function.dto';
import { FunctionsService } from './functions.service';

@ApiTags('Funções')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Administrador')
@Controller('functions')
export class FunctionsController {
  constructor(private readonly functionsService: FunctionsService) {}

  @Post()
  @ApiOperation({
    summary: 'Cadastrar uma função',
  })
  @ApiCreatedResponse({
    description: 'Função cadastrada com sucesso.',
  })
  @ApiConflictResponse({
    description: 'Já existe uma função com o mesmo nome.',
  })
  create(@Body() dto: CreateFunctionDto) {
    return this.functionsService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar funções',
  })
  findAll(@Query() query: ListFunctionsQueryDto) {
    return this.functionsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Consultar uma função',
  })
  @ApiNotFoundResponse({
    description: 'Função não encontrada.',
  })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.functionsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar uma função',
  })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateFunctionDto,
  ) {
    return this.functionsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Inativar uma função',
  })
  deactivate(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.functionsService.deactivate(id);
  }
}
