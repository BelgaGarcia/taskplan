# Frontend TaskPlan — infraestrutura

A origem interna aprovada é `http://192.168.100.15:5182`; o container `taskplan-frontend` escuta em `8080`, responde `GET /healthz` e encaminha `/api/*` para o serviço `backend` na rede do Compose.

A imagem é stateless e não recebe credenciais de banco, Redis ou Docker. Na inicialização, ela gera `/assets/runtime-config.js` com `apiUrl: "/api"`; assim, o navegador usa a mesma origem pública pela qual carregou o frontend e não tenta alcançar endereços privados. O backend continua privado na rede do Compose.

O workflow de qualidade roda em PR e `main`; deploy só é acionado por Release estável SemVer. O runner dedicado tem labels `self-hosted`, `linux`, `x64`, `taskplan-prod`, não participa do grupo Docker e pode usar exclusivamente o comando root-owned `/usr/local/sbin/taskplan-frontend-deploy`.

O comando valida SemVer, SHA completo, tag e ancestralidade em `main`, preserva a imagem anterior, recria somente o frontend, aguarda healthcheck e smoke test. Em falha restaura a versão anterior. Ele nunca executa migrations, backup/restore, `compose down -v` nem toca PostgreSQL/Redis.

## Pendências reais

- Relatórios e Configurações não possuem endpoints documentados: telas exibem pendência, sem dados simulados.
- O refresh token é retornado no corpo pela API. O frontend não o persiste, mas a migração futura para cookie HttpOnly permanece recomendada.
