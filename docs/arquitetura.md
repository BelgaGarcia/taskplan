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
| `frontend` | SPA Angular, autenticação no cliente, calendário, administração e proxy `/api` para o backend | Imagem imutável; configuração gerada na inicialização | `192.168.100.15:5182` |
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
`frontend/docker-entrypoint.sh` publica `TASKPLAN_RELEASE` e configura a API
como `/api` em `assets/runtime-config.js`. O Nginx encaminha esse caminho ao
serviço `backend` pela rede privada do Compose, mantendo a mesma origem no
navegador mesmo quando o frontend é acessado por diferentes IPs ou DNS.

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

## Backup automatizado do PostgreSQL

O PostgreSQL é a fonte de verdade restaurável. Redis contém sessões que podem
ser invalidadas e o volume do pgAdmin contém apenas configuração administrativa;
por isso, ambos ficam fora do backup. O volume do PostgreSQL fornece
persistência, mas não substitui os dumps.

`taskplan-backup` cria um conjunto root-only em
`/var/backups/taskplan/postgres`. Cada conjunto contém `database.dump` no
formato custom do PostgreSQL, `SHA256SUMS` e metadados operacionais sem
credenciais. O dump só recebe seu nome definitivo depois de estar não vazio,
passar por `pg_restore --list` e ter o checksum calculado.

O timer `taskplan-backup.timer` executa diariamente às 03:00 no fuso
`America/Sao_Paulo`, com atraso aleatório fixo de até 15 minutos e recuperação
de uma execução perdida após reinicialização. O deploy também cria um backup
obrigatório depois do build e antes de `prisma migrate deploy`. Falha no backup
interrompe o deploy antes da migration.

Backup, drill e deploy usam `/run/lock/taskplan-maintenance.lock`, portanto não
podem disputar os mesmos dados. Conjuntos com mais de sete dias são removidos
somente após a conclusão de um novo backup válido. A meta inicial é RPO de até
24 horas e RTO de até quatro horas.

Esta primeira versão mantém cópias sem criptografia no mesmo host. Permissões
`0700` no diretório e `0600` nos arquivos reduzem exposição acidental, mas não
protegem contra comprometimento ou perda do servidor. Cópia externa,
criptografia e alerta fora do host continuam sendo riscos operacionais
explícitos. Backups nunca devem ser adicionados ao Git.

### Consultar e executar o backup

```bash
sudo systemctl status taskplan-backup.timer --no-pager
sudo systemctl list-timers taskplan-backup.timer --no-pager
sudo journalctl -u taskplan-backup.service -n 100 --no-pager
sudo cat /var/lib/taskplan/backup-status
sudo /usr/local/sbin/taskplan-backup scheduled
```

O comando manual usa o mesmo lock, validação e retenção do timer. O runner de
produção não recebe permissão direta para executá-lo; somente o comando
root-owned de deploy pode solicitar o modo `pre-deploy`.

### Drill mensal isolado

Uma vez por mês e após instalar a rotina pela primeira vez, um administrador
deve selecionar um conjunto validado e executar:

```bash
sudo /usr/local/sbin/taskplan-backup drill \
  /var/backups/taskplan/postgres/CONJUNTO_VALIDADO
sudo cat /var/lib/taskplan/restore-drill-status
```

O drill confere o checksum, restaura em um container PostgreSQL efêmero sem
rede, valida que o schema público foi criado e sempre remove o container. Ele
não altera a instância de produção. A duração deve permanecer abaixo do RTO de
quatro horas; login e fluxos funcionais ainda devem ser validados no processo
controlado de restauração quando aplicável.

## Restauração manual do PostgreSQL

Restauração é destrutiva e exige janela de manutenção, arquivo validado,
aprovação explícita e plano de retorno. Use uma sessão root dedicada, mantenha
o lock até o fim e crie primeiro um backup preventivo:

```bash
sudo -i
exec 9>/run/lock/taskplan-maintenance.lock
flock -n 9 || exit 1

TASKPLAN_MAINTENANCE_LOCK_HELD=1 \
  /usr/local/sbin/taskplan-backup scheduled

cd /opt/taskplan/src/taskplan

docker compose \
  --project-directory /opt/taskplan/src/taskplan \
  --env-file /etc/taskplan/taskplan.env \
  --env-file /var/lib/taskplan/release.env \
  -f /etc/taskplan/compose.yaml stop frontend backend

cd /var/backups/taskplan/postgres/CONJUNTO_VALIDADO
sha256sum --check SHA256SUMS

docker exec -i taskplan-postgres sh -c \
    'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-privileges' \
  < database.dump

docker compose \
  --project-directory /opt/taskplan/src/taskplan \
  --env-file /etc/taskplan/taskplan.env \
  --env-file /var/lib/taskplan/release.env \
  -f /etc/taskplan/compose.yaml run --rm backend npx prisma migrate deploy

docker compose \
  --project-directory /opt/taskplan/src/taskplan \
  --env-file /etc/taskplan/taskplan.env \
  --env-file /var/lib/taskplan/release.env \
  -f /etc/taskplan/compose.yaml up -d --no-deps backend frontend
```

Finalize validando `/api/health`, `/healthz`, login, versão exibida e uma
consulta funcional. Só encerre a sessão root para liberar o lock depois do
aceite; não apague o dump preventivo até a validação terminar.

## Manutenção manual do servidor

### Consultar estado e logs

```bash
sudo cat /var/lib/taskplan/current-release
sudo cat /var/lib/taskplan/backup-status
sudo cat /var/lib/taskplan/restore-drill-status
sudo tail -n 200 /var/log/taskplan-deploy.log
sudo journalctl -u taskplan-backup.service -n 100 --no-pager
sudo docker ps --filter name=taskplan
sudo docker logs --tail 200 taskplan-backend
sudo docker logs --tail 200 taskplan-frontend
curl --fail http://192.168.100.15:5183/api/health
curl --fail http://192.168.100.15:5182/healthz
curl --fail http://192.168.100.15:5182/api/health
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

O bootstrap atualiza o clone, instala o Compose, os comandos root-owned e o
timer de backup, valida o sudoers restrito do runner e não recria os containers
imediatamente. Depois da primeira instalação, execute um backup e um drill
manuais antes de depender da rotina; em seguida, reaplique uma Release
existente ou aguarde a próxima Release.

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
8. O último backup está válido e dentro do RPO; o drill mensal permanece dentro
   do RTO e suas evidências sanitizadas foram registradas fora do repositório.
