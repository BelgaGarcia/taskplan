# TaskPlan

API backend do **TaskPlan**, sistema para gerenciamento, planejamento e acompanhamento de tarefas recorrentes.

O projeto permite cadastrar tarefas, definir responsáveis e periodicidades, considerar feriados e dias não úteis, gerar automaticamente ocorrências, acompanhar execuções e consultar calendário e indicadores.

O backend está preparado para execução através de Docker, utilizando PostgreSQL e Redis.

---

## Visão geral

O TaskPlan possui atualmente um MVP de backend com os seguintes recursos:

* autenticação JWT;
* refresh token com sessões armazenadas no Redis;
* controle de acesso por perfil;
* gerenciamento de usuários;
* gerenciamento de cargos;
* gerenciamento de funções;
* cadastro de periodicidades;
* cadastro de feriados;
* gerenciamento de tarefas;
* geração automática de ocorrências;
* tratamento de finais de semana e feriados;
* início e conclusão de ocorrências;
* registro de falhas;
* reagendamento;
* identificação de tarefas atrasadas;
* calendário operacional;
* dashboard;
* Swagger;
* health check;
* migrations e seed;
* execução completa via Docker Compose.

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

O PostgreSQL armazena os dados permanentes da aplicação.

O Redis é utilizado principalmente para controle das sessões de refresh token.

---

## Estrutura principal

```text
TaskPlan/
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   │
│   ├── src/
│   │   ├── common/
│   │   ├── database/
│   │   ├── generated/
│   │   └── modules/
│   │
│   ├── Dockerfile
│   ├── .dockerignore
│   └── package.json
│
├── docs/
│   └── API.md
│
├── compose.yaml
├── .env.example
└── README.md
```

---

# Preparando o ambiente

## 1. Requisitos

Para executar o projeto utilizando Docker, é necessário possuir:

* Git
* Docker
* Docker Compose

Para desenvolvimento local do backend também é recomendado:

* Node.js 24
* npm

---

# Clonando o projeto

```bash
git clone https://github.com/moliveira035/taskplan.git
cd taskplan
```

---

# Configuração das variáveis de ambiente

O arquivo `.env` real não é versionado no Git.

Crie uma cópia do arquivo de exemplo.

### Windows PowerShell

```powershell
Copy-Item .env.example .env
```

### Linux

```bash
cp .env.example .env
```

Depois edite o `.env` com os valores necessários para o ambiente.

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

Nunca envie o arquivo `.env` para o repositório.

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

Confira os serviços:

```bash
docker compose ps
```

O ambiente deverá possuir:

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

Após subir os containers, execute as migrations:

```bash
docker compose run --rm backend npx prisma migrate deploy
```

As migrations criam toda a estrutura necessária no PostgreSQL.

---

# Executando o seed

Para criar os registros iniciais:

```bash
docker compose run --rm backend npx prisma db seed
```

O seed prepara dados básicos como:

* perfil Administrador;
* cargo Administrador;
* usuário administrador;
* periodicidade diária;
* periodicidade semanal;
* periodicidade mensal.

O seed utiliza `upsert`, portanto pode ser executado novamente sem duplicar os registros principais.

As credenciais iniciais utilizadas em desenvolvimento devem ser verificadas no ambiente/seed e alteradas antes de qualquer implantação de produção.

---

# URLs disponíveis

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

# Testando se a API está funcionando

Após subir os containers:

```text
GET http://localhost:3000/api/health
```

A API deverá retornar status saudável.

Também é possível verificar os logs:

```bash
docker compose logs backend --tail=100
```

Para acompanhar continuamente:

```bash
docker compose logs -f backend
```

---

# Principais módulos da API

## Autenticação

```text
/api/auth
```

Responsável por:

* login;
* refresh token;
* logout;
* usuário autenticado.

---

## Usuários

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

## Funções

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

## Ocorrências

```text
/api/task-occurrences
```

Inclui:

* geração;
* listagem;
* início;
* conclusão;
* falha;
* reagendamento;
* calendário.

---

## Dashboard

```text
/api/dashboard
```

---

# Documentação completa da API

A documentação detalhada dos endpoints deve ficar em:

```text
docs/API.md
```

Também pode ser consultada interativamente através do Swagger:

```text
http://localhost:3000/docs
```

---

# Fluxo de autenticação para o frontend

O frontend deverá inicialmente realizar:

```text
POST /api/auth/login
```

A resposta fornece:

```text
accessToken
refreshToken
```

O `accessToken` deve ser enviado nas requisições protegidas:

```http
Authorization: Bearer ACCESS_TOKEN
```

Quando o access token expirar:

```text
POST /api/auth/refresh
```

O backend utiliza rotação de refresh tokens. Portanto, após renovar a sessão, o frontend deve substituir **tanto o access token quanto o refresh token** pelos novos valores.

No logout:

```text
POST /api/auth/logout
```

os tokens armazenados no frontend devem ser removidos.

---

# Desenvolvimento do frontend

O frontend pode ser desenvolvido separadamente do backend.

Com o ambiente Docker em execução, a API fica disponível em:

```text
http://localhost:3000/api
```

Durante desenvolvimento local, configure a aplicação frontend para utilizar essa URL como base da API.

Exemplo:

```text
VITE_API_URL=http://localhost:3000/api
```

O valor utilizado no frontend dependerá da tecnologia adotada.

---

# CORS

O backend utiliza a variável:

```env
CORS_ORIGIN=http://localhost:5173
```

Caso o frontend rode em outra porta, atualize essa variável.

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

Caso seja necessário executar o backend fora do Docker:

```bash
cd backend
npm install
npx prisma generate
npm run start:dev
```

Nesse cenário, atenção às URLs de PostgreSQL e Redis.

Quando o backend roda localmente, normalmente utiliza:

```text
localhost
```

Quando roda dentro do Docker, utiliza os nomes dos serviços:

```text
postgres
redis
```

---

# Validação do backend

Dentro da pasta `backend`:

```bash
npm run lint
npm run build
npm run test
```

---

# Atualizando o projeto

Para receber alterações do repositório:

```bash
git pull
```

Caso existam alterações no backend:

```bash
docker compose build backend
```

Aplique novas migrations:

```bash
docker compose run --rm backend npx prisma migrate deploy
```

Depois recrie o serviço:

```bash
docker compose up -d backend
```

---

# Parando os serviços

```bash
docker compose down
```

Os volumes do PostgreSQL e Redis permanecem preservados.

---

# Atenção ao banco de dados

Não utilize:

```bash
docker compose down -v
```

sem saber exatamente o que está fazendo.

A opção `-v` remove os volumes associados e pode apagar o banco PostgreSQL.

Para apenas parar os containers, use:

```bash
docker compose down
```

---

# Banco de desenvolvimento

Ao clonar o projeto em outra máquina, os dados existentes no banco de outro desenvolvedor **não são transferidos automaticamente**.

O novo ambiente recebe:

* estrutura do banco por migrations;
* registros iniciais por seed.

Isso é o comportamento esperado para desenvolvimento.

Caso seja necessário replicar exatamente um banco existente, deve ser utilizado backup/restore do PostgreSQL separadamente.

Backups de banco não devem ser armazenados no repositório Git.

---

# Produção

Antes de subir o projeto em produção:

* utilizar senhas fortes;
* alterar secrets JWT;
* alterar credenciais administrativas iniciais;
* configurar corretamente `CORS_ORIGIN`;
* utilizar HTTPS;
* não expor PostgreSQL publicamente;
* não expor Redis publicamente;
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
Autenticação JWT           OK
Refresh Token              OK
Redis Sessions             OK
RBAC                       OK
Usuários                   OK
Perfis                     OK
Cargos                     OK
Funções                    OK
Periodicidades             OK
Feriados                   OK
Tarefas                    OK
Ocorrências                OK
Dias não úteis             OK
Reagendamento              OK
Calendário                 OK
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

Depois de clonar o repositório:

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

Com isso, cada desenvolvedor possui seu próprio ambiente completo do TaskPlan, incluindo API, PostgreSQL e Redis, sem precisar instalar manualmente cada serviço na máquina.

## Production release and rollback

A stable GitHub Release named `vMAJOR.MINOR.PATCH` runs the complete quality gate again and then dispatches only the version and full commit SHA to the dedicated `taskplan-prod` runner. The runner can invoke only `/usr/local/sbin/taskplan-deploy` through sudo.

The root-owned command builds immutable versioned images for both services, runs `prisma migrate deploy`, promotes backend then frontend, verifies `http://192.168.100.15:5183/api/health` and `http://192.168.100.15:5182/healthz`, and records the release in `/var/lib/taskplan/current-release`.

If an application healthcheck fails after promotion, it restores the previous frontend and backend image tags. Prisma migrations are deliberately forward-only: an application rollback does not restore or modify PostgreSQL/Redis data. Every migration released to production must therefore remain compatible with the immediately preceding application version until a coordinated recovery plan is approved.

The initial host migration preserves the currently running images as `bootstrap-legacy` and does not recreate any service. It must be executed by an administrator from the supplied bootstrap script; the first GitHub Release performs the actual promotion.