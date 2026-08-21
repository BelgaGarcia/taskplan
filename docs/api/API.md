# TaskPlan API
## Documentação de utilização da API

**Versão:** 1.0  
**Tecnologia:** NestJS + TypeScript + Prisma + PostgreSQL + Redis  
**Autenticação:** JWT Bearer Token  
**Prefixo global:** `/api`

---

# 1. Visão geral

A API do TaskPlan fornece recursos para:

- autenticação de usuários;
- renovação de sessão por refresh token;
- controle de acesso por perfil;
- gerenciamento de usuários;
- gerenciamento de cargos;
- gerenciamento de funções;
- configuração de periodicidades;
- cadastro de feriados;
- cadastro de tarefas;
- geração automática de ocorrências;
- execução e conclusão de ocorrências;
- reagendamento;
- calendário operacional;
- dashboard resumido;
- verificação de saúde da aplicação.

URL local padrão:

```text
http://localhost:3000
```

Base da API:

```text
http://localhost:3000/api
```

Swagger:

```text
http://localhost:3000/docs
```

Health check:

```text
http://localhost:3000/api/health
```

---

# 2. Autenticação

A maioria dos endpoints exige autenticação por JWT.

O token deve ser enviado no header:

```http
Authorization: Bearer SEU_ACCESS_TOKEN
```

Exemplo:

```http
GET /api/users
Authorization: Bearer eyJhbGciOi...
```

---

# 3. Login

## `POST /api/auth/login`

Autentica um usuário.

### Body

```json
{
  "email": "admin@empresa.com.br",
  "password": "TaskPlan123!"
}
```

### Resposta esperada

```json
{
  "accessToken": "JWT_ACCESS_TOKEN",
  "refreshToken": "JWT_REFRESH_TOKEN",
  "user": {
    "id": "uuid",
    "name": "Administrador TaskPlan",
    "email": "admin@empresa.com.br",
    "active": true,
    "role": {
      "id": "uuid",
      "name": "Administrador"
    },
    "position": {
      "id": "uuid",
      "name": "Administrador"
    }
  }
}
```

O access token possui duração limitada.

Configuração atual:

```text
JWT_ACCESS_EXPIRES_IN=15m
```

O refresh token possui duração configurável, atualmente:

```text
604800 segundos
```

equivalente a 7 dias.

---

# 4. Usuário autenticado

## `GET /api/auth/me`

Retorna os dados do usuário associado ao access token.

### Headers

```http
Authorization: Bearer ACCESS_TOKEN
```

### Resposta

```json
{
  "id": "uuid",
  "name": "Administrador TaskPlan",
  "email": "admin@empresa.com.br",
  "role": {
    "id": "uuid",
    "name": "Administrador"
  }
}
```

---

# 5. Refresh token

## `POST /api/auth/refresh`

Gera um novo access token e um novo refresh token.

O refresh token utilizado é invalidado após a renovação.

### Body

```json
{
  "refreshToken": "REFRESH_TOKEN_ATUAL"
}
```

### Comportamento

A API:

1. valida a assinatura do refresh token;
2. consulta a sessão correspondente no Redis;
3. valida o hash do token;
4. verifica se o usuário continua ativo;
5. invalida a sessão anterior;
6. gera novo access token;
7. gera novo refresh token;
8. cria uma nova sessão no Redis.

Isso significa que o refresh token possui **rotação**.

Um refresh token já utilizado não deve funcionar novamente.

---

# 6. Logout

## `POST /api/auth/logout`

Invalida a sessão associada ao refresh token.

### Body

```json
{
  "refreshToken": "REFRESH_TOKEN"
}
```

### Resposta

```text
204 No Content
```

O logout é tratado de maneira idempotente.

---

# 7. Health Check

## `GET /api/health`

Endpoint público para verificar a saúde da aplicação e a conexão com PostgreSQL.

### Exemplo

```http
GET http://localhost:3000/api/health
```

### Resposta esperada

```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "database": {
      "status": "up"
    }
  }
}
```

É o endpoint recomendado para health checks de infraestrutura.

---

# 8. Perfis / Roles

Base:

```text
/api/roles
```

Atualmente os endpoints administrativos são protegidos pelo perfil:

```text
Administrador
```

## Criar perfil

### `POST /api/roles`

```json
{
  "name": "Gestor",
  "description": "Perfil responsável pela gestão das atividades.",
  "active": true
}
```

---

## Listar perfis

### `GET /api/roles`

Parâmetros suportados:

```text
page
limit
search
active
```

Exemplo:

```text
GET /api/roles?page=1&limit=20&active=true
```

---

## Consultar perfil

### `GET /api/roles/:id`

Exemplo:

```text
GET /api/roles/UUID
```

---

## Atualizar perfil

### `PATCH /api/roles/:id`

```json
{
  "description": "Nova descrição"
}
```

---

## Inativar perfil

### `DELETE /api/roles/:id`

A exclusão é lógica.

O registro passa a:

```text
active = false
```

Um perfil associado a usuários ativos não pode ser inativado quando a regra de integridade correspondente impedir a operação.

---

# 9. Cargos / Positions

Base:

```text
/api/positions
```

## Criar cargo

### `POST /api/positions`

```json
{
  "name": "Analista de Infraestrutura",
  "description": "Responsável por rotinas de infraestrutura e suporte.",
  "active": true
}
```

---

## Listar

### `GET /api/positions`

Filtros:

```text
page
limit
search
active
```

---

## Consultar

### `GET /api/positions/:id`

---

## Atualizar

### `PATCH /api/positions/:id`

```json
{
  "name": "Analista Sênior de Infraestrutura"
}
```

---

## Inativar

### `DELETE /api/positions/:id`

A operação é lógica.

```text
active = false
```

---

# 10. Usuários

Base:

```text
/api/users
```

## Criar usuário

### `POST /api/users`

```json
{
  "name": "João da Silva",
  "email": "joao@empresa.com.br",
  "password": "Senha123",
  "roleId": "UUID_DO_PERFIL",
  "positionId": "UUID_DO_CARGO",
  "active": true
}
```

### Regras de senha

A senha deve possuir no mínimo:

- 8 caracteres;
- letra maiúscula;
- letra minúscula;
- número.

A senha é armazenada utilizando Argon2.

O campo `passwordHash` não é retornado pelos endpoints públicos.

---

## Listar usuários

### `GET /api/users`

Filtros de paginação e pesquisa estão disponíveis conforme o DTO configurado.

---

## Consultar usuário

### `GET /api/users/:id`

---

## Atualizar usuário

### `PATCH /api/users/:id`

Exemplo:

```json
{
  "name": "João Silva",
  "positionId": "UUID_DO_NOVO_CARGO"
}
```

Também é possível alterar a senha:

```json
{
  "password": "NovaSenha123"
}
```

---

## Inativar usuário

### `DELETE /api/users/:id`

A exclusão é lógica.

A API atualiza:

```text
active = false
deletedAt = data/hora atual
```

---

# 11. Funções

Base:

```text
/api/functions
```

Funções representam áreas ou grupos funcionais responsáveis por determinadas tarefas.

## Criar função

### `POST /api/functions`

```json
{
  "name": "Gestão de Backups",
  "description": "Acompanhamento, validação e controle das rotinas de backup.",
  "active": true
}
```

Também podem ser definidos responsáveis:

```json
{
  "name": "Rotinas de Infraestrutura",
  "responsiblePositionId": "UUID_DO_CARGO",
  "responsibleUserId": "UUID_DO_USUARIO",
  "active": true
}
```

Ambos são opcionais.

---

## Listar

### `GET /api/functions`

Filtros:

```text
page
limit
search
active
```

---

## Consultar

### `GET /api/functions/:id`

---

## Atualizar

### `PATCH /api/functions/:id`

---

## Inativar

### `DELETE /api/functions/:id`

---

# 12. Periodicidades

Base:

```text
/api/periodicities
```

Uma periodicidade define como as ocorrências de uma tarefa serão geradas.

## Tipos disponíveis

```text
DAILY
WEEKLY
BIWEEKLY
MONTHLY
BIMONTHLY
QUARTERLY
SEMIANNUAL
ANNUAL
SPECIFIC_WEEKDAYS
SPECIFIC_MONTH_DAY
FIRST_BUSINESS_DAY
LAST_BUSINESS_DAY
CUSTOM_INTERVAL
```

---

## Criar periodicidade diária

### `POST /api/periodicities`

```json
{
  "name": "Diária",
  "type": "DAILY",
  "interval": 1,
  "active": true
}
```

---

## Semanal

```json
{
  "name": "Semanal",
  "type": "WEEKLY",
  "interval": 1,
  "active": true
}
```

---

## Dias específicos da semana

```json
{
  "name": "Segunda, quarta e sexta",
  "type": "SPECIFIC_WEEKDAYS",
  "daysOfWeek": [
    1,
    3,
    5
  ],
  "interval": 1,
  "active": true
}
```

Convenção utilizada:

```text
1 = Segunda-feira
2 = Terça-feira
3 = Quarta-feira
4 = Quinta-feira
5 = Sexta-feira
6 = Sábado
7 = Domingo
```

---

## Dia específico do mês

```json
{
  "name": "Todo dia 10",
  "type": "SPECIFIC_MONTH_DAY",
  "dayOfMonth": 10,
  "interval": 1,
  "active": true
}
```

---

## Anual

```json
{
  "name": "Anual em dezembro",
  "type": "ANNUAL",
  "month": 12,
  "interval": 1,
  "active": true
}
```

---

# 13. Regra para dia inexistente

Periodicidades mensais podem utilizar:

```text
PREVIOUS_DAY
LAST_DAY_OF_MONTH
NEXT_MONTH
SKIP
```

Exemplo: uma tarefa configurada para dia 31 em fevereiro.

A estratégia configurada determina o comportamento do gerador.

---

# 14. Feriados

Base:

```text
/api/holidays
```

## Tipos

```text
NATIONAL
STATE
MUNICIPAL
INTERNAL
```

---

## Criar feriado

### `POST /api/holidays`

```json
{
  "name": "Natal",
  "date": "2026-12-25",
  "type": "NATIONAL",
  "recurringAnnual": true,
  "active": true
}
```

Exemplo municipal:

```json
{
  "name": "Aniversário do Município",
  "date": "2026-07-07",
  "type": "MUNICIPAL",
  "locality": "Cidade",
  "recurringAnnual": true,
  "active": true
}
```

A API impede duplicidade pela combinação lógica de:

```text
nome
data
tipo
localidade
```

Feriados recorrentes são considerados pela combinação de mês e dia no motor de dias úteis.

---

# 15. Tarefas

Base:

```text
/api/tasks
```

Uma tarefa é a definição permanente da atividade.

As ocorrências representam as execuções dessa tarefa em datas específicas.

---

## Criar tarefa

### `POST /api/tasks`

```json
{
  "name": "Conferir backup diário",
  "description": "Validar execução e integridade do backup.",
  "functionId": "UUID_DA_FUNCAO",
  "periodicityId": "UUID_DA_PERIODICIDADE",
  "responsiblePositionId": "UUID_DO_CARGO",
  "startDate": "2026-08-11",
  "endDate": "2026-12-31",
  "scheduledTime": "08:30",
  "estimatedDurationMinutes": 30,
  "mandatory": true,
  "active": true,
  "displayOrder": 1,
  "advanceOnNonBusinessDay": true
}
```

`responsibleUserId` também pode ser definido:

```json
{
  "responsibleUserId": "UUID_DO_USUARIO"
}
```

Ele é opcional.

---

## Campos principais

### `startDate`

Primeira data válida da tarefa.

### `endDate`

Última data válida.

Pode ser omitida.

### `scheduledTime`

Formato:

```text
HH:mm
```

Exemplo:

```text
08:30
```

### `estimatedDurationMinutes`

Tempo estimado em minutos.

### `mandatory`

Indica se a tarefa é obrigatória.

### `displayOrder`

Permite controlar ordem de apresentação.

### `advanceOnNonBusinessDay`

Quando:

```json
true
```

uma ocorrência prevista para sábado, domingo ou feriado é antecipada para o último dia útil disponível.

---

# 16. Listar tarefas

## `GET /api/tasks`

Filtros disponíveis:

```text
page
limit
search
functionId
periodicityId
responsiblePositionId
responsibleUserId
active
```

Exemplo:

```text
GET /api/tasks?active=true&functionId=UUID
```

---

# 17. Consultar tarefa

## `GET /api/tasks/:id`

Inclui relacionamentos como:

- função;
- periodicidade;
- cargo responsável;
- usuário responsável;
- quantidade de ocorrências.

---

# 18. Atualizar tarefa

## `PATCH /api/tasks/:id`

Exemplo:

```json
{
  "scheduledTime": "09:00",
  "estimatedDurationMinutes": 45
}
```

---

# 19. Inativar tarefa

## `DELETE /api/tasks/:id`

A tarefa não é fisicamente removida.

```text
active = false
```

---

# 20. Ocorrências de tarefas

Base:

```text
/api/task-occurrences
```

Uma ocorrência representa uma execução concreta de uma tarefa.

Exemplo:

```text
Tarefa:
Conferir backup diário

Ocorrências:
11/08/2026
12/08/2026
13/08/2026
...
```

---

# 21. Status de ocorrência

```text
PENDING
IN_PROGRESS
COMPLETED
FAILED
CANCELLED
```

---

# 22. Resultado da ocorrência

```text
SUCCESS
ERROR
PARTIAL
```

---

# 23. Gerar ocorrências

## `POST /api/task-occurrences/generate`

### Body

```json
{
  "from": "2026-08-11",
  "to": "2026-08-31"
}
```

### Exemplo de resposta

```json
{
  "from": "2026-08-11",
  "to": "2026-08-31",
  "tasksProcessed": 1,
  "occurrencesAttempted": 21,
  "occurrencesCreated": 21,
  "duplicatesSkipped": 0
}
```

Executando novamente:

```json
{
  "occurrencesAttempted": 21,
  "occurrencesCreated": 0,
  "duplicatesSkipped": 21
}
```

Isso ocorre porque existe uma restrição única por:

```text
taskId + originalDate
```

Portanto, a geração é idempotente para a mesma tarefa/data.

---

# 24. OriginalDate e ScheduledDate

Essa distinção é importante.

## `originalDate`

Data lógica gerada pela periodicidade.

## `scheduledDate`

Data efetiva da execução após ajuste de dias não úteis.

Exemplo:

```text
originalDate  = 2026-08-16
scheduledDate = 2026-08-14
```

16/08/2026 era domingo, portanto a execução foi antecipada para sexta-feira.

`originalDate` nunca deve ser alterada em um reagendamento.

---

# 25. Listar ocorrências

## `GET /api/task-occurrences`

Parâmetros:

```text
page
limit
from
to
status
taskId
responsibleUserId
```

Exemplo:

```text
GET /api/task-occurrences?from=2026-08-11&to=2026-08-31
```

Resposta paginada:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 21,
    "totalPages": 2
  }
}
```

---

# 26. Ocorrências atrasadas

Não existe um status `OVERDUE` no banco.

O atraso é calculado dinamicamente.

Uma ocorrência é considerada atrasada quando:

```text
status = PENDING
```

e:

```text
scheduledDate < data atual
```

A API acrescenta:

```json
{
  "overdue": true
}
```

---

# 27. Consultar ocorrência

## `GET /api/task-occurrences/:id`

Exemplo:

```text
GET /api/task-occurrences/78d5fc53-9f20-480d-bceb-8aa091493791
```

---

# 28. Iniciar ocorrência

## `PATCH /api/task-occurrences/:id/start`

Não possui body.

Exemplo:

```text
PATCH /api/task-occurrences/UUID/start
```

Transição:

```text
PENDING -> IN_PROGRESS
```

A API também preenche:

```text
startedAt
```

Exemplo:

```json
{
  "status": "IN_PROGRESS",
  "startedAt": "2026-08-16T15:15:49.557Z"
}
```

Uma ocorrência que já não está `PENDING` não pode ser iniciada novamente.

Resposta esperada:

```text
400 Bad Request
```

---

# 29. Concluir ocorrência com sucesso

## `PATCH /api/task-occurrences/:id/complete`

### Body

```json
{
  "result": "SUCCESS",
  "actualDurationMinutes": 25,
  "notes": "Backup conferido e validado."
}
```

Resultado:

```text
status = COMPLETED
result = SUCCESS
```

Também são preenchidos:

```text
completedAt
actualDurationMinutes
notes
```

---

# 30. Concluir com erro

```json
{
  "result": "ERROR",
  "actualDurationMinutes": 10,
  "notes": "Falha na execução do backup."
}
```

Resultado:

```text
status = FAILED
result = ERROR
```

---

# 31. Resultado parcial

Também é permitido:

```json
{
  "result": "PARTIAL",
  "notes": "Execução concluída parcialmente."
}
```

---

# 32. Reagendar ocorrência

## `PATCH /api/task-occurrences/:id/reschedule`

### Body

```json
{
  "scheduledDate": "2026-08-28",
  "scheduledTime": "10:00"
}
```

A operação modifica:

```text
scheduledDate
scheduledTime
```

mas preserva:

```text
originalDate
```

Ocorrências já finalizadas não podem ser reagendadas.

Isso inclui:

```text
COMPLETED
FAILED
CANCELLED
```

---

# 33. Excluir ocorrência da agenda

## `DELETE /api/task-occurrences/:id?scope=current`

Disponível apenas para administradores. O escopo padrão `current` remove somente a ocorrência selecionada do calendário, preserva o cadastro da tarefa e registra uma exclusão para que a geração idempotente não recrie essa data.

O escopo opcional `future` remove a ocorrência selecionada e as posteriores da mesma tarefa, ajustando a vigência da tarefa sem apagar seu cadastro.

---

# 34. Calendário

## `GET /api/task-occurrences/calendar`

Parâmetros obrigatórios:

```text
from
to
```

Exemplo:

```text
GET /api/task-occurrences/calendar?from=2026-08-11&to=2026-08-31
```

Filtros adicionais:

```text
taskId
responsibleUserId
status
```

Exemplo:

```text
GET /api/task-occurrences/calendar?from=2026-08-11&to=2026-08-31&status=PENDING
```

---

# 35. Estrutura do calendário

Exemplo:

```json
{
  "from": "2026-08-11",
  "to": "2026-08-31",
  "total": 21,
  "days": [
    {
      "date": "2026-08-14",
      "total": 3,
      "pending": 3,
      "inProgress": 0,
      "completed": 0,
      "failed": 0,
      "overdue": 3,
      "occurrences": []
    }
  ]
}
```

O agrupamento utiliza:

```text
scheduledDate
```

e não `originalDate`.

Por isso, uma sexta-feira pode conter:

```text
ocorrência da própria sexta
ocorrência originalmente prevista para sábado
ocorrência originalmente prevista para domingo
```

---

# 35. Dashboard

Base:

```text
/api/dashboard
```

## Resumo

### `GET /api/dashboard/summary`

Retorna indicadores gerais.

Exemplo:

```json
{
  "totals": {
    "pending": 15,
    "inProgress": 2,
    "completed": 3,
    "failed": 1,
    "overdue": 4
  },
  "today": {
    "date": "2026-08-16",
    "total": 3,
    "occurrences": []
  },
  "nextOccurrences": []
}
```

---

# 36. Significado dos indicadores

### `pending`

Ocorrências pendentes.

### `inProgress`

Ocorrências em execução.

### `completed`

Ocorrências concluídas.

### `failed`

Ocorrências finalizadas com erro.

### `overdue`

Ocorrências pendentes com data efetiva anterior à data atual.

### `today`

Ocorrências agendadas para o dia atual.

### `nextOccurrences`

Próximas ocorrências pendentes ou em andamento.

Atualmente são retornadas até 10 próximas ocorrências.

---

# 37. Paginação

Endpoints de listagem utilizam o padrão:

```text
page
limit
```

Exemplo:

```text
?page=1&limit=20
```

Formato típico:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

O limite máximo usado nos endpoints paginados é de até 100 registros por requisição quando definido pelo DTO correspondente.

---

# 38. Respostas de erro

A API utiliza formato padronizado.

## 400

```json
{
  "statusCode": 400,
  "message": "Mensagem de validação",
  "error": "Bad Request",
  "timestamp": "2026-08-16T15:18:35.587Z",
  "path": "/api/..."
}
```

---

## 401

Token ausente, inválido ou expirado.

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized",
  "timestamp": "...",
  "path": "/api/..."
}
```

---

## 403

Usuário autenticado, mas sem perfil necessário.

```text
403 Forbidden
```

---

## 404

Registro ou rota não encontrada.

```json
{
  "statusCode": 404,
  "message": "Ocorrência não encontrada.",
  "error": "Not Found",
  "timestamp": "...",
  "path": "/api/..."
}
```

---

## 409

Conflito de regra de negócio.

Exemplo:

```json
{
  "statusCode": 409,
  "message": "Este feriado já está cadastrado.",
  "error": "Conflict",
  "timestamp": "...",
  "path": "/api/..."
}
```

---

## 500

Erro inesperado do servidor.

Erros inesperados também são registrados pelo logger do NestJS.

---

# 39. Validação de campos

A API utiliza:

```text
class-validator
class-transformer
```

O ValidationPipe global está configurado para:

```text
whitelist = true
forbidNonWhitelisted = true
transform = true
```

Isso significa que campos desconhecidos enviados pelo cliente são rejeitados.

Exemplo:

```json
{
  "name": "Teste",
  "campoQueNaoExiste": "valor"
}
```

pode resultar em:

```text
400 Bad Request
```

---

# 40. Swagger

A documentação interativa está disponível em:

```text
http://localhost:3000/docs
```

Para autenticar:

1. execute `/api/auth/login`;
2. copie `accessToken`;
3. clique em **Authorize**;
4. informe o token;
5. execute os endpoints protegidos.

Dependendo da interface do Swagger, informe apenas o token ou o formato solicitado pelo diálogo de autenticação.

---

# 41. Insomnia / Postman

Após login, salve:

```text
accessToken
refreshToken
```

Configure:

```http
Authorization: Bearer {{ accessToken }}
```

e:

```http
Content-Type: application/json
```

para requisições com body JSON.

---

# 42. Variáveis de ambiente

Exemplo:

```env
DATABASE_URL=postgresql://taskplan:change_me@postgres:5432/taskplan?schema=public

PORT=3000
CORS_ORIGIN=https://app.exemplo.com

JWT_ACCESS_SECRET=change_me
JWT_ACCESS_EXPIRES_IN=15m

JWT_REFRESH_SECRET=change_me_too
JWT_REFRESH_EXPIRES_IN_SECONDS=604800

REDIS_URL=redis://redis:6379

POSTGRES_DB=taskplan
POSTGRES_USER=taskplan
POSTGRES_PASSWORD=change_me
POSTGRES_PORT=5432

REDIS_PORT=6379

PGADMIN_EMAIL=admin@example.com
PGADMIN_PASSWORD=change_me
PGADMIN_PORT=5050
```

O arquivo real `.env` não deve ser versionado.

Somente:

```text
.env.example
```

deve existir no Git.

---

# 43. Docker

Serviços atuais:

```text
taskplan-backend
taskplan-postgres
taskplan-redis
taskplan-pgadmin
```

Para iniciar:

```bash
docker compose up -d
```

Para conferir:

```bash
docker compose ps
```

---

# 44. Migrations

Em produção, execute antes de subir uma nova versão:

```bash
docker compose run --rm backend npx prisma migrate deploy
```

Não é recomendado executar migrations automaticamente no `CMD` principal do container.

---

# 45. Seed

Para criar registros iniciais:

```bash
docker compose run --rm backend npx prisma db seed
```

O seed atual cria ou garante registros básicos, incluindo:

- perfil Administrador;
- cargo Administrador;
- usuário administrador;
- periodicidade diária;
- periodicidade semanal;
- periodicidade mensal.

Os registros principais utilizam `upsert`, permitindo execução repetida sem duplicação.

---

# 46. Usuário inicial do ambiente de desenvolvimento

O seed configurado atualmente utiliza:

```text
E-mail:
admin@empresa.com.br
```

e uma senha inicial definida no seed.

**Para produção, a senha inicial deve ser alterada imediatamente ou parametrizada antes da implantação.**

Nunca utilize credenciais de desenvolvimento como credenciais definitivas de produção.

---

# 47. PostgreSQL

O PostgreSQL utiliza volume persistente:

```text
taskplan-postgres-data
```

Recriar o container não remove automaticamente esse volume.

Evite:

```bash
docker compose down -v
```

em produção, salvo se a intenção for realmente remover os volumes e seus dados.

---

# 48. Redis

Redis é utilizado principalmente para armazenar sessões de refresh token.

Formato conceitual das chaves:

```text
auth:session:<sessionId>
```

As sessões possuem TTL compatível com a validade do refresh token.

---

# 49. Segurança

Recomendações para produção:

- utilizar segredos JWT longos e aleatórios;
- utilizar senhas fortes no PostgreSQL;
- não expor PostgreSQL diretamente à internet;
- não expor Redis diretamente à internet;
- restringir pgAdmin;
- utilizar HTTPS;
- executar backend atrás de Nginx, Caddy ou outro proxy reverso;
- configurar corretamente `CORS_ORIGIN`;
- não versionar `.env`;
- trocar senha inicial do administrador;
- realizar backups periódicos do PostgreSQL.

---

# 50. Topologia recomendada de produção

```text
Internet
   |
   v
HTTPS :443
   |
   v
Nginx / Caddy
   |
   v
TaskPlan Backend :3000
   |
   +---- PostgreSQL :5432
   |
   +---- Redis :6379
```

PostgreSQL e Redis devem permanecer restritos à rede interna Docker.

---

# 51. Fluxo principal da aplicação

O fluxo conceitual é:

```text
Função
   |
   v
Tarefa
   |
   +---- Periodicidade
   |
   +---- Cargo responsável
   |
   +---- Usuário responsável
   |
   v
Gerador de ocorrências
   |
   v
PENDING
   |
   v
IN_PROGRESS
   |
   +---- SUCCESS -> COMPLETED
   |
   +---- PARTIAL -> COMPLETED
   |
   +---- ERROR -> FAILED
```

---

# 52. Fluxo recomendado para integração de frontend

## Inicialização

```text
POST /auth/login
```

Salvar:

```text
accessToken
refreshToken
```

## A cada requisição protegida

Enviar:

```http
Authorization: Bearer accessToken
```

## Quando o access token expirar

Executar:

```text
POST /auth/refresh
```

com:

```json
{
  "refreshToken": "..."
}
```

Substituir **os dois tokens** pelos novos valores retornados.

O refresh token anterior não deve continuar sendo utilizado.

## Logout

Executar:

```text
POST /auth/logout
```

e remover os tokens armazenados pelo cliente.

---

# 53. Fluxo recomendado de tarefas

O frontend administrativo pode seguir:

```text
1. cadastrar funções
2. cadastrar cargos
3. cadastrar usuários
4. cadastrar periodicidades
5. cadastrar feriados
6. cadastrar tarefas
7. gerar ocorrências
8. consultar calendário
9. acompanhar dashboard
```

---

# 54. Fluxo de execução

Para um executor:

```text
GET /task-occurrences
        |
        v
selecionar ocorrência PENDING
        |
        v
PATCH /:id/start
        |
        v
IN_PROGRESS
        |
        v
PATCH /:id/complete
        |
        +---- SUCCESS
        +---- PARTIAL
        +---- ERROR
```

---

# 55. Endpoints resumidos

## Auth

```text
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me
```

## Health

```text
GET    /api/health
```

## Roles

```text
POST   /api/roles
GET    /api/roles
GET    /api/roles/:id
PATCH  /api/roles/:id
DELETE /api/roles/:id
```

## Positions

```text
POST   /api/positions
GET    /api/positions
GET    /api/positions/:id
PATCH  /api/positions/:id
DELETE /api/positions/:id
```

## Users

```text
POST   /api/users
GET    /api/users
GET    /api/users/:id
PATCH  /api/users/:id
DELETE /api/users/:id
```

## Functions

```text
POST   /api/functions
GET    /api/functions
GET    /api/functions/:id
PATCH  /api/functions/:id
DELETE /api/functions/:id
```

## Periodicities

```text
POST   /api/periodicities
GET    /api/periodicities
GET    /api/periodicities/:id
PATCH  /api/periodicities/:id
DELETE /api/periodicities/:id
```

## Holidays

```text
POST   /api/holidays
GET    /api/holidays
GET    /api/holidays/:id
PATCH  /api/holidays/:id
DELETE /api/holidays/:id
```

## Tasks

```text
POST   /api/tasks
GET    /api/tasks
GET    /api/tasks/:id
PATCH  /api/tasks/:id
DELETE /api/tasks/:id
```

## Task Occurrences

```text
POST   /api/task-occurrences/generate

GET    /api/task-occurrences
GET    /api/task-occurrences/calendar
GET    /api/task-occurrences/:id

PATCH  /api/task-occurrences/:id/start
PATCH  /api/task-occurrences/:id/complete
PATCH  /api/task-occurrences/:id/reschedule
DELETE /api/task-occurrences/:id?scope=current
```

## Dashboard

```text
GET    /api/dashboard/summary
```

---

# 56. Checklist de validação de uma instalação

Após implantação:

```text
1. GET /api/health
2. POST /api/auth/login
3. GET /api/auth/me
4. GET /api/dashboard/summary
5. GET /api/tasks
6. GET /api/task-occurrences
7. GET /api/task-occurrences/calendar
```

Todos devem funcionar conforme as permissões do usuário utilizado.

---

# 57. Teste de geração

```http
POST /api/task-occurrences/generate
```

```json
{
  "from": "2026-08-01",
  "to": "2026-08-31"
}
```

Execute novamente o mesmo período.

Na segunda execução:

```text
occurrencesCreated = 0
duplicatesSkipped > 0
```

Isso confirma a proteção contra duplicidade.

---

# 58. Teste de ciclo de vida

Escolha uma ocorrência `PENDING`.

Execute:

```text
PATCH /task-occurrences/:id/start
```

Esperado:

```text
IN_PROGRESS
```

Depois:

```text
PATCH /task-occurrences/:id/complete
```

```json
{
  "result": "SUCCESS",
  "actualDurationMinutes": 20,
  "notes": "Executado com sucesso."
}
```

Esperado:

```text
COMPLETED
```

---

# 59. Teste de dia não útil

Crie uma tarefa diária com:

```json
{
  "advanceOnNonBusinessDay": true
}
```

Gere ocorrências incluindo sábado e domingo.

Exemplo esperado:

```text
sábado  -> sexta-feira
domingo -> sexta-feira
```

O campo:

```text
originalDate
```

continua representando sábado/domingo.

O campo:

```text
scheduledDate
```

representa sexta-feira.

---

# 60. Observações atuais do MVP

A API atual entrega o núcleo funcional do TaskPlan.

Recursos que não fazem parte do núcleo atual incluem integrações avançadas como:

- Microsoft Teams;
- Active Directory / Entra ID;
- anexos;
- workflow complexo de aprovação;
- notificações avançadas;
- relatórios PDF sofisticados.

Esses recursos podem ser acrescentados posteriormente sem necessidade de reconstrução do núcleo de tarefas e ocorrências.

---

# 61. Resumo arquitetural

```text
Cliente / Frontend
       |
       v
NestJS REST API
       |
       +---- JWT Authentication
       |
       +---- RBAC
       |
       +---- Prisma ORM
       |        |
       |        v
       |    PostgreSQL
       |
       +---- Redis
                |
                v
        Refresh Sessions
```

A API está estruturada de forma modular, com controllers responsáveis pela camada HTTP e services responsáveis pela lógica de negócio.

O acesso ao banco é centralizado pelo `PrismaService`.

---

# 62. Estado atual

A API possui, no estado atual:

```text
Autenticação             OK
JWT                      OK
Refresh Token            OK
Redis Session            OK
RBAC                     OK
Usuários                 OK
Perfis                   OK
Cargos                   OK
Funções                  OK
Periodicidades           OK
Feriados                 OK
Tarefas                  OK
Gerador de ocorrências   OK
Dias não úteis           OK
Start                    OK
Complete                 OK
Failed                   OK
Reschedule               OK
Calendário               OK
Dashboard                OK
Swagger                  OK
Health Check             OK
Prisma Migrations        OK
Seed                     OK
Docker                   OK
PostgreSQL               OK
Redis                    OK
pgAdmin                  OK
```

Essa documentação corresponde ao núcleo da API TaskPlan implementado até a versão atual.
---

# Contratos operacionais e autorização

## Níveis estáveis de acesso

Todo perfil possui `accessLevel`: `ADMIN` ou `OPERATOR`. O nível é incluído no JWT e não depende do nome editável do perfil. `POST`, `PATCH` e `DELETE` dos cadastros administrativos exigem `ADMIN`; as telas administrativas também são protegidas no cliente. O `DELETE` inativa o cadastro.

Dashboard, calendário e consultas de ocorrências exigem somente autenticação. O calendário continua no formato agrupado abaixo:

```json
{
  "from": "2026-08-01",
  "to": "2026-08-31",
  "days": [{ "date": "2026-08-20", "occurrences": [] }]
}
```

O dashboard usa `today.occurrences`, evitando um segundo formato concorrente.

## Ocorrências

`GET /api/task-occurrences/calendar` e `GET /api/task-occurrences` aceitam `functionId`, `responsibleUserId`, `status` e `scope=team|mine`. `GET /api/task-occurrences/filter-options` retorna somente IDs e nomes para os filtros. Cada ocorrência inclui `canOperate`.

Um administrador pode operar qualquer ocorrência. Um operador pode operar a responsabilidade direta; na falta dela, pode operar se seu cargo for o responsável. Ao iniciar, a API registra `executedByUserId` a partir do JWT. Após o início, somente esse executor ou um administrador pode concluir ou reagendar.

Transições válidas: `PENDING → IN_PROGRESS`, `PENDING → COMPLETED|FAILED` (conclusão direta) e `IN_PROGRESS → COMPLETED|FAILED`. Ocorrências `COMPLETED`, `FAILED` e `CANCELLED` são somente consulta. Reagendamento é permitido apenas em `PENDING` e `IN_PROGRESS` respeitando a autorização.

`POST /api/task-occurrences/generate` é idempotente, restrito a `ADMIN` e recebe `{ "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" }`.

As operações retornam `400` para formato ou transição inválida, `403` para falta de autorização, `404` para recursos inexistentes e `409` quando outra pessoa alterou a ocorrência durante a operação.

Campos relacionais opcionais de atualização aceitam `null`, incluindo cargo, usuário responsável e fim de vigência. Isso remove o vínculo sem exclusão física.
