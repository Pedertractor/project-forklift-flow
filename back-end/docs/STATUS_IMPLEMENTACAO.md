# Status de implementação — tarefas entrega/retirada

**Atualizado:** arquitetura baseada em `DeliveryTask` + `PickupTask` (sem `MachineReplenishmentRequest`).

| Fluxo | Status |
|-------|--------|
| Schema + migração `20260522120000_task_based_flow` | ✅ |
| API operador máquina (2 botões) | ✅ |
| API delivery-tasks (supply) | ✅ |
| API transporte (fila, aceitar, concluir, sugestões) | ✅ |
| Front operador máquina | ⚠️ Parcial |
| Front supply (criar entrega, crítico) | ⚠️ Parcial |
| Front transporte (adaptar fila) | ❌ Pendente integração |
| Testes de integração antigos | ❌ Removidos (reescrever) |

## Rotas principais

| Método | Caminho |
|--------|---------|
| `POST` | `/api/operator-machine/pickup-only` |
| `POST` | `/api/operator-machine/pickup-with-replenishment` |
| `GET` | `/api/operator-machine/machine-tasks` |
| `POST` | `/api/delivery-tasks` |
| `GET` | `/api/delivery-tasks/pending-supply-requests` |
| `POST` | `/api/delivery-tasks/:taskId/mark-prepared` |
| `GET` | `/api/operator-moviment-pallet/open-tasks` |

## Modelo

- `isCritical: Boolean` em `DeliveryTask` e `PickupTask`
- `MachineTaskStatus`: CREATED → ASSIGNED → IN_PROGRESS → COMPLETED
