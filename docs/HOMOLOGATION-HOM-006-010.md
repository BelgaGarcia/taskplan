# HOM-006 a HOM-010

## Periodicidades

`MONTHLY_DAY_RANGE` gera os dias válidos entre `startDayOfMonth` e
`endDayOfMonth` de cada mês. Dias inexistentes não são transportados para o
mês seguinte. Para `WEEKLY`, novas periodicidades exigem ao menos um item em
`daysOfWeek` (1=segunda, 7=domingo); registros WEEKLY legados sem dias mantêm
temporariamente o intervalo legado baseado na data inicial, mas ao serem
editados precisam receber dias.

Ao alterar ou inativar uma periodicidade, apenas ocorrências `PENDING` com
`originalDate >= hoje` são removidas. O horizonte que já estava materializado
é regenerado por tarefa; ocorrências concluídas, falhas e em andamento nunca
são reconstruídas.

## Exclusões e auditoria

`DELETE /task-occurrences/:id?scope=current|future` exige ADMIN. `current`
cria uma exclusão persistente por `taskId + originalDate`, portanto a geração
idempotente não recria a ocorrência. `future` encerra a vigência da tarefa no
dia anterior à data original escolhida (ou a inativa quando o corte é inicial)
e preserva o histórico. Ambas as ações registram `AuditLog`.

## Hierarquia de cargos

`GET /positions/hierarchy` consulta e `PATCH /positions/hierarchy` substitui
a matriz administrativa. Uma linha significa o cargo que herda e uma coluna o
cargo herdado. Auto-herança e ciclos são recusados; as permissões são
transitivas. Uma atribuição direta de usuário continua tendo precedência sobre
qualquer herança de cargo.

## Cabeçalho

A pesquisa do cabeçalho é de navegação: mostra apenas rotas permitidas para o
usuário atual. As notificações usam a quantidade real de ocorrências atrasadas
do resumo do dashboard; sem alertas, o badge é zero e o painel informa o
estado vazio.
