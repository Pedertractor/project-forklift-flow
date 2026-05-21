import type { WebSocket } from 'ws'
import {
  RequestStatus,
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

export function operatorMovimentPalletWsBroadcastReplenishmentRequestCreated(
  sectorId: string,
  typeMovimentPallet: TypeMovimentPallet,
): void {
  broadcast({
    type: 'replenishment_request_created' as const,
    sectorId,
    typeMovimentPallet,
  })
}

export function operatorMovimentPalletWsBroadcastQueueUpdated(
  sectorId: string,
  typeMovimentPallet: TypeMovimentPallet,
): void {
  broadcast({
    type: 'replenishment_queue_updated' as const,
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

export function operatorMovimentPalletWsBroadcastReplenishmentStatusUpdated(
  input: {
    sectorId: string
    requestId: string
    status: RequestStatus
    typeMovimentPallet: TypeMovimentPallet
    destinationId: string
    destinationUserId: string | null
  },
): void {
  broadcast({
    type: 'replenishment_status_updated' as const,
    sectorId: input.sectorId,
    requestId: input.requestId,
    status: input.status,
    typeMovimentPallet: input.typeMovimentPallet,
    destinationId: input.destinationId,
    destinationUserId: input.destinationUserId,
  })
}

/** Linha de pedido com destino/setor (include do repositório). */
export type ReplenishmentRowForWs = {
  id: string
  status: RequestStatus
  typeMovimentPallet: TypeMovimentPallet
  destination: {
    id: string
    userId: string | null
    sector: { id: string }
  }
}

/** Notifica todos os clientes WS sobre mudança de status (tempo real). */
export function operatorMovimentPalletWsNotifyReplenishmentChange(
  row: ReplenishmentRowForWs,
): void {
  const sectorId = row.destination.sector.id
  const typeMovimentPallet = row.typeMovimentPallet

  operatorMovimentPalletWsBroadcastReplenishmentStatusUpdated({
    sectorId,
    requestId: row.id,
    status: row.status,
    typeMovimentPallet,
    destinationId: row.destination.id,
    destinationUserId: row.destination.userId,
  })

  if (
    row.status === RequestStatus.PALLET_READY ||
    row.status === RequestStatus.CREATED
  ) {
    operatorMovimentPalletWsBroadcastReplenishmentRequestCreated(
      sectorId,
      typeMovimentPallet,
    )
    operatorMovimentPalletWsBroadcastTripSuggestionsUpdated(
      sectorId,
      typeMovimentPallet,
    )
  } else if (row.status === RequestStatus.AWAITING_PREPARATION) {
    operatorMovimentPalletWsBroadcastQueueUpdated(sectorId, typeMovimentPallet)
  } else if (
    row.status === RequestStatus.IN_PROGRESS ||
    row.status === RequestStatus.ON_MACHINE ||
    row.status === RequestStatus.COMPLETED
  ) {
    operatorMovimentPalletWsBroadcastTripSuggestionsUpdated(
      sectorId,
      typeMovimentPallet,
    )
  }
}

/** @deprecated Prefer {@link operatorMovimentPalletWsNotifyReplenishmentChange}. */
export function operatorMovimentPalletWsEmitAfterReplenishmentSave(
  row: ReplenishmentRowForWs,
): void {
  operatorMovimentPalletWsNotifyReplenishmentChange(row)
}
