import { ENV } from '@/constants/env';
import { apiServerOrigin } from '@/lib/api';
import type { OperatorMovimentWsEvent } from '@/types/operator-moviment-ws.types';

/** Caminho do WebSocket no servidor (sem prefixo `/api`). */
const WS_PATH = '/ws/operator-moviment-pallet';

const SECTOR_QUEUE_EVENT_TYPES = new Set([
  'delivery_task_created',
  'delivery_queue_updated',
  'trip_suggestions_updated',
  'replenishment_request_created',
  'replenishment_queue_updated',
]);

const MACHINE_OPERATOR_EVENT_TYPES = new Set([
  'delivery_task_updated',
  'pickup_task_updated',
  'replenishment_status_updated',
  'machine_operator_updated',
]);

const MACHINE_CADASTRO_EVENT_TYPES = new Set(['machine_operator_updated']);

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

export function parseOperatorMovimentWsMessage(
  raw: string,
): OperatorMovimentWsEvent | null {
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
  if (!SECTOR_QUEUE_EVENT_TYPES.has(event.type)) {
    if (event.type === 'delivery_task_updated' || event.type === 'pickup_task_updated') {
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
    return false;
  }

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

function destinationUserIdFromEvent(
  event: OperatorMovimentWsEvent,
): string | null | undefined {
  if ('destinationUserId' in event) {
    return event.destinationUserId;
  }
  return undefined;
}

/** Operador de dobra: tarefas da máquina em que está logado (`machine.userId`). */
export function wsEventMatchesMachineOperator(
  event: OperatorMovimentWsEvent,
  operatorUserId: string | null | undefined,
): boolean {
  if (!operatorUserId || !MACHINE_OPERATOR_EVENT_TYPES.has(event.type)) {
    return false;
  }
  if (event.type === 'machine_operator_updated') {
    return event.affectedUserId === operatorUserId;
  }
  const destinationUserId = destinationUserIdFromEvent(event);
  return destinationUserId === operatorUserId;
}

/** Cadastro / supervisão: vínculo operador ↔ máquina no setor (ou todos se sem setor). */
export function wsEventMatchesMachineCadastro(
  event: OperatorMovimentWsEvent,
  sectorId: string | null | undefined,
): boolean {
  if (!MACHINE_CADASTRO_EVENT_TYPES.has(event.type)) {
    return false;
  }
  if (event.type !== 'machine_operator_updated') {
    return false;
  }
  if (!sectorId) {
    return true;
  }
  return event.sectorId === sectorId;
}

export function wsEventMatchesSubscriber(
  event: OperatorMovimentWsEvent,
  options: {
    sectorId: string | null | undefined;
    userId: string | null | undefined;
    allowedMovimentTypes: readonly string[];
    isMovimentOperator: boolean;
    isMachineOperator: boolean;
    isMachineCadastro: boolean;
  },
): boolean {
  if (
    options.isMachineCadastro &&
    wsEventMatchesMachineCadastro(event, options.sectorId)
  ) {
    return true;
  }
  if (
    options.isMachineOperator &&
    wsEventMatchesMachineOperator(event, options.userId)
  ) {
    return true;
  }
  if (
    options.isMovimentOperator &&
    wsEventMatchesMovimentOperator(
      event,
      options.sectorId,
      options.allowedMovimentTypes,
    )
  ) {
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
