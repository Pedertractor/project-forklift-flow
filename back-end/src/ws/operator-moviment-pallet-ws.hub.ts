import type { WebSocket } from 'ws'
import {
  MachineTaskStatus,
  type TypeMovimentPallet,
} from '../generated/prisma/enums.js'

type WsClient = { socket: WebSocket }

const clients = new Set<WsClient>()

const WS_OPEN = 1

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

function broadcast(payload: Record<string, unknown>): void {
  for (const { socket } of clients) {
    safeSend(socket, payload)
  }
}

export function operatorMovimentPalletWsRegisterClient(socket: WebSocket): void {
  const entry: WsClient = { socket }
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
