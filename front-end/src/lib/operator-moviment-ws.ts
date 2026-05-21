import { ENV } from '@/constants/env';
import { apiServerOrigin } from '@/lib/api';
import type { OperatorMovimentWsEvent } from '@/types/operator-moviment-ws.types';

/** Caminho do WebSocket no servidor (sem prefixo `/api`). */
const WS_PATH = '/ws/operator-moviment-pallet';

export function resolveOperatorMovimentWsUrl(token: string): string | null {
  const explicit = (import.meta.env.VITE_WS_URL as string | undefined)?.trim();
  if (explicit) {
    const base = explicit.replace(/\/$/, '');
    return `${base}${WS_PATH}?token=${encodeURIComponent(token)}`;
  }

  const origin = apiServerOrigin();
  if (!origin || !ENV.API_URL) {
    return null;
  }

  const protocol = origin.startsWith('https') ? 'wss' : 'ws';
  const host = origin.replace(/^https?:\/\//, '');
  return `${protocol}://${host}${WS_PATH}?token=${encodeURIComponent(token)}`;
}

export function parseOperatorMovimentWsMessage(raw: string): OperatorMovimentWsEvent | null {
  try {
    const data = JSON.parse(raw) as { type?: string };
    if (typeof data.type !== 'string') {
      return null;
    }
    return data as OperatorMovimentWsEvent;
  } catch {
    return null;
  }
}

export function wsEventMatchesMovimentOperator(
  event: OperatorMovimentWsEvent,
  sectorId: string | null | undefined,
  allowedMovimentTypes: readonly string[],
): boolean {
  if (event.sectorId && sectorId && event.sectorId !== sectorId) {
    return false;
  }
  if (
    event.typeMovimentPallet &&
    allowedMovimentTypes.length > 0 &&
    !allowedMovimentTypes.includes(event.typeMovimentPallet)
  ) {
    return false;
  }
  return true;
}

/** Operador de dobra: eventos da máquina em que está logado. */
export function wsEventMatchesMachineOperator(
  event: OperatorMovimentWsEvent,
  operatorUserId: string | null | undefined,
): boolean {
  if (event.type !== 'replenishment_status_updated') {
    return false;
  }
  if (!operatorUserId) {
    return false;
  }
  return event.destinationUserId === operatorUserId;
}

export function wsEventMatchesSubscriber(
  event: OperatorMovimentWsEvent,
  options: {
    sectorId: string | null | undefined;
    userId: string | null | undefined;
    allowedMovimentTypes: readonly string[];
    isMovimentOperator: boolean;
    isMachineOperator: boolean;
  },
): boolean {
  if (options.isMachineOperator && wsEventMatchesMachineOperator(event, options.userId)) {
    return true;
  }
  if (options.isMovimentOperator && wsEventMatchesMovimentOperator(
    event,
    options.sectorId,
    options.allowedMovimentTypes,
  )) {
    return true;
  }
  return false;
}

/** @deprecated Use {@link wsEventMatchesMovimentOperator}. */
export function wsEventMatchesOperator(
  event: OperatorMovimentWsEvent,
  sectorId: string | null | undefined,
  allowedMovimentTypes: readonly string[],
): boolean {
  return wsEventMatchesMovimentOperator(event, sectorId, allowedMovimentTypes);
}
