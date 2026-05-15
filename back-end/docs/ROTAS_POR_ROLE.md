# Rotas da API por papel (`RoleUser`)

Referência para o front-end: **base da API** ` /api` (ex.: `GET https://host/api/auth/me`).  
Todas as rotas abaixo (exceto as marcadas como **públicas**) exigem header `Authorization: Bearer <JWT>`.

Papéis definidos no Prisma: `OPERATOR_MACHINE`, `FORKLIFT_OPERATOR`, `FOLLOW_UP_OPERATOR`, `SUPPLY_OPERATOR`, `LEADER`, `SUPERVISOR`, `MANAGER`, `ADMIN`.

> **Regras de negócio:** [`REGRAS_NEGOCIO_REPOSICAO_OPERADOR.md`](./REGRAS_NEGOCIO_REPOSICAO_OPERADOR.md)  
> **O que existe vs o que falta (matriz única):** [`STATUS_IMPLEMENTACAO.md`](./STATUS_IMPLEMENTACAO.md)  
> **Telas sugeridas:** [`FLUXOS_TELAS_FRONTEND.md`](./FLUXOS_TELAS_FRONTEND.md)

**Legenda nas tabelas abaixo:** coluna **Status** — ✅ rota registrada no código · ❌ ainda não existe.

---

## Índice rápido

| Seção | Conteúdo |
|-------|----------|
| [Rotas públicas / autenticadas](#rotas-públicas-sem-jwt) | Login, `me`, senha |
| [Por papel](#admin) | Permissões por `RoleUser` |
| [❌ Rotas planejadas (§9)](#rotas-planejadas--orquestração-dobra-finalizou-9) | Finalizei, pallet pronto, pending-preparation |
| [`STATUS_IMPLEMENTACAO.md`](./STATUS_IMPLEMENTACAO.md) | Lista completa implementada vs pendente |

---

## Rotas públicas (sem JWT)

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `POST` | `/api/auth/login` | Login |
| `GET` | `/api/health` | Health check |

---

## Qualquer usuário autenticado (JWT válido, sem checagem de `role`)

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `GET` | `/api/auth/me` | Dados do usuário do token |
| `POST` | `/api/auth/password` | Alterar senha |

---

## `ADMIN`

Acesso a **todas** as rotas autenticadas deste documento, inclusive as de operador (útil para testes), além de:

### Usuários — `/api/users`

| Método | Caminho |
|--------|---------|
| `GET` | `/api/users/employee-info` |
| `GET` | `/api/users` |
| `GET` | `/api/users/roles` |
| `POST` | `/api/users` |
| `PATCH` | `/api/users/:userId/role` |
| `POST` | `/api/users/:userId/reset-password` |

### Setores — `/api/sectors`

| Método | Caminho |
|--------|---------|
| `POST` | `/api/sectors` |
| `GET` | `/api/sectors` |
| `GET` | `/api/sectors/:sectorId` |
| `PATCH` | `/api/sectors/:sectorId` |
| `DELETE` | `/api/sectors/:sectorId` |

### Domínio máquinas / equipamentos (mesmo grupo de `LEADER` e `SUPPLY_OPERATOR`)

| Recurso | Métodos e caminhos |
|---------|-------------------|
| **Tipo de máquina** `/api/type-machines` | `POST /`, `GET /`, `GET /:typeMachineId`, `PATCH /:typeMachineId`, `DELETE /:typeMachineId` |
| **Máquinas** `/api/machines` | `POST /`, `GET /`, `GET /:machineId`, `PATCH /:machineId`, `DELETE /:machineId` |
| **Equipamento de movimentação** `/api/moviment-pallets` | `POST /`, `GET /`, `GET /:movimentPalletId`, `PATCH /:movimentPalletId`, `DELETE /:movimentPalletId` |

### Solicitações de reposição — `/api/machine-replenishment-requests`

| Método | Caminho |
|--------|---------|
| `POST` | `/api/machine-replenishment-requests` |
| `GET` | `/api/machine-replenishment-requests` |
| `GET` | `/api/machine-replenishment-requests/:requestId` |
| `PATCH` | `/api/machine-replenishment-requests/:requestId` |
| `DELETE` | `/api/machine-replenishment-requests/:requestId` |

### Operador de máquina — `/api/operator-machine`

| Status | Método | Caminho |
|--------|--------|---------|
| ✅ | `GET` | `/api/operator-machine/machines` |
| ✅ | `GET` | `/api/operator-machine/my-machine` |
| ✅ | `POST` | `/api/operator-machine/my-machine` |
| ✅ | `DELETE` | `/api/operator-machine/my-machine` |
| ✅ | `GET` | `/api/operator-machine/replenishment-requests` |
| ✅ | `POST` | `/api/operator-machine/replenishment-requests/:requestId/pickup` |
| ✅ | `POST` | `/api/operator-machine/my-machine/finalize` |

### Operador de movimentação — `/api/operator-moviment-pallet`

| Status | Método | Caminho |
|--------|--------|---------|
| ✅ | `GET` | `/api/operator-moviment-pallet/moviment-pallets` |
| ✅ | `GET` | `/api/operator-moviment-pallet/my-moviment-pallet` |
| ✅ | `POST` | `/api/operator-moviment-pallet/my-moviment-pallet` |
| ✅ | `DELETE` | `/api/operator-moviment-pallet/my-moviment-pallet` |
| ✅ | `GET` | `/api/operator-moviment-pallet/replenishment-requests` |
| ✅ | `GET` | `/api/operator-moviment-pallet/my-tasks` |
| ✅ | `GET` | `/api/operator-moviment-pallet/active-flow` |
| ✅ | `GET` | `/api/operator-moviment-pallet/trip-suggestions` |
| ✅ | `POST` | `/api/operator-moviment-pallet/trip-suggestions/:tripSuggestionId/accept` |
| ✅ | `POST` | `/api/operator-moviment-pallet/replenishment-requests/:requestId/accept` |
| ✅ | `POST` | `/api/operator-moviment-pallet/tasks/:taskId/accept-pickup` |
| ✅ | `POST` | `/api/operator-moviment-pallet/tasks/:taskId/complete-deliver` |
| ✅ | `POST` | `/api/operator-moviment-pallet/tasks/:taskId/complete-pickup` |
| ✅ | `GET` | `/api/operator-moviment-pallet/notifications` |

---

## `LEADER`

- Rotas **“qualquer autenticado”** + **públicas** (tabela acima).
- **Não** tem acesso a setores nem à maioria de `/api/users` (apenas criação de usuário).

### Usuários — `/api/users`

| Método | Caminho |
|--------|---------|
| `POST` | `/api/users` |

### Tipo de máquina, máquinas, moviment-pallets

Mesmo CRUD que em `ADMIN` para:

- `/api/type-machines`
- `/api/machines`
- `/api/moviment-pallets`

### Solicitações de reposição — `/api/machine-replenishment-requests`

Mesmo conjunto que `ADMIN` / `SUPPLY_OPERATOR` (`POST`, `GET` lista, `GET` por id, `PATCH`, `DELETE`).

---

## `SUPPLY_OPERATOR`

- Rotas **“qualquer autenticado”** + **públicas**.
- **Não** acessa `/api/users`, `/api/sectors`, rotas de operador de máquina nem de movimentação.

### Tipo de máquina, máquinas, moviment-pallets

Igual `LEADER` / `ADMIN` (CRUD completo em cada prefixo).

### Solicitações de reposição — `/api/machine-replenishment-requests`

Igual `LEADER` / `ADMIN` — **✅** CRUD completo (`POST`, `GET`, `GET/:id`, `PATCH`, `DELETE`).

**✅ (§9):** `GET .../pending-preparation`, `POST .../:requestId/mark-pallet-ready`.

---

## `OPERATOR_MACHINE`

- Rotas **“qualquer autenticado”** + **públicas**.
- Apenas prefixo **`/api/operator-machine`** (além de `ADMIN`, que também entra).
- Tabela completa com coluna **Status** na seção [`ADMIN`](#admin) (operador de máquina).
- **✅** `POST .../my-machine/finalize` (§9).

---

## `FORKLIFT_OPERATOR` e `FOLLOW_UP_OPERATOR`

- Rotas **“qualquer autenticado”** + **públicas**.
- Apenas prefixo **`/api/operator-moviment-pallet`** (além de `ADMIN`).
- Tabela completa com **Status** na seção [`ADMIN`](#admin) (operador de movimentação), incluindo `complete-deliver`, `complete-pickup`, `active-flow`.
- **✅** `GET .../notifications` (§9).

**Nota:** empilhadeirista vs transpaleteiro é filtrado pelo **tipo do equipamento** vinculado; detalhes em `REGRAS_NEGOCIO_REPOSICAO_OPERADOR.md`.

---

## `SUPERVISOR` e `MANAGER`

No código atual **não há** `preHandler` dedicado a esses papéis: eles só conseguem usar o que **qualquer JWT** usa:

- `GET /api/auth/me`
- `POST /api/auth/password`
- `GET /api/health`
- `POST /api/auth/login`

Demais rotas da API retornam **403** até existir permissão explícita no back-end.

---

## Resumo: recurso → papéis permitidos

| Prefixo / recurso | Papéis com acesso HTTP |
|-------------------|-------------------------|
| `/api/auth/login` | Público |
| `/api/auth/me`, `/api/auth/password` | Qualquer JWT |
| `/api/health` | Público |
| `/api/users` (maioria) | `ADMIN` |
| `POST /api/users` | `ADMIN`, `LEADER` |
| `/api/sectors` | `ADMIN` |
| `/api/type-machines`, `/api/machines`, `/api/moviment-pallets` | `ADMIN`, `LEADER`, `SUPPLY_OPERATOR` |
| `/api/machine-replenishment-requests` | `ADMIN`, `LEADER`, `SUPPLY_OPERATOR` |
| `/api/operator-machine` | `ADMIN`, `OPERATOR_MACHINE` |
| `/api/operator-moviment-pallet` | `ADMIN`, `FORKLIFT_OPERATOR`, `FOLLOW_UP_OPERATOR` |
| Orquestração §9 | ✅ — [Rotas §9](#rotas-orquestração-dobra-finalizou-9) |

---

## Rotas orquestração “dobra finalizou” (§9)

**Status: ✅** registradas em `back-end/src/routes/`. Ver [`STATUS_IMPLEMENTACAO.md`](./STATUS_IMPLEMENTACAO.md).

| Status | Método | Caminho | Papel | Descrição |
|--------|--------|---------|-------|-----------|
| ✅ | `POST` | `/api/operator-machine/my-machine/finalize` | `OPERATOR_MACHINE`, `ADMIN` | **Finalizei** — verifica pallet pronto ou notifica supply |
| ✅ | `GET` | `/api/machine-replenishment-requests/pending-preparation` | `SUPPLY_OPERATOR`, `LEADER`, `ADMIN` | Lista aguardando preparo |
| ✅ | `POST` | `/api/machine-replenishment-requests/:requestId/mark-pallet-ready` | `SUPPLY_OPERATOR`, `LEADER`, `ADMIN` | Marca **pallet pronto** → fila do transporte |
| ✅ | `GET` | `/api/operator-moviment-pallet/notifications` | Transporte, `ADMIN` | Resumo da fila (polling) |

**Corpo opcional em `POST .../finalize`:** `movementCube`, `typeMovimentPallet`, `priorityLevel`. Sem esses campos, a API infere cubo e tipo do **último pedido** da máquina vinculada ao operador; a **UI do app** do operador de dobra chama o endpoint com **`{}`** (somente o botão “Finalizei”). Campos no body ainda são necessários na API se **não existir** nenhum pedido anterior para aquela máquina (caso raro; testes via Bruno).

**`POST` criar solicitação:** campo opcional `palletReady: true` para antecipar cubo sem passar por preparo pendente.

---

## Código de referência

Helpers de papel: `back-end/src/middleware/require-roles.ts`.  
Registro das rotas: `back-end/src/routes/main.ts` (prefixo `/api` em `back-end/src/app.ts`).
