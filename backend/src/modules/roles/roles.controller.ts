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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateRoleDto } from './dto/create-role.dto';
import { ListRolesQueryDto } from './dto/list-roles-query.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
@ApiTags('Perfis de acesso')
@Controller('roles')
@ApiTags('Perfis de acesso')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @ApiOperation({
    summary: 'Cadastrar um perfil de acesso',
  })
  @ApiCreatedResponse({
    description: 'Perfil cadastrado com sucesso.',
  })
  @ApiConflictResponse({
    description: 'Já existe um perfil com o mesmo nome.',
  })
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar perfis de acesso',
  })
  @ApiOkResponse({
    description: 'Perfis encontrados.',
  })
  findAll(@Query() query: ListRolesQueryDto) {
    return this.rolesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Consultar um perfil pelo identificador',
  })
  @ApiOkResponse({
    description: 'Perfil encontrado.',
  })
  @ApiNotFoundResponse({
    description: 'Perfil não encontrado.',
  })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar um perfil de acesso',
  })
  @ApiOkResponse({
    description: 'Perfil atualizado com sucesso.',
  })
  @ApiNotFoundResponse({
    description: 'Perfil não encontrado.',
  })
  @ApiConflictResponse({
    description: 'Já existe um perfil com o mesmo nome.',
  })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.rolesService.update(id, updateRoleDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Inativar um perfil de acesso',
  })
  @ApiOkResponse({
    description: 'Perfil inativado com sucesso.',
  })
  @ApiNotFoundResponse({
    description: 'Perfil não encontrado.',
  })
  @ApiConflictResponse({
    description: 'O perfil possui usuários ativos vinculados.',
  })
  deactivate(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.rolesService.deactivate(id);
  }
}
