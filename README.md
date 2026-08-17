# TaskPlan

API backend do **TaskPlan**, sistema para gerenciamento, planejamento e acompanhamento de tarefas recorrentes.

O projeto permite cadastrar tarefas, definir responsÃ¡veis e periodicidades, considerar feriados e dias nÃ£o Ãºteis, gerar automaticamente ocorrÃªncias, acompanhar execuÃ§Ãµes e consultar calendÃ¡rio e indicadores.

O backend estÃ¡ preparado para execuÃ§Ã£o atravÃ©s de Docker, utilizando PostgreSQL e Redis.

---

## VisÃ£o geral

O TaskPlan possui atualmente um MVP de backend com os seguintes recursos:

* autenticaÃ§Ã£o JWT;
* refresh token com sessÃµes armazenadas no Redis;
* controle de acesso por perfil;
* gerenciamento de usuÃ¡rios;
* gerenciamento de cargos;
* gerenciamento de funÃ§Ãµes;
* cadastro de periodicidades;
* cadastro de feriados;
* gerenciamento de tarefas;
* geraÃ§Ã£o automÃ¡tica de ocorrÃªncias;
* tratamento de finais de semana e feriados;
* inÃ­cio e conclusÃ£o de ocorrÃªncias;
* registro de falhas;
* reagendamento;
* identificaÃ§Ã£o de tarefas atrasadas;
* calendÃ¡rio operacional;
* dashboard;
* Swagger;
* health check;
* migrations e seed;
* execuÃ§Ã£o completa via Docker Compose.

---

## Tecnologias

### Backend

* Node.js 24
* NestJS 11
* TypeScript
* Prisma ORM 7
* PostgreSQL 17
* Redis
* Argon2
* JWT
* Swagger

### Infraestrutura

* Docker
* Docker Compose
* pgAdmin

---

## Arquitetura

Fluxo simplificado:

```text
Frontend
   |
   v
TaskPlan API
   |
   +---- PostgreSQL
   |
   +---- Redis
```

O PostgreSQL armazena os dados permanentes da aplicaÃ§Ã£o.

O Redis Ã© utilizado principalmente para controle das sessÃµes de refresh token.

---

## Estrutura principal

```text
TaskPlan/
â”œâ”€â”€ backend/
â”‚   â”œâ”€â”€ prisma/
â”‚   â”‚   â”œâ”€â”€ migrations/
â”‚   â”‚   â”œâ”€â”€ schema.prisma
â”‚   â”‚   â””â”€â”€ seed.ts
â”‚   â”‚
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ common/
â”‚   â”‚   â”œâ”€â”€ database/
â”‚   â”‚   â”œâ”€â”€ generated/
â”‚   â”‚   â””â”€â”€ modules/
â”‚   â”‚
â”‚   â”œâ”€â”€ Dockerfile
â”‚   â”œâ”€â”€ .dockerignore
â”‚   â””â”€â”€ package.json
â”‚
â”œâ”€â”€ docs/
â”‚   â””â”€â”€ API.md
â”‚
â”œâ”€â”€ compose.yaml
â”œâ”€â”€ .env.example
â””â”€â”€ README.md
```

---

# Preparando o ambiente

## 1. Requisitos

Para executar o projeto utilizando Docker, Ã© necessÃ¡rio possuir:

* Git
* Docker
* Docker Compose

Para desenvolvimento local do backend tambÃ©m Ã© recomendado:

* Node.js 24
* npm

---

# Clonando o projeto

```bash
git clone https://github.com/moliveira035/taskplan.git
cd taskplan
```

---

# ConfiguraÃ§Ã£o das variÃ¡veis de ambiente

O arquivo `.env` real nÃ£o Ã© versionado no Git.

Crie uma cÃ³pia do arquivo de exemplo.

### Windows PowerShell

```powershell
Copy-Item .env.example .env
```

### Linux

```bash
cp .env.example .env
```

Depois edite o `.env` com os valores necessÃ¡rios para o ambiente.

Exemplo:

```env
DATABASE_URL=postgresql://taskplan:SENHA@postgres:5432/taskplan?schema=public

PORT=3000
CORS_ORIGIN=http://localhost:5173

JWT_ACCESS_SECRET=ALTERAR
JWT_ACCESS_EXPIRES_IN=15m

JWT_REFRESH_SECRET=ALTERAR
JWT_REFRESH_EXPIRES_IN_SECONDS=604800

REDIS_URL=redis://redis:6379

POSTGRES_DB=taskplan
POSTGRES_USER=taskplan
POSTGRES_PASSWORD=ALTERAR
POSTGRES_PORT=5432

REDIS_PORT=6379

PGADMIN_EMAIL=admin@example.com
PGADMIN_PASSWORD=ALTERAR
PGADMIN_PORT=5050
```

Nunca envie o arquivo `.env` para o repositÃ³rio.

---

# Subindo o ambiente com Docker

Na raiz do projeto:

```bash
docker compose build
```

Depois:

```bash
docker compose up -d
```

Confira os serviÃ§os:

```bash
docker compose ps
```

O ambiente deverÃ¡ possuir:

```text
taskplan-backend
taskplan-postgres
taskplan-redis
taskplan-pgadmin
```

PostgreSQL e Redis devem aparecer como:

```text
healthy
```

---

# Preparando o banco de dados

ApÃ³s subir os containers, execute as migrations:

```bash
docker compose run --rm backend npx prisma migrate deploy
```

As migrations criam toda a estrutura necessÃ¡ria no PostgreSQL.

---

# Executando o seed

Para criar os registros iniciais:

```bash
docker compose run --rm backend npx prisma db seed
```

O seed prepara dados bÃ¡sicos como:

* perfil Administrador;
* cargo Administrador;
* usuÃ¡rio administrador;
* periodicidade diÃ¡ria;
* periodicidade semanal;
* periodicidade mensal.

O seed utiliza `upsert`, portanto pode ser executado novamente sem duplicar os registros principais.

As credenciais iniciais utilizadas em desenvolvimento devem ser verificadas no ambiente/seed e alteradas antes de qualquer implantaÃ§Ã£o de produÃ§Ã£o.

---

# URLs disponÃ­veis

## API

```text
http://localhost:3000
```

## Swagger

```text
http://localhost:3000/docs
```

## Health Check

```text
http://localhost:3000/api/health
```

## pgAdmin

```text
http://localhost:5050
```

---

# Testando se a API estÃ¡ funcionando

ApÃ³s subir os containers:

```text
GET http://localhost:3000/api/health
```

A API deverÃ¡ retornar status saudÃ¡vel.

TambÃ©m Ã© possÃ­vel verificar os logs:

```bash
docker compose logs backend --tail=100
```

Para acompanhar continuamente:

```bash
docker compose logs -f backend
```

---

# Principais mÃ³dulos da API

## AutenticaÃ§Ã£o

```text
/api/auth
```

ResponsÃ¡vel por:

* login;
* refresh token;
* logout;
* usuÃ¡rio autenticado.

---

## UsuÃ¡rios

```text
/api/users
```

---

## Perfis

```text
/api/roles
```

---

## Cargos

```text
/api/positions
```

---

## FunÃ§Ãµes

```text
/api/functions
```

---

## Periodicidades

```text
/api/periodicities
```

---

## Feriados

```text
/api/holidays
```

---

## Tarefas

```text
/api/tasks
```

---

## OcorrÃªncias

```text
/api/task-occurrences
```

Inclui:

* geraÃ§Ã£o;
* listagem;
* inÃ­cio;
* conclusÃ£o;
* falha;
* reagendamento;
* calendÃ¡rio.

---

## Dashboard

```text
/api/dashboard
```

---

# DocumentaÃ§Ã£o completa da API

A documentaÃ§Ã£o detalhada dos endpoints deve ficar em:

```text
docs/API.md
```

TambÃ©m pode ser consultada interativamente atravÃ©s do Swagger:

```text
http://localhost:3000/docs
```

---

# Fluxo de autenticaÃ§Ã£o para o frontend

O frontend deverÃ¡ inicialmente realizar:

```text
POST /api/auth/login
```

A resposta fornece:

```text
accessToken
refreshToken
```

O `accessToken` deve ser enviado nas requisiÃ§Ãµes protegidas:

```http
Authorization: Bearer ACCESS_TOKEN
```

Quando o access token expirar:

```text
POST /api/auth/refresh
```

O backend utiliza rotaÃ§Ã£o de refresh tokens. Portanto, apÃ³s renovar a sessÃ£o, o frontend deve substituir **tanto o access token quanto o refresh token** pelos novos valores.

No logout:

```text
POST /api/auth/logout
```

os tokens armazenados no frontend devem ser removidos.

---

# Desenvolvimento do frontend

O frontend pode ser desenvolvido separadamente do backend.

Com o ambiente Docker em execuÃ§Ã£o, a API fica disponÃ­vel em:

```text
http://localhost:3000/api
```

Durante desenvolvimento local, configure a aplicaÃ§Ã£o frontend para utilizar essa URL como base da API.

Exemplo:

```text
VITE_API_URL=http://localhost:3000/api
```

O valor utilizado no frontend dependerÃ¡ da tecnologia adotada.

---

# CORS

O backend utiliza a variÃ¡vel:

```env
CORS_ORIGIN=http://localhost:5173
```

Caso o frontend rode em outra porta, atualize essa variÃ¡vel.

Por exemplo:

```env
CORS_ORIGIN=http://localhost:3001
```

Depois reinicie o backend:

```bash
docker compose up -d --force-recreate backend
```

---

# Desenvolvimento local do backend

Caso seja necessÃ¡rio executar o backend fora do Docker:

```bash
cd backend
npm install
npx prisma generate
npm run start:dev
```

Nesse cenÃ¡rio, atenÃ§Ã£o Ã s URLs de PostgreSQL e Redis.

Quando o backend roda localmente, normalmente utiliza:

```text
localhost
```

Quando roda dentro do Docker, utiliza os nomes dos serviÃ§os:

```text
postgres
redis
```

---

# ValidaÃ§Ã£o do backend

Dentro da pasta `backend`:

```bash
npm run lint
npm run build
npm run test
```

---

# Atualizando o projeto

Para receber alteraÃ§Ãµes do repositÃ³rio:

```bash
git pull
```

Caso existam alteraÃ§Ãµes no backend:

```bash
docker compose build backend
```

Aplique novas migrations:

```bash
docker compose run --rm backend npx prisma migrate deploy
```

Depois recrie o serviÃ§o:

```bash
docker compose up -d backend
```

---

# Parando os serviÃ§os

```bash
docker compose down
```

Os volumes do PostgreSQL e Redis permanecem preservados.

---

# AtenÃ§Ã£o ao banco de dados

NÃ£o utilize:

```bash
docker compose down -v
```

sem saber exatamente o que estÃ¡ fazendo.

A opÃ§Ã£o `-v` remove os volumes associados e pode apagar o banco PostgreSQL.

Para apenas parar os containers, use:

```bash
docker compose down
```

---

# Banco de desenvolvimento

Ao clonar o projeto em outra mÃ¡quina, os dados existentes no banco de outro desenvolvedor **nÃ£o sÃ£o transferidos automaticamente**.

O novo ambiente recebe:

* estrutura do banco por migrations;
* registros iniciais por seed.

Isso Ã© o comportamento esperado para desenvolvimento.

Caso seja necessÃ¡rio replicar exatamente um banco existente, deve ser utilizado backup/restore do PostgreSQL separadamente.

Backups de banco nÃ£o devem ser armazenados no repositÃ³rio Git.

---

# ProduÃ§Ã£o

Antes de subir o projeto em produÃ§Ã£o:

* utilizar senhas fortes;
* alterar secrets JWT;
* alterar credenciais administrativas iniciais;
* configurar corretamente `CORS_ORIGIN`;
* utilizar HTTPS;
* nÃ£o expor PostgreSQL publicamente;
* nÃ£o expor Redis publicamente;
* restringir acesso ao pgAdmin;
* executar `prisma migrate deploy`;
* definir rotina de backup do PostgreSQL.

Arquitetura recomendada:

```text
Internet
   |
 HTTPS
   |
Nginx / Caddy
   |
TaskPlan API
   |
   +---- PostgreSQL
   |
   +---- Redis
```

---

# Status atual do MVP

O MVP do backend possui:

```text
AutenticaÃ§Ã£o JWT           OK
Refresh Token              OK
Redis Sessions             OK
RBAC                       OK
UsuÃ¡rios                   OK
Perfis                     OK
Cargos                     OK
FunÃ§Ãµes                    OK
Periodicidades             OK
Feriados                   OK
Tarefas                    OK
OcorrÃªncias                OK
Dias nÃ£o Ãºteis             OK
Reagendamento              OK
CalendÃ¡rio                 OK
Dashboard                  OK
Swagger                    OK
Health Check               OK
Migrations                 OK
Seed                       OK
Docker                     OK
PostgreSQL                 OK
Redis                      OK
```

---

# Fluxo inicial para um novo desenvolvedor

Depois de clonar o repositÃ³rio:

```text
1. Criar .env a partir de .env.example
2. docker compose build
3. docker compose up -d
4. executar prisma migrate deploy
5. executar prisma db seed
6. acessar /api/health
7. acessar /docs
8. realizar login
9. iniciar desenvolvimento do frontend
```

Com isso, cada desenvolvedor possui seu prÃ³prio ambiente completo do TaskPlan, incluindo API, PostgreSQL e Redis, sem precisar instalar manualmente cada serviÃ§o na mÃ¡quina.

## Production release and rollback

A stable GitHub Release named `vMAJOR.MINOR.PATCH` runs the complete quality gate again and then dispatches only the version and full commit SHA to the dedicated `taskplan-prod` runner. The runner can invoke only `/usr/local/sbin/taskplan-deploy` through sudo.

The root-owned command builds immutable versioned images for both services, runs `prisma migrate deploy`, promotes backend then frontend, verifies `http://192.168.100.15:5183/api/health` and `http://192.168.100.15:5182/healthz`, and records the release in `/var/lib/taskplan/current-release`.

If an application healthcheck fails after promotion, it restores the previous frontend and backend image tags. Prisma migrations are deliberately forward-only: an application rollback does not restore or modify PostgreSQL/Redis data. Every migration released to production must therefore remain compatible with the immediately preceding application version until a coordinated recovery plan is approved.

The initial host migration preserves the currently running images as `bootstrap-legacy` and does not recreate any service. It must be executed by an administrator from the supplied bootstrap script; the first GitHub Release performs the actual promotion.

Consulte [o fluxo operacional de release e deploy](docs/DEPLOYMENT.md).
