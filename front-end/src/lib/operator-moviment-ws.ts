import { ENV } from '@/constants/env';
import { apiServerOrigin } from '@/lib/api';
import type { OperatorMovimentWsEvent } from '@/types/operator-moviment-ws.types';

/** Caminho do WebSocket no servidor (sem prefixo `/api`). */
const WS_PATH = '/ws/operator-moviment-pallet';

const SUPPLY_REPLENISHMENT_EVENT_TYPES = new Set([
  'operator_supply_request_created',
  'delivery_task_created',
  'delivery_task_updated',
  'machine_production_status_updated',
  'machine_tooling_updated',
]);

const SECTOR_QUEUE_EVENT_TYPES = new Set([
  'delivery_task_created',
  'delivery_queue_updated',
  'trip_suggestions_updated',
  'replenishment_request_created',
  'replenishment_queue_updated',
  'machine_production_status_updated',
]);

const MACHINE_OPERATOR_EVENT_TYPES = new Set([
  'delivery_task_updated',
  'pickup_task_updated',
  'replenishment_status_updated',
  'machine_operator_updated',
  'machine_production_status_updated',
  'machine_tooling_updated',
]);

const MACHINE_CADASTRO_EVENT_TYPES = new Set([
  'machine_operator_updated',
  'machine_production_status_updated',
  'machine_tooling_updated',
]);

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

  const apiIsRelative = ENV.API_URL.startsWith('/');
  // Só reutiliza o host do browser quando a API é relativa (/api + proxy na mesma origem).
  // Com VITE_BASE_URL_API absoluto (ex.: :5010), o WS deve ir para o mesmo host da API.
  const useBrowserHost =
    apiIsRelative &&
    typeof window !== 'undefined' &&
    window.location.host.length > 0;

  const protocol =
    useBrowserHost &&
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:'
      ? 'wss'
      : origin.startsWith('https')
        ? 'wss'
        : 'ws';
  const host = useBrowserHost
    ? window.location.host
    : origin.replace(/^https?:\/\//, '');
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

function machineIdFromEvent(
  event: OperatorMovimentWsEvent,
): string | null | undefined {
  if ('machineId' in event && typeof event.machineId === 'string') {
    return event.machineId;
  }
  return undefined;
}

/** Operador de dobra: tarefas da máquina vinculada (`machine.userId` ou `boundMachineId`). */
export function wsEventMatchesMachineOperator(
  event: OperatorMovimentWsEvent,
  operatorUserId: string | null | undefined,
  boundMachineId?: string | null,
  operatorSectorId?: string | null,
): boolean {
  if (!operatorUserId || !MACHINE_OPERATOR_EVENT_TYPES.has(event.type)) {
    return false;
  }
  if (event.type === 'machine_operator_updated' && 'affectedUserId' in event) {
    return event.affectedUserId === operatorUserId;
  }
  if (event.type === 'machine_production_status_updated') {
    if (
      'operatorUserId' in event &&
      event.operatorUserId &&
      event.operatorUserId === operatorUserId
    ) {
      return true;
    }
    const destinationUserId = destinationUserIdFromEvent(event);
    if (destinationUserId === operatorUserId) {
      return true;
    }
    const eventMachineId = machineIdFromEvent(event);
    if (
      operatorSectorId &&
      'sectorId' in event &&
      event.sectorId === operatorSectorId &&
      eventMachineId &&
      boundMachineId &&
      eventMachineId === boundMachineId
    ) {
      return true;
    }
    return Boolean(
      boundMachineId && eventMachineId && eventMachineId === boundMachineId,
    );
  }
  const destinationUserId = destinationUserIdFromEvent(event);
  if (destinationUserId === operatorUserId) {
    return true;
  }
  const eventMachineId = machineIdFromEvent(event);
  if (boundMachineId && eventMachineId && eventMachineId === boundMachineId) {
    return true;
  }
  // Fallback: mesmo setor + máquina do evento = máquina em operação (userId na máquina pode vir null no WS).
  if (
    operatorSectorId &&
    'sectorId' in event &&
    event.sectorId === operatorSectorId &&
    boundMachineId &&
    eventMachineId === boundMachineId
  ) {
    return true;
  }
  return false;
}

/** Cadastro / supervisão: vínculo operador ↔ máquina no setor (ou todos se sem setor). */
export function wsEventMatchesMachineCadastro(
  event: OperatorMovimentWsEvent,
  sectorId: string | null | undefined,
): boolean {
  if (!MACHINE_CADASTRO_EVENT_TYPES.has(event.type)) {
    return false;
  }
  if (
    event.type !== 'machine_operator_updated' &&
    event.type !== 'machine_production_status_updated' &&
    event.type !== 'machine_tooling_updated'
  ) {
    return false;
  }
  if (!sectorId) {
    return true;
  }
  return event.sectorId === sectorId;
}

/** Abastecimento / líder — tela de reposição e fila aguardando preparo. */
export function wsEventMatchesSupplyReplenishment(
  event: OperatorMovimentWsEvent,
  sectorId: string | null | undefined,
): boolean {
  if (!SUPPLY_REPLENISHMENT_EVENT_TYPES.has(event.type)) {
    return false;
  }
  if (event.sectorId && sectorId && event.sectorId !== sectorId) {
    return false;
  }
  return true;
}

export function wsEventMatchesSubscriber(
  event: OperatorMovimentWsEvent,
  options: {
    sectorId: string | null | undefined;
    userId: string | null | undefined;
    boundMachineId?: string | null;
    operatorSectorId?: string | null;
    allowedMovimentTypes: readonly string[];
    isMovimentOperator: boolean;
    isMachineOperator: boolean;
    isMachineCadastro: boolean;
    isSupplyReplenishment: boolean;
  },
): boolean {
  if (
    options.isSupplyReplenishment &&
    wsEventMatchesSupplyReplenishment(event, options.sectorId)
  ) {
    return true;
  }
  if (
    options.isMachineCadastro &&
    wsEventMatchesMachineCadastro(event, options.sectorId)
  ) {
    return true;
  }
  if (
    options.isMachineOperator &&
    wsEventMatchesMachineOperator(
      event,
      options.userId,
      options.boundMachineId,
      options.operatorSectorId,
    )
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
