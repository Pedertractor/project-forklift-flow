# Regras de negócio: reposição, operador de máquina e retirada de pallet

Documento de referência para os fluxos implementados na API (`/api`) e para o que ainda depende de evolução (empilhadeirista / transição de status).

---

## 1. Papéis envolvidos

| Papel | Responsabilidade neste fluxo |
|--------|-------------------------------|
| **SUPPLY_OPERATOR** (e **LEADER** / **ADMIN**) | Abre **solicitação de reposição** (`MachineReplenishmentRequest`): máquina de destino, código do cubo, prioridade. |
| **OPERATOR_MACHINE** | Após login, escolhe a **máquina de operação** (vínculo `User` ↔ `Machine`), vê as **requisições daquela máquina** e, quando aplicável, **solicita retirada** do pallet. |
| **FORKLIFT_OPERATOR** | (Fluxo complementar, a detalhar na API) Entrega do cubo à máquina e retirada física; é o que deve levar a requisição ao estado em que o operador pode pedir retirada. |

---

## 2. Modelos principais (Prisma)

- **Machine** — `userId` opcional: operador atualmente vinculado à máquina (um operador por vez na mesma máquina; ver regra de vínculo abaixo).
- **MachineReplenishmentRequest** — pedido de abastecimento para uma **máquina de destino** (`destinationId`), com `movementCube`, `priorityLevel`, `requestedById` (quem abriu no supply), `status` (`RequestStatus`).
- **ForkliftTask** — tarefa para o empilhadeirista: tipos `DELIVER_TO_MACHINE`, `ON_MACHINE`, `PICKUP_TO_EXPEDITION`; ligada à mesma `MachineReplenishmentRequest` via `requestId`.

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

Base URL: **`/api/operator-machine`** — todas as rotas exigem JWT com role **OPERATOR_MACHINE**.

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
  4. Não existe outra **`ForkliftTask`** do tipo **`PICKUP_TO_EXPEDITION`** em status **CREATED**, **ASSIGNED** ou **IN_PROGRESS** para a mesma requisição.
- **Efeito:** cria **`ForkliftTask`** com `type = PICKUP_TO_EXPEDITION`, `status = CREATED`, `requestedById` = operador.
- **Resposta (201):** `{ "request": { ... }, "pickupTask": { ... } }`.
- Erros comuns: **403** (requisição não é da máquina do operador), **409** (status diferente de `ON_MACHINE` ou pickup já em aberto).

---

## 5. Fluxo do supply (abertura da solicitação)

- **`POST /api/machine-replenishment-requests`** (roles **SUPPLY_OPERATOR**, **LEADER**, **ADMIN**).
- Campos: `destinationId`, `movementCube`, `priorityLevel` opcional.
- O solicitante é sempre o usuário do token (`requestedById` = `sub`).

Demais CRUDs de requisição permanecem nas rotas já existentes sob **`/api/machine-replenishment-requests`**.

---

## 6. Tipos de tarefa do empilhadeirista (`ForkliftTaskType`)

| Tipo | Uso previsto |
|------|----------------|
| **DELIVER_TO_MACHINE** | Levar cubo/pallet até a máquina de destino. |
| **ON_MACHINE** | Etapa em máquina (se aplicável ao processo). |
| **PICKUP_TO_EXPEDITION** | **Retirada** solicitada pelo operador quando a requisição está **ON_MACHINE** (implementado ao chamar `POST .../pickup`). |

---

## 7. Resumo rápido (ordem lógica)

1. Supply cria **MachineReplenishmentRequest** para a máquina M (`CREATED` / `IN_PROGRESS` conforme evolução).
2. Empilhadeirista entrega na máquina M → sistema deve passar a requisição para **`ON_MACHINE`** (a implementar no módulo do empilhadeirista).
3. **OPERATOR_MACHINE** faz login → **`GET .../machines`** → **`POST .../my-machine`** com a máquina M.
4. **`GET .../replenishment-requests`** (filtrar `?status=ON_MACHINE` se quiser só retiráveis).
5. **`POST .../replenishment-requests/:id/pickup`** → cria tarefa **PICKUP** para o empilhadeirista.

---

## 8. Arquivos de código (referência)

- Rotas: `src/routes/operator-machine.routes.ts`
- Serviço: `src/services/operator-machine.service.ts`
- Middleware de role: `requireOperatorMachineRole` em `src/middleware/require-roles.ts`
- Enum `RequestStatus` com **`ON_MACHINE`**: `prisma/schema.prisma` + migração em `prisma/migrations/`

Este arquivo pode ser atualizado sempre que novos passos (por exemplo transição automática para `ON_MACHINE` ou conclusão para `COMPLETED`) forem adicionados à API.
