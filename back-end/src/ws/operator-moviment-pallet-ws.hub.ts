import type { WebSocket } from 'ws'
import {
  MachineTaskStatus,
  RoleUser,
  type TypeMovimentPallet,
} from '../generated/prisma/enums.js'

export type OperatorMovimentPalletWsClientContext = {
  userId: string
  role: RoleUser
  sectorId: string | null
  boundMachineId: string | null
  allowedTypes: readonly TypeMovimentPallet[]
}

type WsPayload = Record<string, unknown> & {
  type?: string
  sectorId?: string
  typeMovimentPallet?: TypeMovimentPallet
  destinationUserId?: string | null
  machineId?: string
  affectedUserId?: string | null
}

type WsClient = OperatorMovimentPalletWsClientContext & { socket: WebSocket }

const clients = new Set<WsClient>()

const WS_OPEN = 1

const SECTOR_QUEUE_EVENT_TYPES = new Set([
  'delivery_task_created',
  'delivery_queue_updated',
  'trip_suggestions_updated',
  'replenishment_request_created',
  'replenishment_queue_updated',
  'machine_production_status_updated',
])

const SUPPLY_REPLENISHMENT_EVENT_TYPES = new Set([
  'operator_supply_request_created',
  'delivery_task_created',
  'delivery_task_updated',
  'machine_production_status_updated',
  'machine_tooling_updated',
])

const MACHINE_OPERATOR_EVENT_TYPES = new Set([
  'delivery_task_updated',
  'pickup_task_updated',
  'replenishment_status_updated',
  'machine_operator_updated',
  'machine_production_status_updated',
  'machine_tooling_updated',
])

const MACHINE_CADASTRO_EVENT_TYPES = new Set([
  'machine_operator_updated',
  'machine_production_status_updated',
  'machine_tooling_updated',
])

/** Eventos de mudança de status de tarefa acompanhados no painel de supervisão. */
const SUPERVISION_TASK_EVENT_TYPES = new Set([
  'delivery_task_updated',
  'pickup_task_updated',
])

const MOVIMENT_OPERATOR_ROLES = new Set<RoleUser>([
  RoleUser.PALLET_TRANSPORTER,
  RoleUser.ADMIN,
  RoleUser.SUPERADMIN,
])

const OPERATOR_MACHINE_ROLES = new Set<RoleUser>([
  RoleUser.OPERATOR_MACHINE,
  RoleUser.ADMIN,
  RoleUser.SUPERADMIN,
])

const MACHINE_CADASTRO_ROLES = new Set<RoleUser>([
  RoleUser.ADMIN,
  RoleUser.SUPERADMIN,
  RoleUser.LEADER,
  RoleUser.SUPPLY_OPERATOR,
])

const SUPPLY_REPLENISHMENT_ROLES = new Set<RoleUser>([
  RoleUser.SUPPLY_OPERATOR,
  RoleUser.LEADER,
  RoleUser.ADMIN,
  RoleUser.SUPERADMIN,
])

/** Papéis que acompanham o trajeto/atividades no painel operacional. */
const SUPERVISION_ROLES = new Set<RoleUser>([
  RoleUser.ADMIN,
  RoleUser.SUPERADMIN,
  RoleUser.LEADER,
])

function safeSend(socket: WebSocket, payload: Record<string, unknown>): void {
  if (socket.readyState !== WS_OPEN) {
    return
  }
  try {
    socket.send(JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}

function sectorMatches(client: WsClient, payload: WsPayload): boolean {
  if (!payload.sectorId || !client.sectorId) {
    return true
  }
  return payload.sectorId === client.sectorId
}

function movimentTypeMatches(client: WsClient, payload: WsPayload): boolean {
  if (!payload.typeMovimentPallet) {
    return true
  }
  return client.allowedTypes.includes(payload.typeMovimentPallet)
}

function matchesMovimentOperator(client: WsClient, payload: WsPayload): boolean {
  if (!payload.type || !MOVIMENT_OPERATOR_ROLES.has(client.role)) {
    return false
  }
  if (
    !SECTOR_QUEUE_EVENT_TYPES.has(payload.type) &&
    payload.type !== 'delivery_task_updated' &&
    payload.type !== 'pickup_task_updated'
  ) {
    return false
  }
  return sectorMatches(client, payload) && movimentTypeMatches(client, payload)
}

function matchesMachineOperator(client: WsClient, payload: WsPayload): boolean {
  if (
    !payload.type ||
    !MACHINE_OPERATOR_EVENT_TYPES.has(payload.type) ||
    !OPERATOR_MACHINE_ROLES.has(client.role)
  ) {
    return false
  }
  if (payload.type === 'machine_operator_updated') {
    return payload.affectedUserId === client.userId
  }
  if (payload.type === 'machine_production_status_updated') {
    if (payload.operatorUserId && payload.operatorUserId === client.userId) {
      return true
    }
  }
  if (payload.destinationUserId === client.userId) {
    return true
  }
  return Boolean(
    client.boundMachineId &&
      payload.machineId &&
      payload.machineId === client.boundMachineId,
  )
}

function matchesMachineCadastro(client: WsClient, payload: WsPayload): boolean {
  if (
    !payload.type ||
    !MACHINE_CADASTRO_EVENT_TYPES.has(payload.type) ||
    !MACHINE_CADASTRO_ROLES.has(client.role)
  ) {
    return false
  }
  return sectorMatches(client, payload)
}

/** Tela de reposição / abastecimento (nova solicitação da dobra, tarefa de entrega). */
function matchesSupplyReplenishment(client: WsClient, payload: WsPayload): boolean {
  if (
    !payload.type ||
    !SUPPLY_REPLENISHMENT_EVENT_TYPES.has(payload.type) ||
    !SUPPLY_REPLENISHMENT_ROLES.has(client.role)
  ) {
    return false
  }
  return sectorMatches(client, payload)
}

/**
 * Painel de supervisão (ADMIN/LEADER): recebe mudanças de status de entrega e
 * retirada do setor para atualizar o trajeto ao vivo (ex.: encerrar cronômetro
 * quando a atividade é concluída). Ignora `allowedTypes` (líder não opera).
 */
function matchesSupervision(client: WsClient, payload: WsPayload): boolean {
  if (
    !payload.type ||
    !SUPERVISION_TASK_EVENT_TYPES.has(payload.type) ||
    !SUPERVISION_ROLES.has(client.role)
  ) {
    return false
  }
  return sectorMatches(client, payload)
}

function shouldSendToClient(client: WsClient, payload: WsPayload): boolean {
  return (
    matchesMachineCadastro(client, payload) ||
    matchesSupplyReplenishment(client, payload) ||
    matchesMachineOperator(client, payload) ||
    matchesMovimentOperator(client, payload) ||
    matchesSupervision(client, payload)
  )
}

function broadcast(payload: WsPayload): void {
  for (const client of clients) {
    if (shouldSendToClient(client, payload)) {
      safeSend(client.socket, payload)
    }
  }
}

export function operatorMovimentPalletWsRegisterClient(
  socket: WebSocket,
  context: OperatorMovimentPalletWsClientContext,
): void {
  const entry: WsClient = { socket, ...context }
  clients.add(entry)
  socket.on('close', () => {
    clients.delete(entry)
  })
}

export function operatorMovimentPalletWsBroadcastDeliveryTaskCreated(
  sectorId: string,
  typeMovimentPallet: TypeMovimentPallet,
): void {
  broadcast({
    type: 'delivery_task_created' as const,
    sectorId,
    typeMovimentPallet,
  })
}

export function operatorMovimentPalletWsBroadcastOperatorSupplyRequestCreated(
  sectorId: string,
  machineId: string,
): void {
  broadcast({
    type: 'operator_supply_request_created' as const,
    sectorId,
    machineId,
  })
}

export function operatorMovimentPalletWsBroadcastQueueUpdated(
  sectorId: string,
  typeMovimentPallet: TypeMovimentPallet,
): void {
  broadcast({
    type: 'delivery_queue_updated' as const,
    sectorId,
    typeMovimentPallet,
  })
}

export function operatorMovimentPalletWsBroadcastTripSuggestionsUpdated(
  sectorId: string,
  typeMovimentPallet?: TypeMovimentPallet,
): void {
  broadcast({
    type: 'trip_suggestions_updated' as const,
    sectorId,
    ...(typeMovimentPallet ? { typeMovimentPallet } : {}),
  })
}

export type MachineOperatorWsPayload = {
  machineId: string
  sectorId: string
  /** Operador vinculado à máquina após a alteração (`null` = desvinculado). */
  operatorUserId: string | null
  /** Operador impactado (quem foi vinculado ou desvinculado). */
  affectedUserId: string | null
}

export function operatorMovimentPalletWsBroadcastMachineOperatorUpdated(
  payload: MachineOperatorWsPayload,
): void {
  broadcast({
    type: 'machine_operator_updated' as const,
    ...payload,
  })
}

export type MachineProductionStatusWsPayload = {
  machineId: string
  sectorId: string
  productionStatus: string
  operatorUserId: string | null
}

export function operatorMovimentPalletWsBroadcastMachineProductionStatusUpdated(
  payload: MachineProductionStatusWsPayload,
): void {
  broadcast({
    type: 'machine_production_status_updated' as const,
    destinationUserId: payload.operatorUserId,
    ...payload,
  })
}

export type MachineToolingWsAction = 'created' | 'updated' | 'deleted'

export type MachineToolingWsPayload = {
  machineId: string
  sectorId: string
  action: MachineToolingWsAction
  toolingId: string
  tooling: { id: string; name: string; machineId: string } | null
  /** Operador vinculado à máquina (para entrega direta ao OPERATOR_MACHINE). */
  operatorUserId?: string | null
}

export function operatorMovimentPalletWsBroadcastMachineToolingUpdated(
  payload: MachineToolingWsPayload,
): void {
  broadcast({
    type: 'machine_tooling_updated' as const,
    destinationUserId: payload.operatorUserId ?? null,
    ...payload,
  })
}

export type DeliveryTaskRowForWs = {
  id: string
  status: MachineTaskStatus
  typeMovimentPallet: TypeMovimentPallet
  preparedAt: Date | null
  machine: {
    id: string
    userId: string | null
    sectorId: string
  }
}

export type PickupTaskRowForWs = {
  id: string
  status: MachineTaskStatus
  typeMovimentPallet: TypeMovimentPallet
  machine: {
    id: string
    userId: string | null
    sectorId: string
  }
}

export function operatorMovimentPalletWsNotifyPickupTaskChange(
  row: PickupTaskRowForWs,
): void {
  const sectorId = row.machine.sectorId
  const typeMovimentPallet = row.typeMovimentPallet

  broadcast({
    type: 'pickup_task_updated' as const,
    sectorId,
    taskId: row.id,
    status: row.status,
    typeMovimentPallet,
    machineId: row.machine.id,
    destinationUserId: row.machine.userId,
  })

  if (
    row.status === MachineTaskStatus.ASSIGNED ||
    row.status === MachineTaskStatus.IN_PROGRESS ||
    row.status === MachineTaskStatus.COMPLETED
  ) {
    operatorMovimentPalletWsBroadcastTripSuggestionsUpdated(
      sectorId,
      typeMovimentPallet,
    )
    operatorMovimentPalletWsBroadcastQueueUpdated(sectorId, typeMovimentPallet)
  }
}

export function operatorMovimentPalletWsNotifyDeliveryTaskChange(
  row: DeliveryTaskRowForWs,
): void {
  const sectorId = row.machine.sectorId
  const typeMovimentPallet = row.typeMovimentPallet

  broadcast({
    type: 'delivery_task_updated' as const,
    sectorId,
    taskId: row.id,
    status: row.status,
    typeMovimentPallet,
    machineId: row.machine.id,
    destinationUserId: row.machine.userId,
  })

  if (
    row.status === MachineTaskStatus.CREATED &&
    row.preparedAt != null
  ) {
    operatorMovimentPalletWsBroadcastDeliveryTaskCreated(
      sectorId,
      typeMovimentPallet,
    )
    operatorMovimentPalletWsBroadcastTripSuggestionsUpdated(
      sectorId,
      typeMovimentPallet,
    )
  } else if (
    row.status === MachineTaskStatus.ASSIGNED ||
    row.status === MachineTaskStatus.IN_PROGRESS ||
    row.status === MachineTaskStatus.COMPLETED
  ) {
    operatorMovimentPalletWsBroadcastTripSuggestionsUpdated(
      sectorId,
      typeMovimentPallet,
    )
  }
}

/** @deprecated use operatorMovimentPalletWsNotifyDeliveryTaskChange */
export function operatorMovimentPalletWsEmitAfterReplenishmentSave(
  row: DeliveryTaskRowForWs,
): void {
  operatorMovimentPalletWsNotifyDeliveryTaskChange(row)
}

/** @deprecated */
export function operatorMovimentPalletWsNotifyReplenishmentChange(
  row: DeliveryTaskRowForWs,
): void {
  operatorMovimentPalletWsNotifyDeliveryTaskChange(row)
}

/** @deprecated */
export function operatorMovimentPalletWsBroadcastReplenishmentRequestCreated(
  sectorId: string,
  typeMovimentPallet: TypeMovimentPallet,
): void {
  operatorMovimentPalletWsBroadcastDeliveryTaskCreated(sectorId, typeMovimentPallet)
}
