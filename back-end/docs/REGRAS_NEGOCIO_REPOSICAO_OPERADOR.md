# Regras de negócio: reposição, operador de máquina e retirada de pallet

Documento de referência para os fluxos implementados na API (`/api`): operador de máquina (`OPERATOR_MACHINE`), operador de movimentação (`FORKLIFT_OPERATOR` / `FOLLOW_UP_OPERATOR`) e pontos que ainda podem evoluir (transições automáticas de `RequestStatus`).

---

## 1. Papéis envolvidos

| Papel | Responsabilidade neste fluxo |
|--------|-------------------------------|
| **SUPPLY_OPERATOR** (e **LEADER** / **ADMIN**) | Abre **solicitação de reposição** (`MachineReplenishmentRequest`): máquina de destino, código do cubo, prioridade e **tipo de movimentação** (`typeMovimentPallet`: empilhadeira ou transpaleteira). |
| **OPERATOR_MACHINE** | Após login, escolhe a **máquina de operação** (vínculo `User` ↔ `Machine`), vê as **requisições daquela máquina** e, quando aplicável, **solicita retirada** do pallet. |
| **FORKLIFT_OPERATOR** | Após login, vincula-se a um **equipamento de movimentação** do tipo **empilhadeira** (`MovimentPallet` com `type = FORKLIFT`), vê **solicitações e tarefas** apenas desse tipo e pode **aceitar** uma requisição em aberto (cria tarefa de entrega). |
| **FOLLOW_UP_OPERATOR** | Igual ao empilhadeirista no fluxo da API, porém apenas com equipamento **transpaleteira** (`type = PALLET_TRUCK`). |

---

## 2. Modelos principais (Prisma)

- **Machine** — `userId` opcional: operador atualmente vinculado à máquina (um operador por vez na mesma máquina; ver regra de vínculo abaixo).
- **MachineReplenishmentRequest** — pedido de abastecimento para uma **máquina de destino** (`destinationId`), com `movementCube`, `priorityLevel`, `requestedById` (quem abriu no supply), `status` (`RequestStatus`) e **`typeMovimentPallet`** (`FORKLIFT` ou `PALLET_TRUCK`): define qual fila de operador pode atender.
- **MovimentPallet** — equipamento físico (código único), **tipo** `FORKLIFT` (empilhadeira) ou `PALLET_TRUCK` (transpaleteira), setor opcional e **`operatorId`**: operador atualmente vinculado (um operador por vez; vínculo exclusivo no mesmo estilo da máquina).
- **MovimentPalletTask** — tarefa ligada à requisição via `requestId`: tipos `DELIVER_TO_MACHINE`, `ON_MACHINE`, `PICKUP_TO_EXPEDITION`; status `ForkliftTaskStatus`; pode ter **`assignedMovimentPalletId`** quando a tarefa é da fila do operador de movimentação.

---

## 3. Status da requisição (`RequestStatus`)

| Status | Significado sugerido |
|--------|----------------------|
| **CREATED** | Solicitação criada pelo supply; aguarda processamento / entrega. |
| **IN_PROGRESS** | Em andamento (ex.: entrega ou outras etapas — definir no fluxo do empilhadeirista). |
| **ON_MACHINE** | Pallet/cubo **já está na máquina de destino**; o **OPERATOR_MACHINE** pode solicitar **retirada** (criação da tarefa `PICKUP_TO_EXPEDITION`). |
| **COMPLETED** | Fluxo encerrado com sucesso. |
| **CANCELED** | Cancelado. |

**Importante:** a API **não** altera sozinha o status para `ON_MACHINE` hoje. Isso deve ocorrer quando o fluxo do **empilhadeirista** marcar a entrega como concluída na máquina (próxima implementação). Para testes, atualize o registro no banco ou use um script/endpoint administrativo se existir.

---

## 4. Fluxo do operador de máquina (`OPERATOR_MACHINE`)

Base URL: **`/api/operator-machine`** — rotas exigem JWT com role **OPERATOR_MACHINE** ou **ADMIN** (testes).

### 4.1 Listar máquinas para escolher a de operação

- **`GET /operator-machine/machines`**
- Lista **apenas máquinas cujo `sectorId` é igual ao `sectorId` do usuário** (`User.sectorId` ↔ `Machine.sectorId`), ou seja, o mesmo setor (ex.: DOBRA).
- Se o operador **não tiver `sectorId`**, a lista vem **vazia** (é obrigatório ter setor no cadastro para escolher máquina).

### 4.2 Consultar máquina vinculada

- **`GET /operator-machine/my-machine`**
- Resposta: `{ "machine": { ... } | null }`.

### 4.3 Vincular-se à máquina de operação

- **`POST /operator-machine/my-machine`**
- Body: `{ "machineId": "<uuid>" }`.
- **Regras:**
  - O operador precisa ter **`sectorId`**; caso contrário, **400** (não pode vincular).
  - A máquina precisa existir (**404** se não existir).
  - A máquina deve estar no **mesmo setor** que o operador (`machine.sectorId === user.sectorId`); caso contrário, **403**.
  - Remove o vínculo deste operador de **qualquer outra** máquina (`Machine.userId`).
  - Associa o operador à máquina informada.
  - Se **outro** operador estava na mesma máquina, ele é **desvinculado** (substituição).

### 4.4 Desvincular (fim de turno / trocar depois)

- **`DELETE /operator-machine/my-machine`**
- Zera `userId` em todas as máquinas onde este operador estava vinculado.

### 4.5 Listar requisições da “minha” máquina

- **`GET /operator-machine/replenishment-requests`**
- Query opcional: **`?status=ON_MACHINE`** (ou outro valor de `RequestStatus`).
- Retorna apenas requisições cuja **máquina de destino** tem **`userId` igual ao operador logado** (ou seja: a máquina na qual ele está vinculado **é** o `destination` da requisição).

### 4.6 Solicitar retirada do pallet (quando `ON_MACHINE`)

- **`POST /operator-machine/replenishment-requests/:requestId/pickup`**
- **Pré-condições:**
  1. A requisição existe.
  2. **`destination.userId` === operador logado** (é da máquina dele).
  3. **`status === ON_MACHINE`**.
  4. Não existe outra **`MovimentPalletTask`** do tipo **`PICKUP_TO_EXPEDITION`** em status **CREATED**, **ASSIGNED** ou **IN_PROGRESS** para a mesma requisição.
- **Efeito:** cria **`MovimentPalletTask`** com `type = PICKUP_TO_EXPEDITION`, `status = CREATED`, `requestedById` = operador.
- **Resposta (201):** `{ "request": { ... }, "pickupTask": { ... } }`.
- Erros comuns: **403** (requisição não é da máquina do operador), **409** (status diferente de `ON_MACHINE` ou pickup já em aberto).

---

## 5. Fluxo do operador de movimentação (`FORKLIFT_OPERATOR` e `FOLLOW_UP_OPERATOR`)

Base URL: **`/api/operator-moviment-pallet`** — rotas exigem JWT com role **FORKLIFT_OPERATOR**, **FOLLOW_UP_OPERATOR** ou **ADMIN** (testes).

### 5.1 Perfis e tipo de equipamento

| Papel | Tipo de `MovimentPallet` permitido |
|--------|-------------------------------------|
| **FORKLIFT_OPERATOR** | Somente **`FORKLIFT`** (empilhadeira). |
| **FOLLOW_UP_OPERATOR** | Somente **`PALLET_TRUCK`** (transpaleteira). |
| **ADMIN** | **Ambos** (para testes). |

O operador **só enxerga solicitações em aberto e tarefas** alinhadas ao **tipo do equipamento** ao qual está vinculado naquele momento (regra de visibilidade por `typeMovimentPallet` ↔ `MovimentPallet.type`).

### 5.2 Listar equipamentos para escolher o de operação

- **`GET /operator-moviment-pallet/moviment-pallets`**
- Lista **`MovimentPallet`** do **mesmo setor** do usuário (`User.sectorId` ↔ `MovimentPallet.sectorId`), **filtrado pelo tipo permitido ao papel** (tabela acima).
- Apenas equipamentos **sem operador** (`operatorId` nulo) **ou já vinculados ao próprio usuário** entram na lista (não aparecem os ocupados por outro operador).
- Se o usuário **não tiver `sectorId`**, a lista vem **vazia**.

### 5.3 Consultar equipamento vinculado

- **`GET /operator-moviment-pallet/my-moviment-pallet`**
- Resposta: equipamento atual ou `null`.

### 5.4 Vincular-se ao equipamento de movimentação

- **`POST /operator-moviment-pallet/my-moviment-pallet`**
- Body: `{ "movimentPalletId": "<uuid>" }`.
- **Regras:**
  - Operador precisa ter **`sectorId`**; caso contrário, **400**.
  - Equipamento deve existir (**404**).
  - **`MovimentPallet.sectorId`** deve existir e ser **igual** ao `user.sectorId`; equipamento sem setor não pode ser vinculado (**403**).
  - O **tipo** do equipamento deve ser **permitido ao papel**; caso contrário, **403**.
  - Remove o vínculo deste operador de **qualquer outro** `MovimentPallet` (`operatorId`).
  - Associa o operador ao equipamento informado (substitui operador anterior **nesse** equipamento, se houver).

### 5.5 Desvincular

- **`DELETE /operator-moviment-pallet/my-moviment-pallet`**
- Zera `operatorId` em todos os `MovimentPallet` onde este usuário estava vinculado.

### 5.6 Listar solicitações disponíveis para aceitar (fila)

- **`GET /operator-moviment-pallet/replenishment-requests`**
- **Pré-condição:** operador deve estar **vinculado** a um `MovimentPallet`; senão a lista vem **vazia** (não é erro).
- Retorna **`MachineReplenishmentRequest`** em **`CREATED`**, com **`typeMovimentPallet` igual ao `type` do equipamento** vinculado, e **sem** tarefa **`DELIVER_TO_MACHINE`** ainda em aberto (**CREATED**, **ASSIGNED** ou **IN_PROGRESS**) para a mesma requisição.
- Ordenação na API: prioridade (`priorityLevel`) e data de criação (fila atendível pelo tipo certo).

### 5.7 Listar minhas atividades (tarefas no meu equipamento)

- **`GET /operator-moviment-pallet/my-tasks`**
- Lista **`MovimentPalletTask`** com **`assignedMovimentPalletId`** = id do equipamento vinculado ao operador.
- Como o vínculo é a um único tipo de equipamento, **só aparecem tarefas daquele tipo de movimentação** (indiretamente: tarefas atribuídas àquele `MovimentPallet`).

### 5.8 Aceitar uma solicitação (criar atividade de entrega)

- **`POST /operator-moviment-pallet/replenishment-requests/:requestId/accept`**
- **Pré-condições:**
  1. Operador **vinculado** a um `MovimentPallet` (**400** se não houver).
  2. Tipo do equipamento **compatível** com o papel (**403** se incoerente).
  3. Requisição existe (**404**).
  4. **`request.typeMovimentPallet === MovimentPallet.type`** do equipamento vinculado (**403** se divergir).
- **Efeito (transação):**
  - Atualiza a requisição de **`CREATED`** para **`IN_PROGRESS`** somente se ainda estiver `CREATED` e com o **mesmo** `typeMovimentPallet` do equipamento (evita corrida entre dois operadores).
  - Cria **`MovimentPalletTask`**: `type = DELIVER_TO_MACHINE`, `status = ASSIGNED`, `requestId`, `requestedById` = quem abriu a solicitação (`MachineReplenishmentRequest.requestedById`), `assignedMovimentPalletId` = equipamento do operador.
- **201:** `{ "task": { ... }, "request": { ... } }`.
- **409** se a requisição já tiver sido aceita por outro (não está mais em `CREATED` na condição atômica).

### 5.9 Cadastro dos equipamentos (`MovimentPallet`) — supply / líder

- CRUD em **`/api/moviment-pallets`** (roles **LEADER**, **SUPPLY_OPERATOR**, **ADMIN**), alinhado ao cadastro de máquinas.
- Para o operador conseguir vincular-se, o equipamento deve ter **`sectorId`** coerente com o do operador.

---

## 6. Fluxo do supply (abertura da solicitação)

- **`POST /api/machine-replenishment-requests`** (roles **SUPPLY_OPERATOR**, **LEADER**, **ADMIN**).
- Campos: `destinationId`, `movementCube`, **`typeMovimentPallet`** (`FORKLIFT` ou `PALLET_TRUCK`), `priorityLevel` opcional.
- O solicitante é sempre o usuário do token (`requestedById` = `sub`).

Demais CRUDs de requisição permanecem nas rotas já existentes sob **`/api/machine-replenishment-requests`**.

---

## 7. Tipos de tarefa (`ForkliftTaskType` em `MovimentPalletTask`)

| Tipo | Uso previsto |
|------|----------------|
| **DELIVER_TO_MACHINE** | Levar cubo/pallet até a máquina de destino (criada ao aceitar a solicitação em **`POST /operator-moviment-pallet/.../accept`**). |
| **ON_MACHINE** | Etapa em máquina (se aplicável ao processo). |
| **PICKUP_TO_EXPEDITION** | **Retirada** solicitada pelo operador quando a requisição está **ON_MACHINE** (implementado ao chamar `POST .../pickup`). |

---

## 8. Resumo rápido (ordem lógica)

### Operador de máquina (pallet já na máquina)

1. Supply cria **MachineReplenishmentRequest** para a máquina M (`CREATED` / `IN_PROGRESS` conforme evolução), com o tipo de movimentação desejado.
2. Fluxo de entrega na máquina M → quando aplicável, requisição em **`ON_MACHINE`** (transição completa do **DELIVER** / **ON_MACHINE** pode evoluir com novos endpoints).
3. **OPERATOR_MACHINE** faz login → **`GET /operator-machine/machines`** → **`POST /operator-machine/my-machine`** com a máquina M.
4. **`GET /operator-machine/replenishment-requests`** (filtrar `?status=ON_MACHINE` se quiser só retiráveis).
5. **`POST /operator-machine/replenishment-requests/:id/pickup`** → cria **MovimentPalletTask** **PICKUP** para retirada.

### Operador de movimentação (empilhadeira / transpaleteira)

1. Cadastro (líder/supply): **`POST /moviment-pallets`** com `code`, `type`, `sectorId` do setor do operador.
2. **FORKLIFT_OPERATOR** ou **FOLLOW_UP_OPERATOR** faz login → **`GET /operator-moviment-pallet/moviment-pallets`** → **`POST /operator-moviment-pallet/my-moviment-pallet`**.
3. **`GET /operator-moviment-pallet/replenishment-requests`** — só requisições **do mesmo tipo** do equipamento vinculado.
4. **`POST /operator-moviment-pallet/replenishment-requests/:id/accept`** — cria tarefa **DELIVER_TO_MACHINE** e passa a requisição para **`IN_PROGRESS`**.
5. **`GET /operator-moviment-pallet/my-tasks`** — acompanha atividades no **seu** equipamento.

---

## 9. Arquivos de código (referência)

- Operador de máquina — rotas: `src/routes/operator-machine.routes.ts`; serviço: `src/services/operator-machine.service.ts`; middleware: `requireOperatorMachineRole` em `src/middleware/require-roles.ts`.
- Operador de movimentação — rotas: `src/routes/operator-moviment-pallet.routes.ts`; serviço: `src/services/operator-moviment-pallet.service.ts`; middleware: `requireForkliftOrFollowUpOperatorRole` em `src/middleware/require-roles.ts`.
- CRUD equipamento — `src/routes/moviment-pallet.routes.ts`, `src/services/moviment-pallet.service.ts`, `src/repositories/moviment-pallet.repository.ts`.
- Fila por tipo — `findManyOpenPoolForMovimentType` em `src/repositories/machine-replenishment-request.repository.ts`.
- Enum `RequestStatus` com **`ON_MACHINE`**: `prisma/schema.prisma` + migrações em `prisma/migrations/`.

Este arquivo pode ser atualizado sempre que novos passos (por exemplo transição automática para `ON_MACHINE` ou conclusão para `COMPLETED`) forem adicionados à API.
