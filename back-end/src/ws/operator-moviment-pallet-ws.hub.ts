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
  const payload = {
    type: 'replenishment_request_created' as const,
    sectorId,
    typeMovimentPallet,
  }
  for (const { socket } of clients) {
    safeSend(socket, payload)
  }
}

export function operatorMovimentPalletWsBroadcastQueueUpdated(
  sectorId: string,
  typeMovimentPallet: TypeMovimentPallet,
): void {
  const payload = {
    type: 'replenishment_queue_updated' as const,
    sectorId,
    typeMovimentPallet,
  }
  for (const { socket } of clients) {
    safeSend(socket, payload)
  }
}

export function operatorMovimentPalletWsBroadcastTripSuggestionsUpdated(
  sectorId: string,
  typeMovimentPallet?: TypeMovimentPallet,
): void {
  const payload = {
    type: 'trip_suggestions_updated' as const,
    sectorId,
    ...(typeMovimentPallet ? { typeMovimentPallet } : {}),
  }
  for (const { socket } of clients) {
    safeSend(socket, payload)
  }
}

/** Linha de pedido com destino/setor (include do repositório). */
export type ReplenishmentRowForWs = {
  status: RequestStatus
  typeMovimentPallet: TypeMovimentPallet
  destination: { sector: { id: string } }
}

export function operatorMovimentPalletWsEmitAfterReplenishmentSave(
  row: ReplenishmentRowForWs,
): void {
  const sectorId = row.destination.sector.id
  const typeMovimentPallet = row.typeMovimentPallet
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
  }
}
