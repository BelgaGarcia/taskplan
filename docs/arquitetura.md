# Arquitetura e operação do TaskPlan

Este documento descreve a arquitetura implantada, o fluxo de entrega, a
persistência, o estado atual dos backups e os procedimentos manuais de
manutenção. Ele complementa o [guia de deploy](DEPLOYMENT.md) e a
[referência da API](api/API.md).

## Visão geral

O TaskPlan é um monorepo com frontend Angular, API NestJS e infraestrutura
Docker Compose. Em produção, os cinco serviços compartilham a rede Docker
`taskplan-network`:

```text
Navegador
   |
   | HTTP :5182
   v
Frontend Angular em Nginx
   |
   | HTTP :5183/api
   v
API NestJS
   |                    |
   | Prisma             | sessões de refresh token
   v                    v
PostgreSQL 17        Redis 7

Administração local do host: pgAdmin
Entrega: GitHub Actions -> runner taskplan-prod -> taskplan-deploy
```

PostgreSQL, Redis e pgAdmin ficam publicados somente no loopback do servidor.
Frontend e API são publicados no endereço de rede do host.

## Componentes

| Componente | Responsabilidade | Persistência | Exposição em produção |
| --- | --- | --- | --- |
| `frontend` | SPA Angular, autenticação no cliente, calendário e administração | Imagem imutável; configuração gerada na inicialização | `192.168.100.15:5182` |
| `backend` | API NestJS, regras de negócio, autenticação, autorização e Swagger | Imagem imutável | `192.168.100.15:5183`, prefixo `/api` |
| `postgres` | Fonte de verdade dos dados de negócio e auditoria | volume `taskplan-postgres-data` | somente `127.0.0.1:${POSTGRES_PORT}` |
| `redis` | Sessões de refresh token e invalidação de sessões | volume AOF `taskplan-redis-data` | somente `127.0.0.1:${REDIS_PORT}` |
| `pgadmin` | Administração manual do PostgreSQL | volume `taskplan-pgadmin-data` | somente `127.0.0.1:${PGADMIN_PORT}` |

Os containers usam `restart: unless-stopped`. PostgreSQL, Redis e backend têm
healthchecks. O frontend expõe `GET /healthz` pelo Nginx e depende do backend
saudável para ser promovido.

## Frontend

O frontend está em `frontend/`. As rotas públicas e protegidas são definidas
em `frontend/src/app/app.routes.ts`:

- `/login` é pública;
- as demais rotas exigem autenticação;
- cadastros administrativos e hierarquia de cargos exigem perfil de
  administrador;
- calendário, tarefas próprias e dashboard consomem a API REST.

O container não recebe segredos. Na inicialização,
`frontend/docker-entrypoint.sh` transforma `TASKPLAN_API_URL` e
`TASKPLAN_RELEASE` em `assets/runtime-config.js`. Assim, a mesma imagem pode
receber a URL da API e a versão da Release sem recompilar o Angular.

## Backend

O backend está em `backend/`, usa Node.js 24, NestJS 11, TypeScript e Prisma 7.
Todas as rotas recebem o prefixo `/api`. A aplicação aplica globalmente:

- validação com descarte proibido de campos desconhecidos;
- transformação de DTOs;
- filtro uniforme de exceções HTTP;
- CORS com a lista separada por vírgulas de `CORS_ORIGIN`;
- Swagger em `/docs`.

Os módulos principais são:

- `auth`: login, rotação de tokens, logout e alteração de senha;
- `users`, `roles` e `positions`: identidade, perfis e hierarquia de cargos;
- `functions`, `periodicities` e `holidays`: regras que sustentam tarefas;
- `tasks` e `task-occurrences`: planejamento, materialização, execução,
  reagendamento, continuidade, exclusões e calendário;
- `dashboard`: indicadores operacionais;
- `health`: disponibilidade da API;
- `PrismaModule` e `RedisModule`: acesso a dados e sessões.

### Autenticação e autorização

O access token JWT autoriza chamadas à API. O refresh token é rotacionado e
sua sessão é mantida no Redis com TTL. Logout, redefinição de senha e ações
administrativas podem invalidar sessões. Guards do NestJS aplicam autenticação
e perfil no servidor; guards do Angular controlam a navegação, mas não
substituem a autorização da API.

## Dados e persistência

O Prisma define e migra o modelo relacional. O PostgreSQL contém usuários,
perfis, cargos, heranças de cargo, funções, periodicidades, feriados, tarefas,
ocorrências, exclusões e auditoria. Migrations em `backend/prisma/migrations/`
são cumulativas e nunca devem ser alteradas depois de aplicadas.

Os três volumes nomeados sobrevivem à recriação dos containers e a
`docker compose down`. O comando `docker compose down -v` remove volumes e
pode apagar dados; ele não faz parte de nenhum procedimento normal.

Redis não é a fonte de verdade dos dados de negócio. A perda de seu volume
derruba sessões ativas, mas os cadastros permanecem no PostgreSQL. O volume do
pgAdmin guarda apenas a configuração da ferramenta administrativa.

## Configuração de produção

| Caminho | Finalidade |
| --- | --- |
| `/opt/taskplan/src/taskplan` | clone controlado usado para builds e migrations |
| `/etc/taskplan/taskplan.env` | credenciais e configuração protegida do ambiente |
| `/etc/taskplan/compose.yaml` | Compose aprovado e instalado por administrador |
| `/var/lib/taskplan/release.env` | versão atualmente promovida |
| `/var/lib/taskplan/current-release` | versão, SHA, imagens e data do último deploy |
| `/var/log/taskplan-deploy.log` | trilha operacional do deploy |
| `/usr/local/sbin/taskplan-deploy` | comando root-owned de promoção e rollback |
| `/var/backups/taskplan` | área reservada para backups do TaskPlan |

Mudanças em `compose.yaml` ou `ops/taskplan-deploy` no Git não substituem
automaticamente suas cópias protegidas em `/etc` e `/usr/local/sbin`. Um
administrador deve reinstalar explicitamente o layout antes de depender da
nova configuração.

## Entrega e deploy

O fluxo normal é:

```text
branch -> Pull Request -> TaskPlan quality -> merge em main
       -> Create TaskPlan release -> tag SemVer imutável
       -> TaskPlan production release -> runner taskplan-prod
       -> /usr/local/sbin/taskplan-deploy VERSION SHA
```

O workflow de qualidade executa actionlint e detecção de segredos sempre. De
acordo com os caminhos alterados, também executa lint, testes, builds, imagens
Docker, Playwright e validação do Compose.

O criador de releases interpreta Conventional Commits. `feat:` gera MINOR,
`fix:` e `perf:` geram PATCH e breaking changes geram MAJOR. Commits apenas de
documentação ou manutenção não criam Release.

O deploy valida SemVer, SHA, tag e ancestralidade em `main`, constrói imagens
versionadas, executa `prisma migrate deploy`, promove primeiro o backend e
depois o frontend e valida os dois healthchecks. PostgreSQL, Redis, pgAdmin e
seus volumes não são recriados.

### Rollback da aplicação

Se um healthcheck falhar depois da promoção, `taskplan-deploy` reaplica as
tags anteriores de backend e frontend. Esse rollback cobre somente a camada
de aplicação. Migrations são forward-only e dados não são revertidos. Por
isso, toda migration deve ser compatível com a versão imediatamente anterior
ou ter um plano coordenado de recuperação.

## Backups: estado atual

Na auditoria de 23/08/2026 não foi encontrada rotina de backup do TaskPlan nos
workflows, scripts do repositório, timers do systemd ou arquivos globais em
`/etc/cron.d`. O job `centrasa-backup` existente no servidor pertence a outro
sistema. O diretório `/var/backups/taskplan` foi reservado pelo bootstrap, mas
o `taskplan-deploy` atual não cria dumps nele.

Consequentemente:

- o volume `taskplan-postgres-data` fornece persistência, não backup;
- as imagens versionadas permitem rollback de código, não recuperação de
  dados;
- Redis usa AOF, mas isso não substitui backup do PostgreSQL;
- uma cópia externa, retenção automática e teste periódico de restauração
  ainda precisam ser implantados para existir proteção automatizada completa;
- o `crontab` de `root`, que exige elevação administrativa para leitura, deve
  ser conferido antes de concluir uma auditoria formal do host.

Backups nunca devem ser adicionados ao Git.

## Backup manual do PostgreSQL

Faça o backup antes de manutenção de banco, migration de risco ou restauração.
No servidor, a partir de uma conta com `sudo`:

```bash
BACKUP_DIR=/var/backups/taskplan/postgres
BACKUP_FILE="$BACKUP_DIR/taskplan-$(date -u +%Y%m%dT%H%M%SZ).dump"

sudo install -d -o root -g root -m 0700 "$BACKUP_DIR"
sudo docker exec taskplan-postgres sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' \
  | sudo tee "$BACKUP_FILE" >/dev/null
sudo chmod 0600 "$BACKUP_FILE"
sudo test -s "$BACKUP_FILE"
sudo cat "$BACKUP_FILE" | sudo docker exec -i taskplan-postgres pg_restore --list >/dev/null
echo "$BACKUP_FILE"
```

O último comando valida a estrutura do arquivo, mas uma restauração de teste
em banco isolado continua sendo a única prova completa. Copie o dump para um
destino externo controlado e aplique retenção; manter apenas arquivos no mesmo
disco do servidor não protege contra perda do host.

## Restauração manual do PostgreSQL

Restauração é destrutiva e exige janela de manutenção, arquivo validado e
aprovação explícita. Primeiro registre a release atual e crie um dump de
segurança. Depois:

```bash
cd /opt/taskplan/src/taskplan

sudo docker compose \
  --project-directory /opt/taskplan/src/taskplan \
  --env-file /etc/taskplan/taskplan.env \
  --env-file /var/lib/taskplan/release.env \
  -f /etc/taskplan/compose.yaml stop frontend backend

sudo cat /CAMINHO/backup-validado.dump \
  | sudo docker exec -i taskplan-postgres sh -c \
    'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-privileges'

sudo docker compose \
  --project-directory /opt/taskplan/src/taskplan \
  --env-file /etc/taskplan/taskplan.env \
  --env-file /var/lib/taskplan/release.env \
  -f /etc/taskplan/compose.yaml run --rm backend npx prisma migrate deploy

sudo docker compose \
  --project-directory /opt/taskplan/src/taskplan \
  --env-file /etc/taskplan/taskplan.env \
  --env-file /var/lib/taskplan/release.env \
  -f /etc/taskplan/compose.yaml up -d --no-deps backend frontend
```

Finalize validando `/api/health`, `/healthz`, login, versão exibida e uma
consulta funcional. Não apague o dump de segurança até a validação terminar.

## Manutenção manual do servidor

### Consultar estado e logs

```bash
sudo cat /var/lib/taskplan/current-release
sudo tail -n 200 /var/log/taskplan-deploy.log
sudo docker ps --filter name=taskplan
sudo docker logs --tail 200 taskplan-backend
sudo docker logs --tail 200 taskplan-frontend
curl --fail http://192.168.100.15:5183/api/health
curl --fail http://192.168.100.15:5182/healthz
```

### Reaplicar uma Release existente

Use somente uma tag estável que pertença à `main` e seu SHA completo:

```bash
sudo /usr/local/sbin/taskplan-deploy VERSION_SEM_PREFIXO_V SHA_COMPLETO
```

Exemplo de formato: `1.6.0` e um SHA hexadecimal de 40 caracteres. O comando
recusa versão, tag ou ancestralidade inconsistentes.

### Atualizar configuração protegida

Edite `/etc/taskplan/taskplan.env` com `sudoedit`, sem imprimir segredos no
terminal ou copiá-los para o repositório. Depois de mudar apenas CORS, recrie o
backend com o mesmo conjunto de arquivos de ambiente:

```bash
sudo docker compose \
  --project-directory /opt/taskplan/src/taskplan \
  --env-file /etc/taskplan/taskplan.env \
  --env-file /var/lib/taskplan/release.env \
  -f /etc/taskplan/compose.yaml up -d --no-deps --force-recreate backend
```

Valide healthcheck e preflight para cada origem autorizada.

### Instalar mudanças de Compose ou do mecanismo de deploy

Após o código aprovado estar no clone controlado, um administrador executa:

```bash
cd /opt/taskplan/src/taskplan
sudo ./ops/taskplan-install-production-layout
```

O bootstrap atualiza o clone, instala o Compose e o comando root-owned, valida
o sudoers restrito do runner e não recria os containers imediatamente. Em
seguida, reaplique uma Release existente ou aguarde a próxima Release.

### Espaço em disco

```bash
df -hT
sudo docker system df
sudo du -sh /var/lib/docker /var/backups/taskplan
```

Não execute `docker system prune --volumes`, `docker volume prune`,
`docker compose down -v` ou remoção manual dos volumes. A limpeza de imagens
antigas deve preservar ao menos a release atual e a anterior e ocorrer somente
depois de validar os backups.

## Checklist depois de manutenção

1. Containers esperados estão em execução e saudáveis.
2. API e frontend retornam HTTP 200 em seus healthchecks.
3. `runtime-config.js` contém a versão e a URL corretas.
4. Login e refresh token funcionam.
5. CORS devolve `Access-Control-Allow-Origin` para cada origem aprovada.
6. `/var/lib/taskplan/current-release` corresponde à Release esperada.
7. Logs não apresentam loop de reinício, erro de migration ou conexão.
8. Se houve alteração de dados, o backup e sua validação foram registrados fora
   do repositório.
