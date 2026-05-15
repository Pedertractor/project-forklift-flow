# Status de implementação — reposição e operadores

**Referência única** para saber o que **já existe na API**, o que está **só na documentação** e o que **falta fazer**.  
Atualize este arquivo sempre que uma rota ou regra entrar em produção.

Documentos relacionados:

| Documento | Conteúdo |
|-----------|----------|
| [`REGRAS_NEGOCIO_REPOSICAO_OPERADOR.md`](./REGRAS_NEGOCIO_REPOSICAO_OPERADOR.md) | Regras e pré-condições |
| [`ROTAS_POR_ROLE.md`](./ROTAS_POR_ROLE.md) | Rotas HTTP por papel |
| [`FLUXOS_TELAS_FRONTEND.md`](./FLUXOS_TELAS_FRONTEND.md) | Telas sugeridas por papel |

**Como validar no código:** `back-end/src/routes/*.routes.ts`, `replenishment-orchestration.service.ts`.

---

## Legenda

| Símbolo | Significado |
|---------|-------------|
| ✅ | **Implementado** na API |
| ⚠️ | **Parcial** |
| ❌ | **Não implementado** |
| 📋 | **Só documentação** |

---

## Visão por fluxo de negócio

| Fluxo | Status | Observação |
|-------|--------|------------|
| Supply / líder abre solicitação (CRUD) | ✅ | `palletReady: true` no `POST` libera direto na fila |
| Supply cadastra máquinas, tipos, equipamentos | ✅ | |
| Operador de máquina vincula máquina | ✅ | |
| Operador de máquina lista pedidos / retirada | ✅ | `pickup` em `ON_MACHINE` |
| Operador de máquina **“finalizei”** na dobra | ✅ | `POST /api/operator-machine/my-machine/finalize` |
| Verificação **pallet pronto** após finalizar | ✅ | Serviço `finalizeMachineProductionCycle` |
| Supply lista **preparo pendente** | ✅ | `GET .../pending-preparation` |
| Supply **marca pallet pronto** | ✅ | `POST .../:requestId/mark-pallet-ready` |
| Fila transporte só **pallet pronto** | ✅ | Status `PALLET_READY` (+ `CREATED` legado) |
| Transporte: fila, aceitar, entregar, retirada | ✅ | |
| `complete-deliver` → `ON_MACHINE` | ✅ | |
| Sugestões de viagem | ✅ | |
| Notificações transporte (polling) | ✅ | `GET .../notifications` |
| Push / WebSocket em tempo real | ❌ | Opcional futuro |

---

## Rotas §9 — implementadas ✅

| Método | Caminho | Papel |
|--------|---------|-------|
| `POST` | `/api/operator-machine/my-machine/finalize` | `OPERATOR_MACHINE`, `ADMIN` |
| `GET` | `/api/machine-replenishment-requests/pending-preparation` | `SUPPLY_OPERATOR`, `LEADER`, `ADMIN` |
| `POST` | `/api/machine-replenishment-requests/:requestId/mark-pallet-ready` | `SUPPLY_OPERATOR`, `LEADER`, `ADMIN` |
| `GET` | `/api/operator-moviment-pallet/notifications` | `FORKLIFT_OPERATOR`, `FOLLOW_UP_OPERATOR`, `ADMIN` |

---

## Modelo de dados (Prisma)

| Item | Status |
|------|--------|
| `RequestStatus.AWAITING_PREPARATION` | ✅ |
| `RequestStatus.PALLET_READY` | ✅ |
| `preparedAt`, `awaitingPreparationSince` | ✅ |
| Migração `20260515120000_replenishment_pallet_ready_flow` | ✅ (rodar `prisma migrate deploy` no ambiente) |

---

## Front-end

| Módulo | Status |
|--------|--------|
| Telas operador / supply / transporte para §9 | ❌ | API pronta; integrar no app |

---

## Deploy

Após puxar o código, no back-end:

```bash
npx prisma migrate deploy
```

Pedidos `CREATED` existentes são migrados para `PALLET_READY` na migração.

---

*Última atualização: orquestração §9 implementada no back-end.*
