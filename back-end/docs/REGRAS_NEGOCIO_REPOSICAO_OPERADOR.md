# Regras de negócio: tarefas de entrega e retirada (campainha)

Sistema tipo **campainha de restaurante**: tarefas ligadas à **máquina**, sem pedido intermediário (`MachineReplenishmentRequest` removido).

> Matriz de implementação: [`STATUS_IMPLEMENTACAO.md`](./STATUS_IMPLEMENTACAO.md)

---

## 1. Papéis

| Papel | Responsabilidade |
|-------|------------------|
| **OPERATOR_MACHINE** | Vincula máquina; **solicitar retirada** ou **retirada + abastecimento** |
| **SUPPLY_OPERATOR** | Recebe avisos; **cria tarefa de entrega** (`DeliveryTask`) com prisma, tipo e `isCritical` |
| **FORKLIFT_OPERATOR** / **FOLLOW_UP_OPERATOR** | Mesmo fluxo: fila de entregas e retiradas, sugestões de viagem, aceitar e concluir tarefas |

---

## 2. Modelos (Prisma)

### `DeliveryTask` — levar prisma até a máquina

| Campo | Descrição |
|-------|-----------|
| `machineId` | Máquina de destino |
| `movementCube` | Código do prisma |
| `typeMovimentPallet` | `FORKLIFT` ou `ANY` |
| `isCritical` | **boolean** (substitui `PriorityLevel`) |
| `acceptedBySupply` | Abastecimento aceitou/registrou a entrega |
| `preparedAt` | Pallet pronto no recebimento → entra na fila do transporte |
| `status` | `MachineTaskStatus` |

### `PickupTask` — retirar prisma da máquina → expedição

| Campo | Descrição |
|-------|-----------|
| `machineId` | Máquina de origem |
| `triggersReplenishment` | `true` quando operador pediu **retirada + abastecimento** |
| `isCritical` | Prioridade na fila |
| `status` | `MachineTaskStatus` |

### `OperatorMachineSupplyRequest`

Aviso ao abastecimento. Encerrado (`FULFILLED`) quando supply cria `DeliveryTask` para a mesma máquina.

### `MovimentPalletTripSuggestion`

Par **entrega + retirada** na mesma máquina. O empilhadeirista só vê a sugestão combinada quando a `DeliveryTask` vinculada tem `preparedAt` (pallet pronto no abastecimento). O operador da máquina pode abrir **retirada + abastecimento** antes disso; a sugestão é criada/sincronizada no `mark-prepared` ou na listagem de `/trip-suggestions`.

---

## 3. OPERATOR_MACHINE — `/api/operator-machine`

| Método | Rota | Efeito |
|--------|------|--------|
| `POST` | `/pickup-only` | Cria `PickupTask` (só retirada) se há ao menos uma entrega concluída na máquina; body opcional `{ isCritical?: boolean }` |
| `POST` | `/pickup-with-replenishment` | Cria `PickupTask` + `OperatorMachineSupplyRequest` OPEN (se ainda não houver); body opcional `{ isCritical?: boolean }`; sincroniza sugestão de viagem se houver `DeliveryTask` pronta |
| `GET` | `/machine-tasks` | Lista `deliveryTasks` e `pickupTasks` da máquina vinculada |

**Removido:** `finalize`, `replenishment-requests`, pickup por `requestId`.

---

## 4. SUPPLY — `/api/delivery-tasks`

| Método | Rota | Efeito |
|--------|------|--------|
| `GET` | `/pending-supply-requests` | Avisos OPEN do setor |
| `POST` | `/` | Cria `DeliveryTask` (`acceptedBySupply: true`; opcional `markReady`) |
| `POST` | `/:taskId/mark-prepared` | Preenche `preparedAt` → fila do transporte |

Body de criação: `machineId`, `movementCube`, `typeMovimentPallet`, `isCritical?`, `markReady?`, `operatorSupplyRequestId?`.

---

## 5. Transporte — `/api/operator-moviment-pallet`

| Método | Rota | Efeito |
|--------|------|--------|
| `GET` | `/open-tasks` | `{ deliveryTasks, pickupTasks }` na fila |
| `POST` | `/tasks/:id/accept-deliver` | Aceita entrega |
| `POST` | `/tasks/:id/accept-pickup` | Aceita retirada |
| `POST` | `/tasks/:id/complete-deliver` | Conclui entrega na máquina |
| `POST` | `/tasks/:id/complete-pickup` | Conclui retirada na expedição |
| `GET` | `/trip-suggestions` | Tela principal: par entrega+retirada (2 tarefas) **somente com** `DeliveryTask.preparedAt` preenchido; ou tarefa avulsa **somente se** `isCritical`; tarefas do par nao repetem como avulsas. Se nao houver nenhuma sugestao/avulsa critica, promove **uma** avulsa nao critica (a mais antiga da fila manual) para o empilhadeirista/follow-up nao precisar abrir a fila manual |
| `POST` | `/trip-suggestions/:id/accept` | Aceita rota combinada |

**Removido:** aceitar `MachineReplenishmentRequest`.

Ordenação: `isCritical` desc, depois `createdAt` asc (sugestoes combinadas e avulsas criticas na mesma ordem de prioridade).

**Fila manual** (`/open-tasks`): somente avulsas **nao criticas** e fora de sugestao combinada.

---

## 6. Fluxo resumido

```mermaid
flowchart LR
  OM[Operador máquina]
  S[SUPPLY]
  T[Transporte]
  OM -->|retirada| T
  OM -->|retirada + abastecimento| S
  OM -->|retirada + abastecimento| T
  S -->|DeliveryTask pronta| T
  T -->|entrega concluída| OM
```

1. Supply antecipa ou responde aviso → `DeliveryTask` com `preparedAt`.
2. Transporte entrega → `DeliveryTask` COMPLETED → prisma na máquina.
3. Operador **só retirada** → `PickupTask`.
4. Operador **retirada + abastecimento** → `PickupTask` + aviso supply; sugestão de viagem para o transporte **após** abastecimento marcar o pallet pronto (`preparedAt`).

---

## 7. Deploy

```bash
cd back-end
npx prisma migrate deploy
npx prisma generate
```

Migração: `20260522120000_task_based_flow` (remove tabelas antigas; dados não migrados).
