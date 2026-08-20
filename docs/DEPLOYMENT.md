# Fluxo de release e deploy do TaskPlan

## Automação

Nenhum push publica produção diretamente. Um merge em `main` inicia `TaskPlan quality`. O monorepo mantém Angular em `frontend/`, NestJS/Prisma em `backend/` e infraestrutura na raiz. A qualidade detecta os caminhos alterados e executa somente as validações de frontend, backend ou Compose necessárias; a auditoria de workflows e segredos continua obrigatória. Somente se esse workflow terminar verde, `Create TaskPlan release` avalia os commits ainda não liberados e cria uma Release GitHub estável e imutável. A publicação da Release aciona `TaskPlan production release`, que repete a validação completa dos dois serviços e despacha exclusivamente versão e SHA ao runner `taskplan-prod`.

A etapa de produção executa apenas `sudo -n /usr/local/sbin/taskplan-deploy VERSION SHA`. Esse comando é root-owned e recria somente backend e frontend. PostgreSQL, Redis, volumes e pgAdmin não são recriados pelo deploy.

## Convenção de commits e SemVer

A Release automática usa Conventional Commits entre a última tag e `main`:

- `fix:` ou `perf:` cria PATCH: `v0.1.1` → `v0.1.2`.
- `feat:` cria MINOR: `v0.1.1` → `v0.2.0`.
- `tipo!:` ou texto `BREAKING CHANGE:` cria MAJOR: `v0.1.1` → `v1.0.0`.
- `docs:`, `chore:`, `ci:`, `test:` e demais tipos sem impacto funcional não criam Release.

O commit que é liberado precisa estar em `main`; tags existentes nunca são reescritas. Uma falha de deploy mantém a Release como evidência imutável e uma correção gera a próxima versão, como ocorreu entre `v0.1.0` e `v0.1.1`.

## Ordem operacional

1. Criar branch e Pull Request.
2. O workflow de qualidade executa lint, testes, builds e a imagem Nginx do frontend quando `frontend/**` muda; Prisma, testes e build do NestJS quando `backend/**` muda; e Compose quando sua configuração muda. Actionlint e auditoria de segredos sempre são executados.
3. Após aprovação e merge em `main`, a automação cria uma Release somente para mudanças `fix`, `perf`, `feat` ou breaking.
4. A Release valida novamente o código, cria imagens versionadas, executa `prisma migrate deploy`, promove backend e frontend e verifica os healthchecks.
5. Se um healthcheck falhar após a promoção, o comando restaura as imagens anteriores de backend e frontend. Migrations são forward-only e não restauram dados automaticamente.

## Evidências e consulta

- Aplicação: `http://192.168.100.15:5182/login`
- Health do frontend: `http://192.168.100.15:5182/healthz`
- Health da API: `http://192.168.100.15:5183/api/health`
- Repositório, releases e histórico: `https://github.com/BelgaGarcia/taskplan`
- Actions: `https://github.com/BelgaGarcia/taskplan/actions`

Mudanças no próprio mecanismo root-owned (`ops/taskplan-deploy`) requerem instalação explícita por administrador no host. Isso é intencional: uma Release de aplicação não pode modificar automaticamente as permissões root do servidor.

## Regressão visual do login

O comando `npm run test:ui`, executado no diretório `frontend/`, usa Playwright contra a imagem Nginx produzida pelo Docker. Ele cobre os viewports 320, 375, 768 e 1440 px, garantindo ausência de rolagem horizontal e sobreposição entre a apresentação e o formulário de login. Localmente, instale o Chromium uma vez com `npx playwright install chromium` e exponha a imagem em `TASKPLAN_UI_BASE_URL` (o CI faz isso automaticamente).
